
from fastapi import APIRouter, Depends
from ..db import get_connection
from .auth import get_current_user

router = APIRouter()


@router.get("/books")
async def master_books():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM books WHERE type='Book' ORDER BY serial_no")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}


@router.get("/movies")
async def master_movies():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM books WHERE type='Movie' ORDER BY serial_no")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}

@router.get("/product-details")
async def get_product_details(current_user = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT code_from, code_to, category FROM product_details ORDER BY id"
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "code_from": row["code_from"],
            "code_to": row["code_to"],
            "category": row["category"],
        }
        for row in rows
    ]


@router.get("/members")
async def master_memberships():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM members ORDER BY membership_id")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}


@router.get("/active-issues")
async def active_issues():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM issues WHERE actual_return_date IS NULL")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}


@router.get("/overdue")
async def overdue_returns():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM issues WHERE actual_return_date IS NOT NULL AND actual_return_date > planned_return"
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}


@router.get("/requests")
async def issue_requests():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM issue_requests")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}
