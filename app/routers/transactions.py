from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query, Form, Depends
from .auth import require_authenticated
from ..db import get_connection

router = APIRouter(
    tags=["transactions"],
    dependencies=[Depends(require_authenticated)],
)

DAILY_FINE = 10

@router.get("/availability")
async def availability(book: str = Query("", alias="book"), author: str = Query("", alias="author")):
    if not book and not author:
        raise HTTPException(status_code=400, detail="Enter book name or author")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM books WHERE status='Available' AND (name LIKE ? OR author LIKE ?)",
        (f"%{book}%", f"%{author}%"),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"results": rows}


@router.post("/issue")
async def issue_book(
    serial_no: str = Form(...),
    membership_id: str = Form(...),
    issue_date: str = Form(...),
    planned_return: str = Form(...),
    remarks: str = Form(""),
):
    # date validations
    today = date.today()
    try:
        issue_dt = date.fromisoformat(issue_date)
        return_dt = date.fromisoformat(planned_return)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if issue_dt < today:
        raise HTTPException(status_code=400, detail="Issue date cannot be earlier than today")

    if return_dt > issue_dt + timedelta(days=15):
        raise HTTPException(status_code=400, detail="Return date cannot be more than 15 days from issue date")

    conn = get_connection()
    cur = conn.cursor()

    # book exists & available
    cur.execute("SELECT status FROM books WHERE serial_no=?", (serial_no,))
    book = cur.fetchone()
    if not book:
        conn.close()
        raise HTTPException(status_code=404, detail="Book not found")
    if book["status"] != "Available":
        conn.close()
        raise HTTPException(status_code=400, detail="Book not available")

    # member exists & active
    cur.execute("SELECT status FROM members WHERE membership_id=?", (membership_id,))
    member = cur.fetchone()
    if not member:
        conn.close()
        raise HTTPException(status_code=404, detail="Member not found")
    if member["status"] != "Active":
        conn.close()
        raise HTTPException(status_code=400, detail="Membership inactive")

    # insert issue and update book status
    try:
        cur.execute(
            "INSERT INTO issues(serial_no,membership_id,issue_date,planned_return,actual_return_date,fine_amount,fine_paid) "
            "VALUES (?,?,?,?,NULL,0,0)",
            (serial_no, membership_id, issue_date, planned_return),
        )
        cur.execute(
            "UPDATE books SET status='Issued' WHERE serial_no=?", (serial_no,)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

    return {"message": "Book issued successfully"}


@router.post("/return")
async def start_return(
    serial_no: str = Form(...),
    membership_id: str = Form(...),
    planned_return: str = Form(...),
):
    """Prepare for return; Excel allows editing return date before final fine step."""
    try:
        date.fromisoformat(planned_return)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM issues WHERE serial_no=? AND membership_id=? AND actual_return_date IS NULL",
        (serial_no, membership_id),
    )
    issue = cur.fetchone()
    if not issue:
        conn.close()
        raise HTTPException(status_code=404, detail="Active issue not found for this book and member")

    cur.execute(
        "UPDATE issues SET planned_return=? WHERE issue_id=?",
        (planned_return, issue["issue_id"]),
    )
    conn.commit()
    conn.close()
    return {"message": "Return initiated", "issue_id": issue["issue_id"]}

@router.post("/return/start")
async def start_return(
    membership_id: str = Form(...),
    serial_no: str = Form(...),
    return_date: str | None = Form(None),
    remarks: str | None = Form(None),
):
    """
    Step 1 of return flow:
    - Find active issue for this membership + serial_no
    - Optionally update planned return date
    - Return book + issue details to drive Pay Fine screen
    """
    conn = get_connection()
    cur = conn.cursor()

    # NOTE: issue_id and planned_return are the real column names in your DB
    cur.execute(
        """
        SELECT 
          i.issue_id        AS issue_id,
          i.membership_id   AS membership_id,
          i.serial_no       AS serial_no,
          i.issue_date      AS issue_date,
          i.planned_return  AS planned_return,
          b.name            AS book_name,
          b.author          AS author
        FROM issues i
        JOIN books b ON b.serial_no = i.serial_no
        WHERE i.membership_id = ?
          AND i.serial_no = ?
          AND i.actual_return_date IS NULL
        """,
        (membership_id, serial_no),
    )
    row = cur.fetchone()

    if not row:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail="No active issue found for this membership and serial number"
        )

    # Use existing planned_return if user didn't change Return Date
    effective_return = return_date or row["planned_return"]

    planned_dt = date.fromisoformat(row["planned_return"])
    today = date.today()
    late_days = (today - planned_dt).days
    if late_days > 0:
        fine_amount = late_days * DAILY_FINE
    else:
        fine_amount = 0

    # If user changed return_date on the Return Book screen,
    # update planned_return in DB so /fine uses this new value.
    try:
        if return_date:
            cur.execute(
                "UPDATE issues SET planned_return = ? WHERE issue_id = ?",
                (effective_return, row["issue_id"]),
            )
        elif remarks:
            cur.execute(
                "UPDATE issues SET remarks = COALESCE(remarks, ?) WHERE issue_id = ?",
                (remarks, row["issue_id"]),
            )

        conn.commit()
    finally:
        conn.close()

    # This dict shape matches what your JS expects
    return {
        "issue_id": row["issue_id"],
        "membership_id": row["membership_id"],
        "serial_no": row["serial_no"],
        "book_name": row["book_name"],
        "author": row["author"],
        "issue_date": row["issue_date"],
        "return_date": effective_return,
        "fine_amount": fine_amount,
    }


@router.post("/fine")
async def complete_return(
    issue_id: int = Form(...),
    actual_return_date: str = Form(...),
    fine_paid: bool = Form(False),
):
    # Parse date
    try:
        actual_dt = date.fromisoformat(actual_return_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    conn = get_connection()
    cur = conn.cursor()

    # Load issue
    cur.execute("SELECT * FROM issues WHERE issue_id=?", (issue_id,))
    issue = cur.fetchone()
    if not issue:
        conn.close()
        raise HTTPException(status_code=404, detail="Issue not found")

    planned_dt = date.fromisoformat(issue["planned_return"])
    days_late = (actual_dt - planned_dt).days

    # Calculate fine (Rs 10 per late day)
    fine = 0
    if days_late > 0:
        fine = days_late * 10

    # Enforce "Fine Paid" rule
    if fine > 0 and not fine_paid:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Fine pending, please mark Fine Paid"
        )

    try:
        # Update issue record
        cur.execute(
            """
            UPDATE issues
            SET actual_return_date = ?, 
                fine_amount = ?, 
                fine_paid = ?
            WHERE issue_id = ?
            """,
            (
                actual_return_date,
                fine,
                1 if fine_paid and fine > 0 else 0,
                issue_id,
            ),
        )

        # Mark book as available again
        cur.execute(
            "UPDATE books SET status = 'Available' WHERE serial_no = ?",
            (issue["serial_no"],),
        )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

    return {"message": "Return completed", "fine": fine}

