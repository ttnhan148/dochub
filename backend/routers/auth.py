"""
DocHub Auth Router
Quản lý đăng nhập/đăng xuất và kiểm tra phiên làm việc session-based.
"""

import os
import bcrypt
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from pydantic import BaseModel
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

router = APIRouter(prefix="/api/auth", tags=["auth"])

from dotenv import load_dotenv

# Đảm bảo .env được nạp
load_dotenv()

COOKIE_NAME = "dochub_session"
SESSION_MAX_AGE = 30 * 24 * 3600  # 30 ngày


def get_auth_config():
    """Lấy cấu hình xác thực từ biến môi trường runtime"""
    username = os.getenv("APP_USERNAME", "admin")
    password_hash = os.getenv("APP_PASSWORD_HASH", "")
    secret_key = os.getenv("SECRET_KEY", "dochub-insecure-dev-secret-key-please-change-in-env")
    return username, password_hash, secret_key


def get_serializer():
    _, _, secret_key = get_auth_config()
    return URLSafeTimedSerializer(secret_key, salt="dochub-auth-salt")


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    authenticated: bool


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_current_user(request: Request) -> str:
    """Dependency trích xuất và xác thực session cookie"""
    session_token = request.cookies.get(COOKIE_NAME)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập hoặc phiên làm việc không tồn tại",
        )
    username, _, _ = get_auth_config()
    serializer = get_serializer()
    try:
        data = serializer.loads(session_token, max_age=SESSION_MAX_AGE)
        user = data.get("user")
        if not user or user != username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên làm việc không hợp lệ",
            )
        return user
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại",
        )
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chữ ký phiên làm việc không hợp lệ",
        )


@router.post("/login", response_model=UserResponse)
async def login(req: LoginRequest, response: Response):
    """Xác thực thông tin đăng nhập và cấp session cookie an toàn"""
    username, password_hash, _ = get_auth_config()
    if not password_hash:
        # Nếu chưa cấu hình mật khẩu trong .env
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa thiết lập APP_PASSWORD_HASH trong cấu hình hệ thống.",
        )

    if req.username != username or not verify_password(req.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    serializer = get_serializer()
    token = serializer.dumps({"user": username})
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # Cho phép hoạt động qua HTTP trong môi trường lab/dev hoặc reverse proxy SSL termination
    )
    return UserResponse(username=username, authenticated=True)


@router.post("/logout")
async def logout(response: Response):
    """Xóa cookie phiên làm việc"""
    response.delete_cookie(key=COOKIE_NAME, httponly=True, samesite="lax")
    return {"message": "Đã đăng xuất thành công"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: str = Depends(get_current_user)):
    """Kiểm tra trạng thái đăng nhập hiện tại"""
    return UserResponse(username=user, authenticated=True)
