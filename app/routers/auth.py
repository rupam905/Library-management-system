import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Form, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from jose import JWTError, jwt

from ..db import get_connection

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

SECRET_KEY = os.getenv("SECRET_KEY", "temp-key-if-not-set")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, password, role, is_active FROM users WHERE username=?",
        (username,),
    )
    user = cur.fetchone()
    conn.close()

    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Inactive or invalid user")

    return {
        "username": user["username"],
        "role": user["role"],
    }


async def require_authenticated(current_user=Depends(get_current_user)):
    return current_user


async def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only. Access denied.")
    return current_user


@router.post("/login")
async def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
):
    """
    Validate username/password, issue JWT in HttpOnly cookie,
    and return JSON so frontend can handle UI.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, password, role, is_active FROM users WHERE username=?",
        (username,),
    )
    user = cur.fetchone()
    conn.close()

    if not user or user["password"] != password:
        return JSONResponse(
            {"success": False, "message": "Invalid username or password"},
            status_code=400,
        )

    if not user["is_active"]:
        return JSONResponse(
            {"success": False, "message": "User is inactive"},
            status_code=400,
        )

    token_data = {
        "sub": user["username"],
        "role": user["role"],
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    resp = JSONResponse(
        {
            "success": True,
            "username": user["username"],
            "role": user["role"],
        }
    )
    resp.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=False,  # True in prod with HTTPS
        samesite="lax",
        path="/",
    )
    return resp


@router.get("/me")
async def read_current_user(current_user=Depends(get_current_user)):
    return current_user  # {"username": "...", "role": "admin" or "user"}


@router.get("/logout")
async def logout(response: Response):
    resp = JSONResponse({"success": True, "message": "Logged out"})
    resp.delete_cookie("access_token", path="/")
    return resp


# ---- User management endpoints (optional, keep as you had) ----

@router.post("/users")
async def add_user(
    username: str = Form(...),
    password: str = Form(...),
    is_admin: bool = Form(False),
    is_active: bool = Form(True),
):
    role = "admin" if is_admin else "user"
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users(username,password,role,is_active) VALUES (?,?,?,?)",
            (username, password, role, 1 if is_active else 0),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return {"message": "User added"}


@router.put("/users/{username}")
async def update_user(
    username: str,
    password: str = Form(...),
    is_admin: bool = Form(False),
    is_active: bool = Form(True),
):
    role = "admin" if is_admin else "user"
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET password=?, role=?, is_active=? WHERE username=?",
        (password, role, 1 if is_active else 0, username),
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    conn.commit()
    conn.close()
    return {"message": "User updated"}


@router.get("/users/{username}")
async def get_user(username: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, role, is_active FROM users WHERE username=?",
        (username,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)
