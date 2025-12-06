# 📚 Library Management System – FastAPI

A functional Library Management System built using **FastAPI**, **HTML/CSS/JS** frontend, and **SQLite** database.
This system allows admin users to maintain master data (books, memberships, users) and both admin and normal users to perform transactions such as issuing and returning books.

---

## 🚀 Features

### 🔐 Authentication

* Login for Admin and Normal user
* Role-based UI access

  * Admin → Full system access
  * User → Reports & Transactions only

---

### 🛠 Maintenance (Admin Only)

Admin can:

✔ Add new memberships
✔ Update membership status (extend/cancel)
✔ Add new Books/Movies
✔ Update Book/Movies status
✔ Manage Users (create/update users)

---

### 📦 Transactions (Admin & User)

Both can:

✔ Check if books are available
✔ Issue books
✔ Return books
✔ Pay fines (if late return)

Fine logic implemented:

```
Fine = No. of Late Days * ₹10/day
```

---

### 📊 Reports (Admin & User)

Includes:
✔ Master List of Books
✔ Master List of Memberships
✔ Active Issues
✔ Overdue Returns
✔ Movies List
✔ Issue Requests (placeholder for extension)

Reports are displayed in **tabular format**.

---

## 🏗 Tech Stack

| Component   | Technology            |
| ----------- | --------------------- |
| Frontend UI | HTML, CSS, JavaScript |
| Backend     | FastAPI               |
| Database    | SQLite                |
| Server      | Uvicorn               |

---

## 📁 Folder Structure

```
library_lms/
│
├── app/
│   ├── main.py          → Entry point
│   ├── db.py            → DB connection
│   ├── db_init.py       → Creates & Seeds data on first run
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── maintenance.py
│   │   ├── transactions.py
│   │   └── reports.py
│   │
│   ├── templates/
│   │   └── index.html   → Single page UI
│   │
│   └── static/
│       ├── css/style.css
│       └── js/app.js
│
├── library.db (auto-created)
└── requirements.txt
```

---

## 🧪 Default Credentials

### Admin Login

```
Username: adm
Password: adm
```

### Normal User Login

```
Username: user
Password: user
```

You may also add users from:

➡ Maintenance → User Management

---

## ▶️ How to Run

### 1. Create & activate virtual environment

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Mac/Linux:

```bash
source venv/bin/activate
```

---

### 2. Install dependencies

```
pip install -r requirements.txt
```

---

### 3. Run the application

```
uvicorn app.main:app --reload
```

---

### 4. Open in browser

👉 [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## 🔄 Database Info

The moment you run the system:

✔ `library.db` is created automatically
✔ Tables get seeded with sample data

Example initial data:

#### Books

* SC(B/M)0000001 → Available
* SC(B/M)0000002 → Available
* …

#### Member

* M001 → Active

---
