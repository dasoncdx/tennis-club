from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import User, UserRole, CoursePackage, Booking, BookingStatus, ClassRecord
from schemas import (
    CoursePackageCreate, CoursePackageOut,
    BookingCreate, BookingUpdate, BookingOut,
    ClassRecordCreate, ClassRecordOut,
)
from routers.auth import require_admin, require_staff, get_current_user

router = APIRouter(prefix="/api/courses", tags=["courses"])


# ===== Course Packages =====
@router.get("/packages", response_model=List[CoursePackageOut])
def list_packages(
    student_id: int = Query(0, description="按学员ID筛选"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CoursePackage)
    if student_id:
        query = query.filter(CoursePackage.student_id == student_id)
    packages = query.order_by(CoursePackage.purchased_at.desc()).all()
    result = []
    for p in packages:
        student = db.query(User).filter(User.id == p.student_id).first()
        result.append(CoursePackageOut(
            id=p.id, student_id=p.student_id,
            total_hours=p.total_hours, remaining_hours=p.remaining_hours,
            price=p.price, purchased_at=p.purchased_at, notes=p.notes or "",
            student_name=student.name if student else "",
        ))
    return result


@router.post("/packages", response_model=CoursePackageOut)
def create_package(
    data: CoursePackageCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == data.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="学员不存在")
    pkg = CoursePackage(
        student_id=data.student_id,
        total_hours=data.total_hours,
        remaining_hours=data.total_hours,
        price=data.price,
        notes=data.notes,
    )
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return CoursePackageOut(
        id=pkg.id, student_id=pkg.student_id,
        total_hours=pkg.total_hours, remaining_hours=pkg.remaining_hours,
        price=pkg.price, purchased_at=pkg.purchased_at, notes=pkg.notes or "",
        student_name=student.name,
    )


# ===== Bookings =====
@router.get("/bookings", response_model=List[BookingOut])
def list_bookings(
    student_id: int = Query(0),
    coach_id: int = Query(0),
    status: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Booking)
    # 学员只能看自己的
    if current_user.role == UserRole.STUDENT:
        query = query.filter(Booking.student_id == current_user.id)
    else:
        if student_id:
            query = query.filter(Booking.student_id == student_id)
        if coach_id:
            query = query.filter(Booking.coach_id == coach_id)
    if status:
        query = query.filter(Booking.status == status)
    if date_from:
        query = query.filter(Booking.booking_date >= date_from)
    if date_to:
        query = query.filter(Booking.booking_date <= date_to)

    bookings = query.order_by(Booking.booking_date.desc(), Booking.start_time.desc()).all()
    result = []
    for b in bookings:
        student = db.query(User).filter(User.id == b.student_id).first()
        coach = db.query(User).filter(User.id == b.coach_id).first()
        result.append(BookingOut(
            id=b.id, student_id=b.student_id, coach_id=b.coach_id,
            booking_date=b.booking_date, start_time=b.start_time,
            end_time=b.end_time, status=b.status.value,
            court_info=b.court_info or "",
            notes=b.notes or "", created_at=b.created_at,
            student_name=student.name if student else "",
            coach_name=coach.name if coach else "",
        ))
    return result


@router.post("/bookings", response_model=BookingOut)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sid = current_user.id if current_user.role == UserRole.STUDENT else data.student_id
    if current_user.role == UserRole.STUDENT and data.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能给自己约课")

    remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
        CoursePackage.student_id == sid
    ).scalar()
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="剩余课时不足，请联系管理员购买课时")

    # 检查学员自己是否在同一时间段已有其他预约
    my_conflict = db.query(Booking).filter(
        Booking.student_id == sid,
        Booking.booking_date == data.booking_date,
        Booking.start_time < data.end_time,
        Booking.end_time > data.start_time,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).first()
    if my_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"你该时段已有预约（{my_conflict.start_time}-{my_conflict.end_time}），无法重复约课"
        )

    # 检查教练在该时段是否已被其他人预约
    coach_conflict = db.query(Booking).filter(
        Booking.coach_id == data.coach_id,
        Booking.booking_date == data.booking_date,
        Booking.start_time < data.end_time,
        Booking.end_time > data.start_time,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).first()
    if coach_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"该教练此时段已被预约（{coach_conflict.start_time}-{coach_conflict.end_time}），请选择其他时间"
        )

    # 学员自己约课需要教练确认，管理员/教练代约直接确认
    init_status = BookingStatus.PENDING if current_user.role == UserRole.STUDENT else BookingStatus.CONFIRMED

    booking = Booking(
        student_id=sid, coach_id=data.coach_id,
        booking_date=data.booking_date,
        start_time=data.start_time, end_time=data.end_time,
        status=init_status,
        notes=data.notes,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    student = db.query(User).filter(User.id == booking.student_id).first()
    coach = db.query(User).filter(User.id == booking.coach_id).first()
    return BookingOut(
        id=booking.id, student_id=booking.student_id, coach_id=booking.coach_id,
        booking_date=booking.booking_date, start_time=booking.start_time,
        end_time=booking.end_time, status=booking.status.value,
        court_info=booking.court_info or "",
        notes=booking.notes or "", created_at=booking.created_at,
        student_name=student.name if student else "",
        coach_name=coach.name if coach else "",
    )


@router.put("/bookings/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: int,
    data: BookingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="约课记录不存在")

    # 权限控制：管理员/教练/学员本人可以操作
    if current_user.role == UserRole.STUDENT:
        if booking.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="只能取消自己的约课")
        # 学员只能取消，不能改其他
        if data.status not in ("cancelled", None):
            raise HTTPException(status_code=403, detail="学员只能取消约课")
    elif current_user.role == UserRole.COACH:
        # 教练只能确认/取消自己负责的约课
        if booking.coach_id != current_user.id and data.status not in (None,):
            pass  # 允许管理员操作所有

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(booking, key, value)
    db.commit()
    db.refresh(booking)

    student = db.query(User).filter(User.id == booking.student_id).first()
    coach = db.query(User).filter(User.id == booking.coach_id).first()
    return BookingOut(
        id=booking.id, student_id=booking.student_id, coach_id=booking.coach_id,
        booking_date=booking.booking_date, start_time=booking.start_time,
        end_time=booking.end_time, status=booking.status.value,
        court_info=booking.court_info or "",
        notes=booking.notes or "", created_at=booking.created_at,
        student_name=student.name if student else "",
        coach_name=coach.name if coach else "",
    )


@router.post("/bookings/{booking_id}/confirm", response_model=BookingOut)
def coach_confirm_booking(
    booking_id: int,
    court_info: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """教练确认预约，填写场地信息"""
    if current_user.role not in (UserRole.COACH, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="仅教练或管理员可确认预约")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="约课记录不存在")
    if current_user.role == UserRole.COACH and booking.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能确认自己的预约")

    booking.status = BookingStatus.CONFIRMED
    if court_info:
        booking.court_info = court_info
    db.commit()
    db.refresh(booking)

    student = db.query(User).filter(User.id == booking.student_id).first()
    coach = db.query(User).filter(User.id == booking.coach_id).first()
    return BookingOut(
        id=booking.id, student_id=booking.student_id, coach_id=booking.coach_id,
        booking_date=booking.booking_date, start_time=booking.start_time,
        end_time=booking.end_time, status=booking.status.value,
        court_info=booking.court_info or "",
        notes=booking.notes or "", created_at=booking.created_at,
        student_name=student.name if student else "",
        coach_name=coach.name if coach else "",
    )


# ===== Class Records (消课) =====
@router.post("/records", response_model=ClassRecordOut)
def create_class_record(
    data: ClassRecordCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    pkg = db.query(CoursePackage).filter(CoursePackage.id == data.course_package_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="课时包不存在")
    if pkg.remaining_hours < data.hours_consumed:
        raise HTTPException(status_code=400, detail="该课时包剩余课时不足")

    record = ClassRecord(
        booking_id=data.booking_id, student_id=data.student_id,
        course_package_id=data.course_package_id,
        hours_consumed=data.hours_consumed, notes=data.notes,
    )
    pkg.remaining_hours -= data.hours_consumed
    db.add(record)

    # 更新约课状态为已完成
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if booking:
        booking.status = BookingStatus.COMPLETED

    db.commit()
    db.refresh(record)

    student = db.query(User).filter(User.id == record.student_id).first()
    return ClassRecordOut(
        id=record.id, booking_id=record.booking_id,
        student_id=record.student_id, course_package_id=record.course_package_id,
        hours_consumed=record.hours_consumed, notes=record.notes or "",
        created_at=record.created_at,
        student_name=student.name if student else "",
        booking_date=booking.booking_date if booking else "",
    )


@router.get("/records", response_model=List[ClassRecordOut])
def list_class_records(
    student_id: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ClassRecord)
    if current_user.role == UserRole.STUDENT:
        query = query.filter(ClassRecord.student_id == current_user.id)
    elif student_id:
        query = query.filter(ClassRecord.student_id == student_id)
    records = query.order_by(ClassRecord.created_at.desc()).limit(100).all()

    result = []
    for r in records:
        student = db.query(User).filter(User.id == r.student_id).first()
        booking = db.query(Booking).filter(Booking.id == r.booking_id).first()
        result.append(ClassRecordOut(
            id=r.id, booking_id=r.booking_id,
            student_id=r.student_id, course_package_id=r.course_package_id,
            hours_consumed=r.hours_consumed, notes=r.notes or "",
            created_at=r.created_at,
            student_name=student.name if student else "",
            booking_date=booking.booking_date if booking else "",
        ))
    return result
