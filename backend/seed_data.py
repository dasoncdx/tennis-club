"""生成演示数据：管理员 + 5名教练 + 10名学员 + 课时包 + 约课记录"""
import random
from datetime import datetime, timedelta

from database import SessionLocal
from models import User, UserRole, CoursePackage, Booking, BookingStatus, ClassRecord
from routers.auth import hash_password


def run_seed():
    db = SessionLocal()

    # 清空旧数据
    db.query(ClassRecord).delete()
    db.query(Booking).delete()
    db.query(CoursePackage).delete()
    db.query(User).delete()
    db.commit()

    # === 管理员 ===
    admin = User(
        name="管理员", phone="admin",
        password_hash=hash_password("123"),
        role=UserRole.ADMIN,
    )
    db.add(admin)

    # === 5名教练 ===
    coach_names = ["张教练", "李教练", "王教练", "刘教练", "赵教练"]
    coach_levels = ["高级", "高级", "中级", "中级", "初级"]
    coaches = []
    for i in range(5):
        c = User(
            name=coach_names[i],
            phone=f"jiao{i+1:03d}",
            password_hash=hash_password("123"),
            role=UserRole.COACH,
            level=coach_levels[i],
        )
        db.add(c)
        coaches.append(c)
    db.commit()
    coaches = db.query(User).filter(User.role == UserRole.COACH).all()
    print(f"已创建 {len(coaches)} 名教练")

    # === 10名学员 ===
    students = []
    for i in range(10):
        s = User(
            name=f"学员{i+1:02d}",
            phone=f"xue{i+1:03d}",
            password_hash=hash_password("123"),
            role=UserRole.STUDENT,
        )
        db.add(s)
        students.append(s)
    db.commit()
    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    print(f"已创建 {len(students)} 名学员")

    # === 每个学员购买1-2个课时包 ===
    today = datetime.utcnow()
    packages_options = [(5, 800), (10, 1500), (20, 2800)]
    all_packages = []
    for s in students:
        for _ in range(random.randint(1, 2)):
            total_h, price = random.choice(packages_options)
            remaining = total_h if random.random() < 0.6 else round(random.uniform(1, total_h), 1)
            pkg = CoursePackage(
                student_id=s.id,
                total_hours=total_h,
                remaining_hours=remaining,
                price=price,
                purchased_at=today - timedelta(days=random.randint(5, 60)),
            )
            db.add(pkg)
            all_packages.append(pkg)
    db.commit()
    all_packages = db.query(CoursePackage).all()
    print(f"已创建 {len(all_packages)} 个课时包")

    # === 过去14天的约课记录 ===
    all_bookings = []
    for day_offset in range(14):
        date_str = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        for _ in range(random.randint(1, 4)):
            s = random.choice(students)
            c = random.choice(coaches)
            hour = random.randint(9, 19)
            status = random.choices(
                [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED],
                weights=[2, 7, 1]
            )[0]
            b = Booking(
                student_id=s.id, coach_id=c.id,
                booking_date=date_str,
                start_time=f"{hour:02d}:00",
                end_time=f"{hour+1:02d}:00",
                status=status,
                created_at=today - timedelta(days=day_offset),
            )
            db.add(b)
            all_bookings.append(b)
    db.commit()
    all_bookings = db.query(Booking).all()
    print(f"已创建 {len(all_bookings)} 条约课记录")

    # === 消课记录 ===
    completed = [b for b in all_bookings if b.status == BookingStatus.COMPLETED]
    record_count = 0
    for b in completed:
        pkgs = db.query(CoursePackage).filter(
            CoursePackage.student_id == b.student_id,
            CoursePackage.remaining_hours > 0
        ).all()
        if pkgs:
            pkg = random.choice(pkgs)
            hours = min(1.0, pkg.remaining_hours)
            r = ClassRecord(
                booking_id=b.id, student_id=b.student_id,
                course_package_id=pkg.id, hours_consumed=hours,
                created_at=b.created_at,
            )
            pkg.remaining_hours -= hours
            db.add(r)
            record_count += 1
    db.commit()
    print(f"已创建 {record_count} 条消课记录")

    total_remaining = sum(p.remaining_hours for p in all_packages)
    print(f"\n演示数据: 管理员1 | 教练{len(coaches)} | 学员{len(students)} | 课时包{len(all_packages)} | 约课{len(all_bookings)} | 消课{record_count}")
    print(f"剩余课时总量: {total_remaining:.1f} 小时\n")

    db.close()


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    run_seed()
    print("测试数据生成完毕")
