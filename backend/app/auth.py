import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AdminAccount, User

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # 기본값을 두면 배포할 때 조용히 그 값으로 돌아가고, 리포에 공개된 시크릿으로
    # 누구나 토큰을 위조할 수 있게 된다. 값이 없으면 아예 뜨지 않는 편이 안전하다.
    raise RuntimeError("JWT_SECRET 환경변수가 필요합니다. backend/.env.example을 .env로 복사한 뒤 값을 채우세요.")

security = HTTPBearer()


# stdlib pbkdf2 — bcrypt 의존성 없이 충분
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$")
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return secrets.compare_digest(candidate, digest)


def create_token(user_id: int) -> str:
    payload = {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "유효하지 않은 토큰입니다.")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(401, "사용자를 찾을 수 없습니다.")
    if user.account_status != "ACTIVE":
        raise HTTPException(403, "잠긴 계정입니다. 관리자에게 문의해주세요.")
    return user


def get_current_admin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """계정 메타데이터를 관리할 수 있는 관리자만 허용한다.

    이 의존성은 개인 기록·가치관·페르소나·대화 API와 분리되어 있다.
    """
    if not db.get(AdminAccount, user.user_id):
        raise HTTPException(403, "관리자 계정만 접근할 수 있습니다.")
    return user
