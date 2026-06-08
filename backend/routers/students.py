from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import User, UserRole, CoursePackage, Booking, BookingStatus, ClassRecord
from schemas import UserOut, UserCreate, UserUpdate, DashboardOut
from routers.auth import require_admin, require_staff, get_current_user

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.STUDENT).scalar()
    total_coaches = db.query(func.count(User.id)).filter(
        User.role == UserRole.COACH
    ).scalar()
    total_remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).scalar()
    month_start = datetime.utcnow().replace(day=1).strftime("%Y-%m-%d")
    monthly_bookings = db.query(func.count(Booking.id)).filter(
        Booking.booking_date >= month_start
    ).scalar()
    cutoff = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d")
    all_students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    dormant_count = 0
    for s in all_students:
        last = db.query(Booking).filter(
            Booking.student_id == s.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).order_by(Booking.booking_date.desc()).first()
        if not last or last.booking_date < cutoff:
            dormant_count += 1

    return DashboardOut(
        total_students=total_students, total_coaches=total_coaches,
        total_hours_remaining=float(total_remaining),
        monthly_bookings=monthly_bookings, dormant_students=dormant_count,
    )


@router.get("/dormant", response_model=List[UserOut])
def get_dormant_students(
    days: int = Query(14, description="多少天未约课视为休眠"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    cutoff_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    dormant = []
    for s in students:
        last_booking = db.query(Booking).filter(
            Booking.student_id == s.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        ).order_by(Booking.booking_date.desc()).first()
        if not last_booking or last_booking.booking_date < cutoff_date:
            total = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
                CoursePackage.student_id == s.id
            ).scalar()
            remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
                CoursePackage.student_id == s.id
            ).scalar()
            last_date = last_booking.booking_date if last_booking else "从未约课"
            dormant.append(UserOut(
                id=s.id, name=s.name, phone=s.phone,
                wechat_id=s.wechat_id or "", role=s.role.value,
                level=s.level or "", age=s.age or 0,
                notes=f"上次约课: {last_date}",
                created_at=s.created_at,
                total_purchased_hours=float(total),
                remaining_hours=float(remaining),
            ))
    return dormant


@router.get("/coaches", response_model=List[UserOut])
def list_coaches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    coaches = db.query(User).filter(
        User.role == UserRole.COACH
    ).all()
    return [UserOut(
        id=c.id, name=c.name, phone=c.phone,
        wechat_id=c.wechat_id or "", role=c.role.value,
        level=c.level or "", age=c.age or 0, notes=c.notes or "",
        created_at=c.created_at,
    ) for c in coaches]


@router.get("/my", response_model=List[UserOut])
def get_coach_students(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """教练获取自己负责的学员列表（有过约课关系的学员）"""
    if current_user.role == UserRole.COACH:
        student_ids = db.query(Booking.student_id).filter(
            Booking.coach_id == current_user.id
        ).distinct().all()
        ids = [s[0] for s in student_ids]
        students = db.query(User).filter(User.id.in_(ids)).all() if ids else []
    else:
        students = db.query(User).filter(User.role == UserRole.STUDENT).all()

    result = []
    for s in students:
        total = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
            CoursePackage.student_id == s.id).scalar()
        remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
            CoursePackage.student_id == s.id).scalar()
        result.append(UserOut(
            id=s.id, name=s.name, phone=s.phone,
            wechat_id=s.wechat_id or "", role=s.role.value,
            level=s.level or "", age=s.age or 0, notes=s.notes or "",
            created_at=s.created_at,
            total_purchased_hours=float(total),
            remaining_hours=float(remaining),
        ))
    return result


@router.get("", response_model=List[UserOut])
def list_students(
    keyword: str = Query("", description="搜索姓名或手机号"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.role == UserRole.STUDENT)
    if keyword:
        query = query.filter(
            (User.name.contains(keyword)) | (User.phone.contains(keyword))
        )
    students = query.order_by(User.created_at.desc()).all()
    result = []
    for s in students:
        total = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
            CoursePackage.student_id == s.id
        ).scalar()
        remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
            CoursePackage.student_id == s.id
        ).scalar()
        result.append(UserOut(
            id=s.id, name=s.name, phone=s.phone,
            wechat_id=s.wechat_id or "", role=s.role.value,
            level=s.level or "", age=s.age or 0, notes=s.notes or "",
            created_at=s.created_at,
            total_purchased_hours=float(total),
            remaining_hours=float(remaining),
        ))
    return result


@router.get("/{student_id}", response_model=UserOut)
def get_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not s:
        raise HTTPException(status_code=404, detail="学员不存在")
    total = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
        CoursePackage.student_id == s.id
    ).scalar()
    remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
        CoursePackage.student_id == s.id
    ).scalar()
    return UserOut(
        id=s.id, name=s.name, phone=s.phone,
        wechat_id=s.wechat_id or "", role=s.role.value,
        level=s.level or "", age=s.age or 0, notes=s.notes or "",
        created_at=s.created_at,
        total_purchased_hours=float(total),
        remaining_hours=float(remaining),
    )


@router.put("/{student_id}", response_model=UserOut)
def update_student(
    student_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    s = db.query(User).filter(User.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="学员不存在")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(s, key, value)
    db.commit()
    db.refresh(s)
    total = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
        CoursePackage.student_id == s.id
    ).scalar()
    remaining = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
        CoursePackage.student_id == s.id
    ).scalar()
    return UserOut(
        id=s.id, name=s.name, phone=s.phone,
        wechat_id=s.wechat_id or "", role=s.role.value,
        level=s.level or "", age=s.age or 0, notes=s.notes or "",
        created_at=s.created_at,
        total_purchased_hours=float(total),
        remaining_hours=float(remaining),
    )


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="不能删除管理员账号")
    db.query(ClassRecord).filter(ClassRecord.student_id == student_id).delete()
    db.query(Booking).filter(Booking.student_id == student_id).delete()
    db.query(Booking).filter(Booking.coach_id == student_id).delete()
    db.query(CoursePackage).filter(CoursePackage.student_id == student_id).delete()
    db.delete(user)
    db.commit()
    return {"ok": True}
