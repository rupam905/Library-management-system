from datetime import date
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, HTTPException, Form
from ..db import get_connection

router = APIRouter()


# ------------------ MEMBERSHIP ------------------ #

@router.post("/membership/add")
async def add_membership(
    membership_id: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    aadhar: str = Form(...),
    start_date: str = Form(...),
    plan: str = Form(...),  # "6m", "1y", "2y"
):
    """
    Add membership.
    - All fields required.
    - End date calculated based on plan (6 months / 1 year / 2 years).
    """
    try:
        start_dt = date.fromisoformat(start_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid start date")

    if plan == "6m":
        end_dt = start_dt + relativedelta(months=6)
    elif plan == "1y":
        end_dt = start_dt + relativedelta(years=1)
    elif plan == "2y":
        end_dt = start_dt + relativedelta(years=2)
    else:
        raise HTTPException(status_code=400, detail="Invalid membership plan")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO members(
                membership_id, first_name, last_name, phone, address,
                aadhar, start_date, end_date, status, pending_fine
            )
            VALUES (?,?,?,?,?,?,?,?,?,0)
            """,
            (
                membership_id,
                first_name,
                last_name,
                phone,
                address,
                aadhar,
                start_date,
                end_dt.isoformat(),
                "Active",
            ),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Could not add membership: {e}")
    finally:
        conn.close()

    return {"message": "Membership added"}


@router.get("/membership/{membership_id}")
async def get_membership(membership_id: str):
    """
    Used by update form to auto-populate details.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT membership_id, first_name, last_name, phone, address, aadhar, start_date, end_date, status "
        "FROM members WHERE membership_id=?",
        (membership_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")
    return dict(row)


@router.post("/membership/update")
async def update_membership(
    membership_id: str = Form(...),
    action: str = Form(...),  # 'extend6','extend1y','extend2y','remove'
):
    """
    Update membership:
    - extend6: extend end_date by 6 months
    - extend1y: extend by 1 year
    - extend2y: extend by 2 years
    - remove: mark membership as Inactive
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT end_date, status FROM members WHERE membership_id=?", (membership_id,))
    row = cur.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Membership not found")

    end_dt = date.fromisoformat(row["end_date"])

    if action == "remove":
        new_status = "Inactive"
        new_end = end_dt.isoformat()
    elif action == "extend6":
        new_status = "Active"
        new_end = (end_dt + relativedelta(months=6)).isoformat()
    elif action == "extend1y":
        new_status = "Active"
        new_end = (end_dt + relativedelta(years=1)).isoformat()
    elif action == "extend2y":
        new_status = "Active"
        new_end = (end_dt + relativedelta(years=2)).isoformat()
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid action")

    cur.execute(
        "UPDATE members SET end_date=?, status=? WHERE membership_id=?",
        (new_end, new_status, membership_id),
    )
    conn.commit()
    conn.close()
    return {"message": "Membership updated", "new_end_date": new_end, "status": new_status}


# ------------------ BOOK / MOVIE ------------------ #

@router.post("/book/add")
async def add_book(
    type: str = Form(...),               # "Book" or "Movie"
    name: str = Form(...),
    procurement_date: str = Form(...),   # "YYYY-MM-DD"
    quantity: int = Form(...),
):
    if type not in ("Book", "Movie"):
        raise HTTPException(status_code=400, detail="Type must be Book or Movie")

    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    conn = get_connection()
    cur = conn.cursor()

    # Decide prefix for serial numbers
    prefix = "B" if type == "Book" else "M"

    # Find the last serial for this type, if any
    cur.execute(
        "SELECT serial_no FROM books WHERE type=? ORDER BY serial_no DESC LIMIT 1",
        (type,),
    )
    row = cur.fetchone()
    last_num = 0
    if row:
        # assume serial like 'B000001' or 'M000010'
        existing = row["serial_no"]
        # take trailing digits
        digits = "".join(ch for ch in existing if ch.isdigit())
        if digits:
            last_num = int(digits)

    try:
        for i in range(1, quantity + 1):
            new_num = last_num + i
            serial_no = f"{prefix}{new_num:06d}"  # e.g. B000001, M000002

            cur.execute(
                """
                INSERT INTO books(
                    serial_no, name, author, category,
                    status, cost, procurement_date, type
                )
                VALUES (?,?,?,?,?,?,?,?)
                """,
                (
                    serial_no,
                    name,
                    "",                 # author (not in this screen)
                    "",                 # category (not in this screen)
                    "Available",        # status default
                    0.0,                # cost default
                    procurement_date,
                    type,
                ),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Could not add book/movie: {e}")
    finally:
        conn.close()

    return {"message": "Book/Movie added"}


@router.get("/book/{serial_no}")
async def get_book(serial_no: str):
    """
    Used by update book form to auto-populate.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT serial_no, name, author, category, status, procurement_date, type "
        "FROM books WHERE serial_no=?",
        (serial_no,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Book/Movie not found")
    return dict(row)


@router.post("/book/update")
async def update_book(
    serial_no: str = Form(...),
    name: str = Form(...),
    author: str = Form(...),
    category: str = Form(...),
    status: str = Form(...),
    procurement_date: str = Form(...),
):
    if status not in ("Available", "Issued"):
        raise HTTPException(status_code=400, detail="Invalid status")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE books SET name=?, author=?, category=?, status=?, procurement_date=? WHERE serial_no=?",
        (name, author, category, status, procurement_date, serial_no),
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Book/Movie not found")

    conn.commit()
    conn.close()
    return {"message": "Book/Movie updated"}
