
from fastapi import APIRouter, Form, HTTPException
from ..db import get_connection

router = APIRouter()

@router.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, password, role, is_active FROM users WHERE username=?",
        (username,),
    )
    row = cur.fetchone()
    conn.close()

    if not row or row["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if row["is_active"] == 0:
        raise HTTPException(status_code=403, detail="User is inactive")

    return {"username": row["username"], "role": row["role"]}


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