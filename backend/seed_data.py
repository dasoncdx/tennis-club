"""生成50名学员 + 5名教练 + 课时包 + 约课记录的演示数据"""
import random
from datetime import datetime, timedelta

from database import SessionLocal
from models import User, UserRole, CoursePackage, Booking, BookingStatus, ClassRecord
from routers.auth import hash_password


def run_seed():
    """每次启动时清空旧数据并重新生成演示数据"""
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
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
    )
    db.add(admin)

    # === 5名教练 ===
    coaches_data = [
        ("张教练", "13801000001", "高级", 8),
        ("李教练", "13801000002", "高级", 6),
        ("王教练", "13801000003", "中级", 5),
        ("刘教练", "13801000004", "中级", 3),
        ("赵教练", "13801000005", "初级", 1),
    ]
    coaches = []
    for name, phone, level, years in coaches_data:
        c = User(name=name, phone=phone, password_hash=hash_password("123456"),
                 role=UserRole.COACH, level=level, notes=f"{years}年教学经验")
        db.add(c)
        coaches.append(c)
    db.commit()
    coaches = db.query(User).filter(User.role == UserRole.COACH).all()
    print(f"✅ 已创建 {len(coaches)} 名教练")

    # === 50名学员 ===
    surnames_m = ["王","李","张","刘","陈","杨","黄","赵","周","吴","徐","孙","马","朱","胡","林","郭","何","罗","高","郑","梁","谢","宋","唐"]
    surnames_f = ["李","王","张","刘","陈","杨","黄","周","吴","徐","孙","马","朱","胡","林","郭","何","罗","高","郑","梁","谢","宋","赵","钱"]
    male_names = ["子轩","浩然","宇轩","子墨","俊杰","致远","明哲","思远","文博","天宇","泽宇","瑞霖","逸飞","一鸣","伟杰","志远","鹏飞","建平","国栋","志强","永强","海军","伟","强","磊","洋","勇","鹏","涛","明"]
    female_names = ["雨涵","诗涵","欣怡","梓涵","佳琪","梦瑶","思雨","晓婷","悦然","美琳","雪婷","琪","静","婷","敏","芳","丽","娟","秀英","桂英","淑珍","秀兰","玉兰","秀荣","淑华"]

    levels = ["初级","初级","初级","初级","初级","中级","中级","中级","高级","高级"]
    ages = list(range(18, 56)) + list(range(12, 18))
    wechat_prefixes = ["wxid_", "wx_", "wechat_", "tennis_lover_", ""]
    packages_options = [(5, 800), (10, 1500), (20, 2800), (30, 4000), (50, 6200)]

    today = datetime.utcnow()
    students = []
    for i in range(50):
        is_male = i < 28
        surname = random.choice(surnames_m if is_male else surnames_f)
        given = random.choice(male_names if is_male else female_names)
        name = surname + given
        phone = f"139{random.randint(10000000, 99999999)}"
        level = random.choice(levels)
        age = random.choice(ages)
        wx_prefix = random.choice(wechat_prefixes)
        wechat_id = f"{wx_prefix}{name}" if wx_prefix else ""
        notes_list = []
        if random.random() < 0.3: notes_list.append("对拉球稳定")
        if random.random() < 0.2: notes_list.append("发球需加强")
        if random.random() < 0.15: notes_list.append("准备参加业余比赛")
        if random.random() < 0.2: notes_list.append("体能待提升")
        notes = "；".join(notes_list) if notes_list else ""

        s = User(name=name, phone=phone, password_hash=hash_password("123456"),
                 role=UserRole.STUDENT, level=level, age=age,
                 wechat_id=wechat_id, notes=notes,
                 created_at=today - timedelta(days=random.randint(1, 365)))
        db.add(s)
        students.append(s)

    db.commit()
    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    print(f"✅ 已创建 {len(students)} 名学员")

    # === 每个学员购买1-3个课时包 ===
    all_packages = []
    for s in students:
        num_packages = random.choices([1, 2, 3], weights=[6, 3, 1])[0]
        for _ in range(num_packages):
            total_h, price = random.choice(packages_options)
            remaining = random.uniform(0, total_h) if random.random() < 0.4 else total_h
            days_ago = random.randint(5, 300)
            pkg = CoursePackage(
                student_id=s.id, total_hours=total_h,
                remaining_hours=remaining, price=price,
                purchased_at=today - timedelta(days=days_ago),
                notes=f"{s.level}班课时包"
            )
            db.add(pkg)
            all_packages.append(pkg)

    db.commit()
    all_packages = db.query(CoursePackage).all()
    print(f"✅ 已创建 {len(all_packages)} 个课时包")

    # === 过去30天的约课记录 ===
    all_bookings = []
    for day_offset in range(30):
        date_str = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        num_bookings = random.randint(2, 6)
        for _ in range(num_bookings):
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
    print(f"✅ 已创建 {len(all_bookings)} 条约课记录")

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
    print(f"✅ 已创建 {record_count} 条消课记录")

    # === 设置休眠学员（5-8人，最近14天无约课）===
    dormant_count = random.randint(5, 8)
    dormant_students = random.sample(students, dormant_count)
    for s in dormant_students:
        db.query(Booking).filter(
            Booking.student_id == s.id,
            Booking.booking_date >= (today - timedelta(days=14)).strftime("%Y-%m-%d")
        ).delete()
    db.commit()
    print(f"✅ 已设置 {dormant_count} 名休眠学员")

    db.close()

    total_remaining = sum(p.remaining_hours for p in all_packages)
    print(f"\n📊 演示数据统计: 教练{len(coaches)} | 学员{len(students)} | 课时包{len(all_packages)} | 约课{len(all_bookings)} | 消课{record_count}")
    print(f"💰 剩余课时总量: {total_remaining:.1f} 小时\n")


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    run_seed()
    print("✅ 测试数据生成完毕")
