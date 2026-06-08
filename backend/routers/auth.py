from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt

from database import get_db
from models import User, UserRole
from schemas import LoginRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "tennis-club-secret-key-change-in-production"
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: int, role: str) -> str:
    payload = {"user_id": user_id, "role": role}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Header(""), db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可操作")
    return current_user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.ADMIN, UserRole.COACH):
        raise HTTPException(status_code=403, detail="仅管理员或教练可操作")
    return current_user


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="手机号或密码错误")
    token = create_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token, user_id=user.id, name=user.name, role=user.role.value
    )


@router.post("/register", response_model=TokenResponse)
def register(req: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == req.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="该手机号已注册")
    user = User(
        name=req.name, phone=req.phone,
        password_hash=hash_password(req.password),
        role=UserRole(req.role),
        wechat_id=req.wechat_id, level=req.level,
        age=req.age, notes=req.notes,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token, user_id=user.id, name=user.name, role=user.role.value
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import CoursePackage
    from sqlalchemy import func

    total_hours = db.query(func.coalesce(func.sum(CoursePackage.total_hours), 0)).filter(
        CoursePackage.student_id == current_user.id
    ).scalar()
    remaining_hours = db.query(func.coalesce(func.sum(CoursePackage.remaining_hours), 0)).filter(
        CoursePackage.student_id == current_user.id
    ).scalar()

    return UserOut(
        id=current_user.id, name=current_user.name,
        phone=current_user.phone, wechat_id=current_user.wechat_id or "",
        role=current_user.role.value, level=current_user.level or "",
        age=current_user.age or 0, notes=current_user.notes or "",
        created_at=current_user.created_at,
        total_purchased_hours=float(total_hours),
        remaining_hours=float(remaining_hours),
    )
