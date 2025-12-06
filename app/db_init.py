
from .db import get_connection

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','user')),
            is_active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Books / Movies table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS books (
            serial_no TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Available',
            cost REAL DEFAULT 0,
            procurement_date TEXT,
            type TEXT NOT NULL CHECK(type IN ('Book','Movie'))
        )
    """)

    # Members table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS members (
            membership_id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            aadhar TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            pending_fine REAL DEFAULT 0
        )
    """)

    # Issues table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS issues (
            issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial_no TEXT NOT NULL,
            membership_id TEXT NOT NULL,
            issue_date TEXT NOT NULL,
            planned_return TEXT NOT NULL,
            actual_return_date TEXT,
            fine_amount REAL DEFAULT 0,
            fine_paid INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(serial_no) REFERENCES books(serial_no),
            FOREIGN KEY(membership_id) REFERENCES members(membership_id)
        )
    """)

    # Simple issue_requests table for reports
    cur.execute("""
        CREATE TABLE IF NOT EXISTS issue_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            membership_id TEXT NOT NULL,
            book_name TEXT NOT NULL,
            requested_date TEXT NOT NULL,
            fulfilled_date TEXT
        )
    """)

    # Seed users
    cur.execute("DELETE FROM users")
    cur.executemany(
        "INSERT INTO users(username,password,role,is_active) VALUES (?,?,?,1)",
        [
            ("adm", "adm", "admin"),
            ("user", "user", "user"),
        ],
    )

    # Seed some books
    cur.execute("DELETE FROM books")
    sample_books = [
        ("SC(B/M)000001", "Science Book 1", "Author A", "Science", "Available", 300, "2024-01-10", "Book"),
        ("EC(B/M)000001", "Economics Intro", "Author B", "Economics", "Available", 250, "2024-02-15", "Book"),
        ("FC(B/M)000001", "Fiction Tales", "Author C", "Fiction", "Available", 200, "2024-03-20", "Book"),
        ("CH(B/M)000001", "Kids Story", "Author D", "Children", "Available", 150, "2024-04-01", "Book"),
        ("PD(B/M)000001", "Self Help", "Author E", "Personal Development", "Available", 350, "2024-05-05", "Book"),
    ]
    cur.executemany(
        "INSERT INTO books(serial_no,name,author,category,status,cost,procurement_date,type) VALUES (?,?,?,?,?,?,?,?)",
        sample_books,
    )

    # Seed a sample member for testing
    cur.execute("DELETE FROM members")
    cur.execute(
        "INSERT INTO members(membership_id,first_name,last_name,phone,address,aadhar,start_date,end_date,status,pending_fine) "
        "VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("M001", "Test", "Member", "9999999999", "Sample Address", "123412341234", "2024-01-01", "2025-01-01", "Active", 0),
    )

    conn.commit()
    conn.close()
    print("Database initialized.")

if __name__ == "__main__":
    init_db()
