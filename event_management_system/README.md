# EventHub — Event Management System

A full-stack, role-based Event Management System built with **Flask**, **MySQL**, **SQLAlchemy ORM**,
and **Bootstrap 5**. Supports three roles — **Admin**, **Organizer**, and **Student** — each with
their own permissions, dashboards, and workflows.

---

## ✨ Features

- Role-based authentication (Admin / Organizer / Student) using Flask-Login sessions
- Password hashing with bcrypt (Flask-Bcrypt)
- Full CRUD for events, restricted by ownership and role
- Student event registration with duplicate/seat-limit protection and cancellation
- Search + category/status filters + pagination on the events list
- Admin dashboard: platform stats, all events, all users, all registrations
- Organizer dashboard: manage own events, view registrants per event
- Student dashboard: view & cancel own registrations
- Client-side + server-side form validation
- Confirmation modals before delete and before registering/cancelling
- Clean REST API (`/api/...`) consumed by vanilla JS (fetch) + responsive Bootstrap 5 UI
- MySQL schema + seed script provided

---

## 🧱 Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5   |
| Backend    | Python 3, Flask, Flask-Login, Flask-Bcrypt     |
| ORM        | Flask-SQLAlchemy                               |
| Database   | MySQL 8+                                       |

---

## 📁 Folder Structure

```
event_management_system/
├── app/
│   ├── __init__.py           # Flask app factory
│   ├── config.py             # Configuration (reads .env)
│   ├── models.py             # SQLAlchemy models (User, Event, Registration)
│   ├── utils.py              # RBAC decorators & validation helpers
│   └── routes/
│       ├── pages.py          # Server-rendered page routes
│       ├── auth.py           # /api/auth/* (register, login, logout, me)
│       ├── events.py         # /api/events/*  (CRUD, search, pagination)
│       ├── registrations.py  # /api/registrations/* (register, cancel, list)
│       └── admin.py          # /api/admin/* (stats, users, all registrations)
├── database/
│   ├── schema.sql            # CREATE DATABASE + tables
│   └── seed.sql               # Sample users & events (with demo logins)
├── static/
│   ├── css/style.css
│   └── js/
│       ├── main.js               # shared helpers (fetch wrapper, toasts, navbar)
│       ├── home.js
│       ├── auth.js
│       ├── events.js
│       ├── event_detail.js
│       ├── event_form.js
│       ├── dashboard_admin.js
│       ├── dashboard_organizer.js
│       └── dashboard_student.js
├── templates/
│   ├── base.html, index.html, login.html, register.html
│   ├── events.html, event_detail.html, event_form.html
│   ├── dashboard_admin.html, dashboard_organizer.html, dashboard_student.html
│   └── 404.html, 403.html
├── requirements.txt
├── .env.example
├── run.py
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites

- Python 3.10+
- MySQL Server 8.0+
- pip (and optionally a virtual environment tool)

### 2. Clone / Extract the project

Extract the ZIP and open a terminal inside the `event_management_system/` folder.

### 3. Create a virtual environment (recommended)

```bash
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Create the MySQL database

Log into MySQL and run the provided schema (and optional seed data):

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql   # optional but recommended for demo data
```

This creates the `event_management_db` database along with `users`, `events`,
and `registrations` tables, indexes, and foreign keys.

### 6. Configure environment variables

Copy `.env.example` to `.env` and fill in your MySQL credentials:

```bash
cp .env.example .env       # macOS/Linux
copy .env.example .env     # Windows
```

Edit `.env`:

```
FLASK_ENV=development
SECRET_KEY=your-own-random-secret-key
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=event_management_db
```

### 7. Run the application

```bash
python run.py
```

The app starts at **http://localhost:5000** and will auto-create any missing
tables via SQLAlchemy on first launch (useful if you skip `schema.sql`).

---

## 🔑 Demo Login Credentials

(Only available if you ran `database/seed.sql`)

| Role      | Email                  | Password        |
|-----------|-------------------------|------------------|
| Admin     | admin@events.com        | Admin@123        |
| Organizer | organizer@events.com    | Organizer@123    |
| Student   | student@events.com      | Student@123      |

You can also register new Organizer or Student accounts from the **Sign Up** page.

---

## 🔌 REST API Overview

All endpoints are prefixed with `/api` and use session cookies for authentication
(login via `/api/auth/login` first).

| Method | Endpoint                              | Description                              | Access             |
|--------|-----------------------------------------|-------------------------------------------|---------------------|
| POST   | `/api/auth/register`                    | Register a new organizer/student account   | Public               |
| POST   | `/api/auth/login`                       | Log in                                     | Public               |
| POST   | `/api/auth/logout`                      | Log out                                    | Authenticated        |
| GET    | `/api/auth/me`                          | Get current logged-in user                 | Public               |
| GET    | `/api/events`                           | List events (search, filter, paginate)     | Public               |
| GET    | `/api/events/categories`                | List distinct categories                   | Public               |
| GET    | `/api/events/public-stats`              | Public aggregate counts (home page)        | Public               |
| GET    | `/api/events/<id>`                      | Get a single event                         | Public               |
| POST   | `/api/events`                           | Create an event                            | Organizer            |
| PUT    | `/api/events/<id>`                      | Update an event                            | Owner Organizer/Admin|
| DELETE | `/api/events/<id>`                      | Delete an event                            | Owner Organizer/Admin|
| GET    | `/api/registrations`                    | List registrations (scoped by role)        | Authenticated        |
| POST   | `/api/registrations`                    | Register for an event                      | Student               |
| PUT    | `/api/registrations/<id>/cancel`        | Cancel own registration                    | Student               |
| GET    | `/api/admin/stats`                      | Platform-wide stats                        | Admin                 |
| GET    | `/api/admin/users`                      | List all users                             | Admin                 |
| GET    | `/api/admin/registrations`              | List all registrations                     | Admin                 |

---

## 🔒 Role Permissions Summary

| Action                          | Admin | Organizer            | Student |
|----------------------------------|:-----:|:---------------------:|:-------:|
| View all events                  | ✅    | ✅                     | ✅      |
| Create events                     | ❌    | ✅                     | ❌      |
| Edit/Delete any event             | ✅    | Only own events        | ❌      |
| View all registrations            | ✅    | Only for own events    | ❌      |
| Register for events               | ❌    | ❌                     | ✅      |
| View/Cancel own registrations     | —     | —                      | ✅      |

---

## 🧪 Notes & Tips

- Passwords are never stored in plain text — bcrypt hashing is used everywhere.
- Server-side validation runs on every create/update request in addition to
  client-side HTML5 + JS validation, so the API is safe to call directly too.
- Deleting an event cascades and removes its registrations (foreign keys with
  `ON DELETE CASCADE`).
- The event list, dashboards, and registration tables all support pagination.
- If you change models in `app/models.py`, re-run schema.sql (or drop/recreate
  the DB) since this project does not include a migrations tool like Alembic.

---

## 📄 License

This project is provided as a learning/demo scaffold — feel free to use and modify it.
