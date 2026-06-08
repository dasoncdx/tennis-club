from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum

from database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    COACH = "coach"
    STUDENT = "student"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    wechat_id = Column(String(50))
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    password_hash = Column(String(128), nullable=False)
    level = Column(String(20), default="")  # 网球水平等级
    age = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 学员关联
    course_packages = relationship("CoursePackage", back_populates="student", foreign_keys="CoursePackage.student_id")
    bookings = relationship("Booking", back_populates="student", foreign_keys="Booking.student_id")
    coach_bookings = relationship("Booking", back_populates="coach", foreign_keys="Booking.coach_id")


class CoursePackage(Base):
    __tablename__ = "course_packages"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_hours = Column(Float, nullable=False)
    remaining_hours = Column(Float, nullable=False)
    price = Column(Float, default=0)
    purchased_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, default="")

    student = relationship("User", back_populates="course_packages", foreign_keys=[student_id])
    class_records = relationship("ClassRecord", back_populates="course_package")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_date = Column(String(20), nullable=False)  # 2026-05-28
    start_time = Column(String(10), nullable=False)     # 14:00
    end_time = Column(String(10), nullable=False)       # 15:00
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    court_info = Column(String(200), default="")  # 场地信息
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="bookings", foreign_keys=[student_id])
    coach = relationship("User", back_populates="coach_bookings", foreign_keys=[coach_id])
    class_records = relationship("ClassRecord", back_populates="booking")


class ClassRecord(Base):
    __tablename__ = "class_records"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_package_id = Column(Integer, ForeignKey("course_packages.id"), nullable=False)
    hours_consumed = Column(Float, default=1.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="class_records")
    course_package = relationship("CoursePackage", back_populates="class_records")
    student = relationship("User", foreign_keys=[student_id])
