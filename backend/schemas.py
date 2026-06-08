from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ===== Auth =====
class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    user_id: int
    name: str
    role: str


# ===== User =====
class UserCreate(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "student"
    wechat_id: str = ""
    level: str = ""
    age: int = 0
    notes: str = ""


class UserUpdate(BaseModel):
    name: Optional[str] = None
    wechat_id: Optional[str] = None
    level: Optional[str] = None
    age: Optional[int] = None
    notes: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    wechat_id: str
    role: str
    level: str
    age: int
    notes: str
    created_at: datetime
    total_purchased_hours: float = 0
    remaining_hours: float = 0

    class Config:
        from_attributes = True


# ===== Course Package =====
class CoursePackageCreate(BaseModel):
    student_id: int
    total_hours: float
    price: float = 0
    notes: str = ""


class CoursePackageOut(BaseModel):
    id: int
    student_id: int
    total_hours: float
    remaining_hours: float
    price: float
    purchased_at: datetime
    notes: str
    student_name: str = ""

    class Config:
        from_attributes = True


# ===== Booking =====
class BookingCreate(BaseModel):
    student_id: int
    coach_id: int
    booking_date: str
    start_time: str
    end_time: str
    notes: str = ""


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    coach_id: Optional[int] = None
    booking_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    court_info: Optional[str] = None
    notes: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    student_id: int
    coach_id: int
    booking_date: str
    start_time: str
    end_time: str
    status: str
    court_info: str = ""
    notes: str
    created_at: datetime
    student_name: str = ""
    coach_name: str = ""

    class Config:
        from_attributes = True


# ===== Class Record =====
class ClassRecordCreate(BaseModel):
    booking_id: int
    student_id: int
    course_package_id: int
    hours_consumed: float = 1.0
    notes: str = ""


class ClassRecordOut(BaseModel):
    id: int
    booking_id: int
    student_id: int
    course_package_id: int
    hours_consumed: float
    notes: str
    created_at: datetime
    student_name: str = ""
    booking_date: str = ""

    class Config:
        from_attributes = True


# ===== Dashboard =====
class DashboardOut(BaseModel):
    total_students: int
    total_coaches: int
    total_hours_remaining: float
    monthly_bookings: int
    dormant_students: int  # 14天未约课的学员
