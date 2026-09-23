# LibraLink - Database Tables & Data Dictionary

This document provides the complete **Data Dictionary and Table Specifications** for the **LibraLink Multi-School Library Management System** (PostgreSQL / Supabase).

---

## 📑 Summary of Database Tables

| # | Table Name | Category / Module | Primary Key | Description |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `schools` | Multi-Tenancy & Tenants | `school_id` | Member educational institutions in the consortium. |
| **2** | `roles` | Authentication & RBAC | `role_id` | Authorization levels (Super Admin, Librarian Admin, Librarian, Student). |
| **3** | `users` | Multi-Tenancy & Users | `user_id` | User accounts for students, faculty, and library staff. |
| **4** | `verification_codes` | Security & Auth | `id` | One-time password (OTP) verification and password reset tokens. |
| **5** | `categories` | Catalog & Metadata | `category_id` | Dewey/Subject classifications (e.g., Computer Science, Literature). |
| **6** | `authors` | Catalog & Metadata | `author_id` | Book contributors and primary writers. |
| **7** | `publishers` | Catalog & Metadata | `publisher_id` | Publishing companies and publication locations. |
| **8** | `books` | Catalog & Metadata | `book_id` | Bibliographic titles, ISBNs, and classification metadata. |
| **9** | `book_authors` | Catalog & Metadata | `(book_id, author_id)` | Many-to-many bridge linking books to multiple authors. |
| **10** | `book_copies` | Physical Inventory | `copy_id` | Physical shelf items tracked via unique accession number and barcode. |
| **11** | `borrow_requests` | Circulation & Requests | `request_id` | Multi-item checkout requests, QR tokens, and permission passes. |
| **12** | `borrow_request_items` | Circulation & Requests | `item_id` | Line items in a borrow request (tracks individual copies released/returned). |
| **13** | `borrow_transactions` | Physical Circulation | `borrow_id` | Front-desk checkout audit trails and due date management. |
| **14** | `fines` | Circulation & Finance | `fine_id` | Overdue penalty assessments and payment settlements. |
| **15** | `interlibrary_requests` | Consortium Circulation | `request_id` | Legacy direct inter-campus dispatch records. |
| **16** | `notifications` | Feeds & Communications | `notification_id` | In-app real-time alerts dispatched to patrons and staff. |
| **17** | `announcements` | Feeds & Communications | `announcement_id` | Institution-wide updates and library bulletins. |
| **18** | `activity_logs` | Audit & Security | `log_id` | Security audit trail of system operations and user actions. |
| **19** | `import_history` | Administration | `import_id` | Logs of batch CSV/Excel catalog uploads. |
| **20** | `settings` | System Configuration | `setting_id` | Global platform parameters, loan periods, and fine rates. |

---

## 1. Multi-Tenancy & User Management

### 1.1 `schools`
Stores institutional library tenants participating in the consortium.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `school_id` | `SERIAL` | **PK**, Not Null | Unique identifier for each institution. |
| `school_name` | `VARCHAR(255)` | Not Null | Official name of the college or university. |
| `school_code` | `VARCHAR(50)` | **Unique**, Not Null | Short institutional abbreviation (e.g., `SRC`, `GNC`). |
| `address` | `TEXT` | Nullable | Campus location address. |
| `contact_number` | `VARCHAR(50)` | Nullable | Official library contact phone/mobile. |
| `email` | `VARCHAR(255)` | Nullable | Institutional library contact email. |
| `logo` | `TEXT` | Nullable | URL or storage path for school seal/logo. |
| `latitude` | `DECIMAL(10,8)`| Nullable | Campus GPS coordinate for inter-campus distance mapping. |
| `longitude` | `DECIMAL(11,8)`| Nullable | Campus GPS coordinate for inter-campus distance mapping. |
| `borrowing_requirements`| `TEXT` | Nullable | Special inter-school borrowing guidelines or policies. |
| `status` | `school_status`| Default `'active'` | Institution status: `active` or `inactive`. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Account registration timestamp. |

---

### 1.2 `roles`
Defines role-based access control (RBAC) authorization tiers.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `role_id` | `SERIAL` | **PK**, Not Null | Unique role identifier. |
| `role_name` | `VARCHAR(50)` | **Unique**, Not Null | `Super Admin`, `Librarian Admin`, `Librarian`, `Student`. |

---

### 1.3 `users`
Accounts for library patrons, faculty, and administrative staff.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `SERIAL` | **PK**, Not Null | Unique user identifier. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | Home institution of the user. |
| `role_id` | `INTEGER` | **FK** ➔ `roles.role_id`, Not Null | System access level. |
| `student_number`| `VARCHAR(50)` | Nullable | Institutional ID number (for students). |
| `employee_number`| `VARCHAR(50)`| Nullable | Institutional ID number (for staff). |
| `firstname` | `VARCHAR(100)`| Not Null | Given name. |
| `lastname` | `VARCHAR(100)`| Not Null | Family name. |
| `middle_name` | `VARCHAR(100)`| Nullable | Middle name. |
| `gender` | `gender_type` | Nullable | `male`, `female`, or `other`. |
| `contact_number`| `VARCHAR(50)` | Nullable | Mobile number for notifications. |
| `email` | `VARCHAR(255)`| **Unique**, Not Null | Primary login email address. |
| `recovery_email`| `VARCHAR(255)`| Nullable | Secondary email for password recovery. |
| `password` | `VARCHAR(255)`| Not Null | Bcrypt salted and hashed password string. |
| `position` | `VARCHAR(100)`| Nullable | Job title (e.g., Head Librarian). |
| `profile_image` | `VARCHAR(255)`| Nullable | Path to profile avatar. |
| `policy_accepted`| `BOOLEAN` | Default `FALSE` | Agreement to library terms and privacy policy. |
| `status` | `user_status` | Default `'active'` | `active` or `inactive`. |
| `is_archived` | `BOOLEAN` | Default `FALSE` | Soft-delete status flag. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Account creation timestamp. |

---

### 1.4 `verification_codes`
One-time security codes used during registration and password reset.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | **PK**, Not Null | Unique record ID. |
| `user_id` | `INTEGER` | **FK** ➔ `users.user_id`, Not Null | User requesting verification. |
| `email` | `VARCHAR(255)`| Not Null | Destination email address. |
| `code` | `VARCHAR(6)` | Not Null | 6-digit numeric OTP code. |
| `type` | `VARCHAR(50)` | Default `'email_verification'` | `email_verification` or `password_reset`. |
| `expires_at` | `TIMESTAMPTZ` | Not Null | Expiration timestamp (e.g., 15 minutes). |
| `used_at` | `TIMESTAMPTZ` | Nullable | Timestamp when code was validated. |
| `is_used` | `BOOLEAN` | Default `FALSE` | Prevents token reuse attacks. |
| `created_at` | `TIMESTAMPTZ` | Default `CURRENT_TIMESTAMP` | Code generation timestamp. |

---

## 2. Bibliographic Catalog & Physical Inventory

### 2.1 `categories`
Subject divisions and catalog classifications.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | `SERIAL` | **PK**, Not Null | Category identifier. |
| `category_name`| `VARCHAR(100)`| **Unique**, Not Null | Subject name (e.g., Science, Fiction, Technology). |

---

### 2.2 `authors`
Individual authors or contributors.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `author_id` | `SERIAL` | **PK**, Not Null | Author identifier. |
| `author_name` | `VARCHAR(255)`| **Unique**, Not Null | Full author name (e.g., "Lacsamana, B.B."). |

---

### 2.3 `publishers`
Publishing houses and corporate producers.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `publisher_id` | `SERIAL` | **PK**, Not Null | Publisher identifier. |
| `publisher_name`| `VARCHAR(255)`| **Unique**, Not Null | Name of publishing firm. |
| `place_of_publication`| `VARCHAR(255)`| Nullable | City or country of origin. |

---

### 2.4 `books`
Bibliographic title records (intellectual entity, not shelf inventory).

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `book_id` | `SERIAL` | **PK**, Not Null | Unique bibliographic record ID. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | School owning the catalog listing. |
| `category_id` | `INTEGER` | **FK** ➔ `categories.category_id` | Subject category. |
| `publisher_id` | `INTEGER` | **FK** ➔ `publishers.publisher_id` | Book publisher. |
| `title` | `VARCHAR(255)`| Not Null | Title of the publication. |
| `isbn` | `VARCHAR(50)` | Nullable | International Standard Book Number. |
| `call_number` | `VARCHAR(100)`| Nullable | Dewey / LC classification call number. |
| `edition` | `VARCHAR(50)` | Nullable | Edition number (e.g., "1st", "Revised"). |
| `copyright_year`| `INTEGER` | Nullable | Year of copyright / publication. |
| `physical_description`| `TEXT` | Nullable | Page count, dimensions, illustrations. |
| `series_title` | `VARCHAR(255)`| Nullable | Parent book series name if applicable. |
| `general_note` | `TEXT` | Nullable | Cataloger notes or summary abstract. |
| `cover_image` | `VARCHAR(255)`| Nullable | URL/path to front cover thumbnail. |
| `remarks` | `TEXT` | Nullable | Internal administrative notes. |
| `encoded_by` | `INTEGER` | **FK** ➔ `users.user_id` | Staff member who added the record. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Cataloging date. |

---

### 2.5 `book_authors`
Many-to-many bridge linking a book to one or more authors.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `book_id` | `INTEGER` | **PK, FK** ➔ `books.book_id` | Target book title. |
| `author_id` | `INTEGER` | **PK, FK** ➔ `authors.author_id` | Contributing author. |

---

### 2.6 `book_copies`
Physical inventory copies residing on library shelves.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `copy_id` | `SERIAL` | **PK**, Not Null | Unique physical inventory ID. |
| `book_id` | `INTEGER` | **FK** ➔ `books.book_id`, Not Null | Bibliographic metadata reference. |
| `accession_number`| `VARCHAR(50)`| **Unique**, Not Null | Library accession number (e.g., `SRC-000123`). |
| `barcode` | `VARCHAR(50)` | **Unique**, Nullable | Scannable physical barcode string. |
| `rfid_tag` | `VARCHAR(50)` | **Unique**, Nullable | RFID tag identifier. |
| `shelf_location`| `VARCHAR(100)`| Nullable | Shelf / rack designation (e.g., `A-101-2`). |
| `condition` | `book_condition`| Default `'good'` | `good`, `fair`, `poor`, `damaged`. |
| `status` | `book_status` | Default `'available'` | `available`, `borrowed`, `reserved`, `lost`, `maintenance`. |

---

## 3. Circulation & Inter-School Lending

### 3.1 `borrow_requests`
Header record for patron borrow carts, permission passes, and QR checkouts.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `request_id` | `VARCHAR(20)` | **PK**, Not Null | Formatted ID: `LL-YYYY-XXXXXX`. |
| `student_id` | `INTEGER` | **FK** ➔ `users.user_id`, Not Null | Borrower account ID. |
| `home_school_id`| `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | Borrower's home campus. |
| `request_type`| `VARCHAR(20)` | Not Null | `HOME` or `INTER_SCHOOL`. |
| `status` | `VARCHAR(20)` | Default `'pending'` | `pending`, `approved`, `rejected`, `permission_ready`, `ready_for_pickup`, `borrowed`, `returned`, `cancelled`. |
| `purpose` | `TEXT` | Not Null | Stated academic purpose of borrowing. |
| `contact_number`| `VARCHAR(50)` | Nullable | Contact number for pickup alerts. |
| `address` | `TEXT` | Nullable | Borrower's contact address. |
| `id_picture_url`| `VARCHAR(255)`| Nullable | Digital photo of student school ID. |
| `qr_token` | `VARCHAR(255)`| **Unique**, Nullable | Secure token encoded inside the QR pass. |
| `permission_letter_generated`| `BOOLEAN` | Default `FALSE` | Indicates whether formal letter was built. |
| `permission_letter_url`| `VARCHAR(255)`| Nullable | Path to generated permission letter PDF. |
| `approved_by` | `INTEGER` | **FK** ➔ `users.user_id` | Home librarian who approved request. |
| `approved_at` | `TIMESTAMP` | Nullable | Timestamp of home school approval. |
| `borrowed_at` | `TIMESTAMP` | Nullable | Timestamp when copies were picked up. |
| `returned_at` | `TIMESTAMP` | Nullable | Timestamp when all copies were returned. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Submission timestamp. |
| `updated_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Last status modification. |

---

### 3.2 `borrow_request_items`
Individual book line items included in a borrow request.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `item_id` | `SERIAL` | **PK**, Not Null | Line item ID. |
| `request_id` | `VARCHAR(20)` | **FK** ➔ `borrow_requests.request_id`, Not Null | Parent request header. |
| `book_id` | `INTEGER` | **FK** ➔ `books.book_id`, Not Null | Requested bibliographic title. |
| `owner_school_id`| `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | School that owns the physical book. |
| `partner_school_id`| `INTEGER` | **FK** ➔ `schools.school_id` | Visiting borrower's school. |
| `borrow_type` | `VARCHAR(30)` | Not Null | `HOME` or `INTER_SCHOOL_LIBRARY_USE`. |
| `status` | `VARCHAR(20)` | Default `'pending'` | `pending`, `approved`, `released`, `returned`, `cancelled`. |
| `copy_id` | `INTEGER` | **FK** ➔ `book_copies.copy_id` | Assigned physical copy on pickup. |
| `due_date` | `DATE` | Nullable | Expected return deadline. |
| `released_by` | `INTEGER` | **FK** ➔ `users.user_id` | Librarian who checked out the book. |
| `released_at` | `TIMESTAMP` | Nullable | Physical checkout timestamp. |
| `returned_by` | `INTEGER` | **FK** ➔ `users.user_id` | Librarian who received the return. |
| `returned_at` | `TIMESTAMP` | Nullable | Physical return timestamp. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Item addition timestamp. |

---

### 3.3 `borrow_transactions`
Front-desk circulation desk checkout log.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `borrow_id` | `SERIAL` | **PK**, Not Null | Transaction ID. |
| `copy_id` | `INTEGER` | **FK** ➔ `book_copies.copy_id`, Not Null | Physical copy checked out. |
| `student_id` | `INTEGER` | **FK** ➔ `users.user_id`, Not Null | Patron who borrowed the book. |
| `librarian_id`| `INTEGER` | **FK** ➔ `users.user_id` | Staff member who processed the loan. |
| `borrow_date` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Checkout timestamp. |
| `due_date` | `DATE` | Not Null | Due date for return. |
| `return_date` | `TIMESTAMP` | Nullable | Actual return timestamp. |
| `status` | `borrow_status`| Default `'active'` | `active`, `returned`, `overdue`. |
| `remarks` | `TEXT` | Nullable | Condition notes upon return. |

---

### 3.4 `fines`
Financial penalties assessed for overdue or damaged books.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `fine_id` | `SERIAL` | **PK**, Not Null | Fine assessment ID. |
| `borrow_id` | `INTEGER` | **FK** ➔ `borrow_transactions.borrow_id` | Associated borrow transaction. |
| `student_id` | `INTEGER` | **FK** ➔ `users.user_id`, Not Null | Student charged with fine. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | School assessing and collecting fine. |
| `amount` | `DECIMAL(10,2)`| Not Null | Penalty amount in PHP (₱). |
| `status` | `VARCHAR(20)` | Default `'unpaid'` | `unpaid`, `paid`, `waived`. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Assessment date. |

---

## 4. Communications, Audit & System Settings

### 4.1 `notifications`
Real-time notification feeds.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `notification_id`| `SERIAL` | **PK**, Not Null | Notification ID. |
| `user_id` | `INTEGER` | **FK** ➔ `users.user_id` | Recipient user. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id` | Institutional scope. |
| `title` | `VARCHAR(255)`| Not Null | Notification title heading. |
| `message` | `TEXT` | Not Null | Detailed notification body. |
| `type` | `VARCHAR(50)` | Nullable | Alert category (e.g., `borrow_approval`, `due_date`). |
| `related_id` | `INTEGER` | Nullable | Foreign ID linking to related entity. |
| `is_read` | `BOOLEAN` | Default `FALSE` | Read / unread status. |
| `is_admin_notification`| `BOOLEAN` | Default `FALSE` | Flag for librarian admin dashboard alerts. |
| `is_global` | `BOOLEAN` | Default `FALSE` | Broadcast alert across all users. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Dispatch timestamp. |

---

### 4.2 `announcements`
Institutional bulletins and announcements.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `announcement_id`| `SERIAL`| **PK**, Not Null | Announcement ID. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id` | Target institution (NULL = consortium global). |
| `created_by` | `INTEGER` | **FK** ➔ `users.user_id`, Not Null | Staff author ID. |
| `title` | `VARCHAR(255)`| Not Null | Headline title. |
| `content` | `TEXT` | Not Null | Announcement markdown or text body. |
| `image` | `VARCHAR(255)`| Nullable | Banner image URL. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Publication date. |

---

### 4.3 `activity_logs`
Security audit trail and action history.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `log_id` | `SERIAL` | **PK**, Not Null | Log record ID. |
| `user_id` | `INTEGER` | **FK** ➔ `users.user_id` | User who performed action. |
| `activity` | `TEXT` | Not Null | Human-readable description of event. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Action timestamp. |

---

### 4.4 `import_history`
Audit records for batch CSV / Excel catalog uploads.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `import_id` | `SERIAL` | **PK**, Not Null | Import record ID. |
| `school_id` | `INTEGER` | **FK** ➔ `schools.school_id`, Not Null | Tenant receiving catalog upload. |
| `user_id` | `INTEGER` | **FK** ➔ `users.user_id` | Staff member who initiated upload. |
| `file_name` | `VARCHAR(255)`| Not Null | Original filename imported. |
| `total_rows` | `INTEGER` | Default `0` | Total records in file. |
| `successful` | `INTEGER` | Default `0` | Records successfully created. |
| `failed` | `INTEGER` | Default `0` | Records with errors. |
| `skipped` | `INTEGER` | Default `0` | Duplicate records ignored. |
| `status` | `VARCHAR(50)` | Default `'pending'` | `pending`, `completed`, `failed`. |
| `error_details`| `TEXT` | Nullable | JSON / string error log for failed rows. |
| `import_date` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Date and time of operation. |

---

### 4.5 `settings`
System-wide configuration parameters and institutional library defaults.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `setting_id` | `SERIAL` | **PK**, Not Null | Setting record ID. |
| `setting_key` | `VARCHAR(255)`| **Unique**, Not Null | Configuration key (e.g., `fine_per_day`, `max_books_student`). |
| `setting_value`| `TEXT` | Nullable | Parameter value (e.g., `"5.00"`, `"3"`). |
| `description` | `TEXT` | Nullable | Documentation note on how setting affects business logic. |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Initial insert timestamp. |
| `updated_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` | Last update timestamp. |
