# LibraLink - Database Entity Relationship Diagram (ERD)

This document provides the complete **Physical Entity Relationship Diagram (ERD)** for the **LibraLink Multi-School Library Management System**, available in both **[dbdiagram.io](https://dbdiagram.io)** (DBML) and **[Mermaid](https://mermaid.js.org/)**.

> 📖 **Detailed Field-by-Field Data Dictionary**: See [docs/DATABASE_TABLES.md](file:///c:/xampp/htdocs/libralinkk/docs/DATABASE_TABLES.md) for full column specifications, types, constraints, and descriptions.

---

## 1. dbdiagram.io (DBML Format - Recommended)

[dbdiagram.io](https://dbdiagram.io/) is an online database diagram designer that renders interactive, color-coded, draggable ER diagrams directly from Database Markup Language (DBML).

### How to Use:
1. Open **[dbdiagram.io](https://dbdiagram.io/)** in your browser.
2. Click **"New Diagram"**.
3. Copy the DBML code from [docs/libralink_erd.dbml](file:///c:/xampp/htdocs/libralinkk/docs/libralink_erd.dbml) and paste it into the editor pane on the left.
4. Your interactive ERD with color-coded groups, cardinality connectors, and indexes will render instantly!
5. You can export as **PDF**, **PNG**, **SVG**, or generate **PostgreSQL SQL DDL**.

---

## 2. System Architecture ERD (Mermaid)

```mermaid
erDiagram
  %% ==========================================
  %% RELATIONSHIPS & CARDINALITY
  %% ==========================================

  %% Multi-Tenancy & User Management
  SCHOOLS ||--o{ USERS : "employs / enrolls"
  ROLES ||--o{ USERS : "authorizes"

  %% Cataloging & Physical Inventory
  SCHOOLS ||--o{ BOOKS : "owns catalog items"
  CATEGORIES ||--o{ BOOKS : "classifies"
  PUBLISHERS ||--o{ BOOKS : "publishes"
  BOOKS ||--|{ BOOK_AUTHORS : "has"
  AUTHORS ||--|{ BOOK_AUTHORS : "writes"
  BOOKS ||--|{ BOOK_COPIES : "tracks inventory items"

  %% Modern Circulation & Inter-School Lending
  SCHOOLS ||--o{ BORROW_REQUESTS : "originates from (home campus)"
  USERS ||--o{ BORROW_REQUESTS : "submits (borrower)"
  USERS ||--o{ BORROW_REQUESTS : "reviews (approver)"
  BORROW_REQUESTS ||--|{ BORROW_REQUEST_ITEMS : "contains line items"
  
  BOOKS ||--o{ BORROW_REQUEST_ITEMS : "specifies book"
  BOOK_COPIES ||--o{ BORROW_REQUEST_ITEMS : "assigns physical copy"
  SCHOOLS ||--o{ BORROW_REQUEST_ITEMS : "lends copy (owner school)"
  SCHOOLS ||--o{ BORROW_REQUEST_ITEMS : "borrows copy (partner school)"
  USERS ||--o{ BORROW_REQUEST_ITEMS : "releases book"
  USERS ||--o{ BORROW_REQUEST_ITEMS : "receives return"

  %% Physical Circulation Desk & Overdue Fines
  BOOK_COPIES ||--o{ BORROW_TRANSACTIONS : "issued in"
  USERS ||--o{ BORROW_TRANSACTIONS : "borrows"
  USERS ||--o{ BORROW_TRANSACTIONS : "processes (librarian)"
  BORROW_TRANSACTIONS ||--o{ FINES : "generates penalty"
  USERS ||--o{ FINES : "charged to"
  SCHOOLS ||--o{ FINES : "managed by"

  %% System Logs, Communications & Feeds
  USERS ||--o{ NOTIFICATIONS : "receives"
  SCHOOLS ||--o{ NOTIFICATIONS : "scopes"
  USERS ||--o{ ACTIVITY_LOGS : "performed by"
  SCHOOLS ||--o{ ANNOUNCEMENTS : "posts to"
  USERS ||--o{ ANNOUNCEMENTS : "authored by"

  %% ==========================================
  %% ENTITY DEFINITIONS
  %% ==========================================

  SCHOOLS {
    int school_id PK
    string school_name
    string school_code
    string address
    string contact_number
    string email
    string logo
    decimal latitude
    decimal longitude
    string borrowing_requirements
    string status
    timestamp created_at
  }

  ROLES {
    int role_id PK
    string role_name
  }

  USERS {
    int user_id PK
    int school_id FK
    int role_id FK
    string student_number
    string employee_number
    string firstname
    string lastname
    string email
    string contact_number
    string gender
    string profile_image
    string password
    boolean policy_accepted
    string status
    boolean is_archived
    timestamp created_at
  }

  CATEGORIES {
    int category_id PK
    string category_name
  }

  AUTHORS {
    int author_id PK
    string author_name
  }

  PUBLISHERS {
    int publisher_id PK
    string publisher_name
    string place_of_publication
  }

  BOOKS {
    int book_id PK
    int school_id FK
    int category_id FK
    int publisher_id FK
    string title
    string isbn
    string call_number
    string edition
    int copyright_year
    string cover_image
    string series_title
    text general_note
    timestamp created_at
  }

  BOOK_AUTHORS {
    int book_id PK,FK
    int author_id PK,FK
  }

  BOOK_COPIES {
    int copy_id PK
    int book_id FK
    string accession_number
    string barcode
    string rfid_tag
    string shelf_location
    string condition
    string status
  }

  BORROW_REQUESTS {
    string request_id PK "LL-YYYY-XXXXXX"
    int student_id FK
    int home_school_id FK
    string request_type "HOME or INTER_SCHOOL"
    string status "pending, approved, ready, borrowed, returned, cancelled"
    text purpose
    string qr_token
    boolean permission_letter_generated
    string permission_letter_url
    int approved_by FK
    timestamp approved_at
    timestamp borrowed_at
    timestamp returned_at
    timestamp created_at
  }

  BORROW_REQUEST_ITEMS {
    int item_id PK
    string request_id FK
    int book_id FK
    int owner_school_id FK
    int partner_school_id FK
    int copy_id FK
    string borrow_type "HOME or INTER_SCHOOL_LIBRARY_USE"
    string status "pending, approved, released, returned, cancelled"
    int released_by FK
    timestamp released_at
    int returned_by FK
    timestamp returned_at
    timestamp created_at
  }

  BORROW_TRANSACTIONS {
    int borrow_id PK
    int copy_id FK
    int student_id FK
    int librarian_id FK
    timestamp borrow_date
    date due_date
    timestamp return_date
    string status "active, returned, overdue"
    text remarks
  }

  FINES {
    int fine_id PK
    int borrow_id FK
    int student_id FK
    int school_id FK
    decimal amount
    string status "unpaid, paid, waived"
    timestamp created_at
  }

  NOTIFICATIONS {
    int notification_id PK
    int user_id FK
    int school_id FK
    string title
    text message
    string type
    int related_id
    boolean is_read
    boolean is_admin_notification
    timestamp created_at
  }

  ACTIVITY_LOGS {
    int log_id PK
    int user_id FK
    text activity
    timestamp created_at
  }

  ANNOUNCEMENTS {
    int announcement_id PK
    int school_id FK
    int created_by FK
    string title
    text content
    string image
    timestamp created_at
  }
```

---

## 3. Core Subsystems & Relationship Dictionary

| Module | Primary Entities | Key Relationships & Cardinality | Business Logic / Constraints |
| :--- | :--- | :--- | :--- |
| **Multi-Tenancy & Users** | `SCHOOLS`, `ROLES`, `USERS` | - `SCHOOLS 1:N USERS`<br>- `ROLES 1:N USERS` | Every student and librarian belongs to a specific institution (`school_id`). Super Admins have global visibility; school staff manage their respective tenant. |
| **Cataloging & Inventory** | `BOOKS`, `BOOK_COPIES`, `CATEGORIES`, `AUTHORS`, `PUBLISHERS`, `BOOK_AUTHORS` | - `SCHOOLS 1:N BOOKS`<br>- `CATEGORIES 1:N BOOKS`<br>- `PUBLISHERS 1:N BOOKS`<br>- `BOOKS N:M AUTHORS` (via `BOOK_AUTHORS`)<br>- `BOOKS 1:N BOOK_COPIES` | A `BOOK` represents bibliographic metadata (MARC/Dewey Dewey classification, title, ISBN). Individual physical books on shelves are tracked as `BOOK_COPIES` using unique `accession_number` and barcode. |
| **Borrowing & Inter-School Lending** | `BORROW_REQUESTS`, `BORROW_REQUEST_ITEMS`, `BOOK_COPIES` | - `USERS 1:N BORROW_REQUESTS`<br>- `BORROW_REQUESTS 1:N BORROW_REQUEST_ITEMS`<br>- `BOOK_COPIES 1:N BORROW_REQUEST_ITEMS` | Supports multi-item checkouts. `request_type` differentiates between **Home Campus** lending and cross-institutional **Inter-School** lending with automated permission letter and QR pickup token. |
| **Circulation Audit & Fines** | `BORROW_TRANSACTIONS`, `FINES` | - `BOOK_COPIES 1:N BORROW_TRANSACTIONS`<br>- `BORROW_TRANSACTIONS 1:N FINES` | Tracks real-time active loans, return timestamps in Philippine Standard Time (PST UTC+8), overdue status, and fine generation. |
| **Audit, Feeds & Alerts** | `NOTIFICATIONS`, `ACTIVITY_LOGS`, `ANNOUNCEMENTS` | - `USERS 1:N NOTIFICATIONS`<br>- `SCHOOLS 1:N ANNOUNCEMENTS`<br>- `USERS 1:N ACTIVITY_LOGS` | 3-way real-time notification synchronization across Student, Librarian, and Admin-Librarian portals. |
