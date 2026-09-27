# LibraLink - UML Use Case Diagram Architecture

This document describes the complete UML Use Case Diagram for **LibraLink Library Management System**, structured around **4 User Roles** and **4 Dedicated Functional Subsystems** representing all active codebase features.

---

## 1. User Roles & Subsystems Overview

| User Role | Subsystem | Core Responsibilities |
|---|---|---|
| **Student** (Patron / Borrower) | **1. Student Patron Services Subsystem** | Self-registration, catalog search, availability verification, wishlist & cart management, borrow request submission, QR pass presentation, inter-library permission requests, loan tracking, history & fines. |
| **Librarian** (Circulation Desk Staff) | **2. Circulation Desk Services Subsystem** | Request review (approval/disapproval), patron standing verification, QR pickup scanning, physical book release & return check-in, book condition inspection, overdue audits, fine collection, inter-library permission letters, clearance letters. |
| **Admin-Librarian** (Head Administrator) | **3. Admin-Librarian Governance Subsystem** | Master book catalog, batch CSV import, accession & barcode maintenance, categories/authors taxonomy, staff librarian management, loan duration policies, fine rates, analytics dashboards, and institutional profile. |
| **Super Admin** (Platform Administrator) | **4. Super Admin Platform Administration Subsystem** | Multi-institution/campus tenant management, cross-campus user & role governance, platform-wide catalog oversight & batch import, automated database backup & disaster recovery, system telemetry & analytics, broadcast announcements, and platform security settings. |

---

## 2. Mermaid.ai Source Code

```mermaid
flowchart LR
    %% ACADEMIC BLACK & WHITE STYLING
    classDef actor fill:#FFFFFF,stroke:#000000,stroke-width:2px,color:#000000,font-weight:bold;
    classDef usecase fill:#FFFFFF,stroke:#000000,stroke-width:1.8px,color:#000000,font-weight:bold;
    classDef extcase fill:#F1F5F9,stroke:#000000,stroke-width:1.5px,color:#000000,font-weight:bold;
    classDef incase fill:#F1F5F9,stroke:#000000,stroke-width:1.5px,color:#000000,font-weight:bold;

    %% 1. ACTORS (4 ROLES)
    subgraph ACTORS ["Actors"]
        direction TB
        STUDENT["🧍 Student (Patron)"]:::actor
        LIBRARIAN["🧍 Librarian (Circulation Desk)"]:::actor
        ADMINLIB["🧍 Admin-Librarian (Governance)"]:::actor
        SUPERADMIN["🧍 Super Admin (Platform)"]:::actor
    end

    %% 2. COMMON AUTHENTICATION & ACCESS GATEWAY
    subgraph GATEWAY ["0. Common Authentication & Access Gateway"]
        direction TB
        UC_LOGIN(["Log-in & Authenticate"]):::usecase
        UC_SESSION(["Validate Role & Session Security"]):::extcase
    end

    %% 3. SUBSYSTEM 1: STUDENT PATRON SERVICES
    subgraph SUB_STUDENT ["1. Student Patron Services Subsystem"]
        direction TB
        UC_S_REG(["Claim / Register Account"]):::usecase
        UC_S_PROFILE(["Complete Profile Setup"]):::usecase
        UC_S_POLICY(["Accept Library Policies & Terms"]):::extcase
        UC_S_SEARCH(["Search Catalog & Filter"]):::usecase
        UC_S_AVAIL(["Check Availability & Copies"]):::extcase
        UC_S_FAV(["Manage Wishlist & Favorites"]):::usecase
        UC_S_CART(["Manage Borrowing Cart"]):::usecase
        UC_S_SUBMIT(["Submit Borrow Cart Request"]):::usecase
        UC_S_QRPASS(["Generate & View Digital QR Pass"]):::extcase
        UC_S_PERMIT(["Request Inter-Library Permission Letter<br/><i>(Required for Inter-Library Loans Only)</i>"]):::usecase
        UC_S_ELIG(["Verify Zero Fines & Good Standing"]):::extcase
        UC_S_LOANS(["Track Active Loans & Due Dates"]):::usecase
        UC_S_HISTORY(["View History & Fine Balance"]):::usecase
        UC_S_INBOX(["View Notifications & Inbox"]):::usecase
    end

    %% 4. SUBSYSTEM 2: CIRCULATION DESK SERVICES
    subgraph SUB_LIBRARIAN ["2. Circulation Desk Services Subsystem"]
        direction TB
        UC_L_REVIEW(["Review Pending Requests"]):::usecase
        UC_L_VERIFY(["Verify Patron Standing & Fines"]):::extcase
        UC_L_APPROVE(["Approve Borrow Request"]):::extcase
        UC_L_DISAPPROVE(["Disapprove Borrow Request"]):::extcase
        UC_L_SCAN(["Scan Student QR Pickup Pass"]):::usecase
        UC_L_BARCODE(["Verify Accession & Barcode"]):::extcase
        UC_L_RELEASE(["Release Book & Set Due Date PST"]):::usecase
        UC_L_RETURN(["Process Book Returns Check-in"]):::usecase
        UC_L_INSPECT(["Inspect Physical Book Condition"]):::extcase
        UC_L_AVAIL(["Mark Copy as Available"]):::usecase
        UC_L_OVERDUE(["Audit Overdue Loans List"]):::usecase
        UC_L_FINE(["Compute Daily Overdue Fine"]):::extcase
        UC_L_PAYMENT(["Collect Fine Payments & Receipt"]):::usecase
        UC_L_PERMIT(["Issue Inter-Library Permission Letter<br/><i>(Authorizes Visiting / Partner Loans)</i>"]):::usecase
        UC_L_CLEARANCE(["Issue Student Clearance Certificate"]):::extcase
        UC_L_PATRONS(["Search & List Patron Directory"]):::usecase
        UC_L_INBOX(["View Circulation Alerts & Inbox"]):::usecase
    end

    %% 5. SUBSYSTEM 3: ADMIN-LIBRARIAN GOVERNANCE
    subgraph SUB_ADMIN ["3. Admin-Librarian Governance Subsystem"]
        direction TB
        UC_A_CATALOG(["Master Books Catalog Management"]):::usecase
        UC_A_CSV(["Batch CSV Book Import"]):::usecase
        UC_A_COPIES(["Manage Copies, Barcodes & Shelf"]):::usecase
        UC_A_TAXONOMY(["Manage Categories, Authors, Pubs"]):::usecase
        UC_A_STAFF(["Register & Manage Staff Librarians"]):::usecase
        UC_A_POLICY(["Configure Loan Duration Policy"]):::usecase
        UC_A_SETTINGS(["Update System Config Key-Values"]):::extcase
        UC_A_FINERATE(["Set Daily Overdue Fine Rate"]):::usecase
        UC_A_DASH(["View System Analytics Dashboard"]):::usecase
        UC_A_LOGS(["Audit Security & Activity Logs"]):::usecase
        UC_A_REPORTS(["Export Delinquency & Loan Reports"]):::usecase
        UC_A_PROFILE(["Manage Institutional Profile"]):::usecase
    end

    
        %% 6. SUBSYSTEM 4: SUPER ADMIN PLATFORM GOVERNANCE
    subgraph SUB_SUPERADMIN ["4. Super Admin Platform Administration Subsystem"]
        direction TB
        UC_SA_TENANT(["Manage Institutions & Campuses"]):::usecase
        UC_SA_USERS(["Manage Users & Role Permissions"]):::usecase
        UC_SA_CATALOG(["Platform Catalog Oversight & Batch Import"]):::usecase
        UC_SA_BACKUP(["Database Backup & Disaster Recovery"]):::usecase
        UC_SA_INTEG(["Verify Backup Integrity & Encrypt"]):::extcase
        UC_SA_METRICS(["Cross-Campus Analytics & System Health"]):::usecase
        UC_SA_BROADCAST(["Broadcast System Announcements"]):::usecase
        UC_SA_SECURITY(["Configure Platform Security & Global Settings"]):::usecase
    end

    %% ALL 4 ROLES CONNECT TO LOGIN GATEWAY
    STUDENT --- UC_LOGIN
    LIBRARIAN --- UC_LOGIN
    ADMINLIB --- UC_LOGIN
    SUPERADMIN --- UC_LOGIN

    %% SUPER ADMIN ASSOCIATIONS
    SUPERADMIN --- UC_SA_TENANT
    SUPERADMIN --- UC_SA_USERS
    SUPERADMIN --- UC_SA_CATALOG
    SUPERADMIN --- UC_SA_BACKUP
    SUPERADMIN --- UC_SA_METRICS
    SUPERADMIN --- UC_SA_BROADCAST
    SUPERADMIN --- UC_SA_SECURITY

    UC_SA_BACKUP -.->|Include| UC_SA_INTEG

    %% INCLUDES
    UC_LOGIN -.->|Include| UC_SESSION
    UC_S_PROFILE -.->|Include| UC_S_POLICY
    UC_S_SEARCH -.->|Include| UC_S_AVAIL
    UC_S_PERMIT -.->|Include| UC_S_ELIG
    UC_L_REVIEW -.->|Include| UC_L_VERIFY
    UC_L_SCAN -.->|Include| UC_L_BARCODE
    UC_L_RETURN -.->|Include| UC_L_INSPECT
    UC_A_POLICY -.->|Include| UC_A_SETTINGS

    %% EXTENDS
    UC_S_QRPASS -.->|Extend| UC_S_SUBMIT
    UC_S_PERMIT -.->|Extend (Inter-Library Only)| UC_S_SUBMIT
    UC_L_APPROVE -.->|Extend| UC_L_REVIEW
    UC_L_DISAPPROVE -.->|Extend| UC_L_REVIEW
    UC_L_CLEARANCE -.->|Extend| UC_L_PERMIT
    UC_L_FINE -.->|Extend| UC_L_OVERDUE
```

---

## 3. Key Relationships Explained

### `<<Include>>` Dependencies (Mandatory Preconditions/Sub-processes)
- **Complete Profile Setup ➔ `<<Include>>` Accept Library Policies & Terms**: Students cannot finalize registration without accepting borrowing terms.
- **Search Catalog & Filter ➔ `<<Include>>` Check Availability & Copies**: Catalog search automatically queries physical copy availability.
- **Request Inter-Library Permission Letter ➔ `<<Include>>` Verify Zero Fines & Good Standing**: Prior to issuing permission to borrow from partner/visiting libraries, system enforces automated check that student has zero outstanding fines or overdue books.
- **Review Pending Requests ➔ `<<Include>>` Verify Patron Standing & Fines**: Librarians must verify patron debt/standing before taking action.
- **Scan Student QR Pickup Pass ➔ `<<Include>>` Verify Accession & Barcode**: Scanning verifies physical item barcode against the transaction.
- **Process Book Returns (Check-in) ➔ `<<Include>>` Inspect Physical Book Condition**: Check-in requires condition inspection.
- **Configure Loan Duration Policy ➔ `<<Include>>` Update System Config Key-Values**: Loan rule adjustment updates underlying configuration records.

### `<<Extend>>` Dependencies (Optional / Conditional Extensions)
- **Generate & View Digital QR Pass ➔ `<<Extend>>` Submit Borrow Cart Request**: QR pass is issued upon successful borrow submission.
- **Request Inter-Library Permission Letter ➔ `<<Extend>>` Submit Borrow Cart Request**: Strictly triggered **only when the student borrows from an inter-library / affiliated partner library**.
- **Issue Student Clearance Certificate ➔ `<<Extend>>` Issue Inter-Library Permission Letter**: Clearance certification for academic exit, semester completion, or cross-institutional research.
- **Approve Borrow Request ➔ `<<Extend>>` Review Pending Requests**: Conditional branch when patron qualifies.
- **Disapprove Borrow Request ➔ `<<Extend>>` Review Pending Requests**: Conditional branch when patron is ineligible or items unavailable.
- **Compute Daily Overdue Fine ➔ `<<Extend>>` Audit Overdue Loans List**: Activated when overdue days $> 0$.

### Subsystem 4: Super Admin Platform Administration Subsystem

| Use Case Name | Stereotype / Type | Codebase Component | Description |
|---|---|---|---|
| **Manage Institutions & Campuses** | Core Use Case | `SuperAdminSchools.jsx` | Creates, updates, and configures multi-tenant institutional school profiles and library branches. |
| **Manage Users & Role Permissions** | Core Use Case | `SuperAdminUsers.jsx` • `SuperAdminRoles.jsx` | Manages cross-campus user directory, role assignments (Admin, Librarian, Student), and RBAC capabilities. |
| **Platform Catalog Oversight & Batch Import** | Core Use Case | `SuperAdminBooks.jsx` • `BookImport.jsx` | Centralized catalog management across all campuses with CSV bulk book upload and duplicate resolution. |
| **Database Backup & Disaster Recovery** | Core Use Case | `SuperAdminBackupSettings.jsx` | Initiates full database snapshots, automated disaster recovery schedules, and backup restore points. |
| **Verify Backup Integrity & Encrypt** | `<<Include>>` | Cryptographic Engine | Automatically checks SHA-256 archive checksums and AES-256 encryption upon backup completion. |
| **Cross-Campus Analytics & System Health** | Core Use Case | `SuperAdminAnalytics.jsx` • `SuperAdminDashboard.jsx` | Live telemetry dashboard tracking active patron counts, loan volume across campuses, server resource usage, and query latency. |
| **Broadcast System Announcements** | Core Use Case | `SuperAdminInbox.jsx` | Publishes global announcements, emergency notices, and maintenance schedules across all school instances. |
| **Configure Platform Security & Global Settings** | Core Use Case | `SuperAdminSecuritySettings.jsx` • `SuperAdminSettings.jsx` | Platform-wide ceiling policies for borrowing quotas, API rate limits, session expiration, and 2FA enforcement. |
