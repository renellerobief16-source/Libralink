# LibraLink System Flow & Architecture Documentation

LibraLink is a multi-tenant, consortium-based Library Management and Inter-Library Loan (ILL) platform designed for colleges and universities. It enables institutions to manage their physical library catalogs while allowing students to discover, reserve, and borrow books across participating partner campuses through a secure digital access pass and QR code verification workflow.

---

## 1. System Architecture Overview

```mermaid
graph TD
    Client["Client Web Browser (React 19 + Vite + Tailwind CSS)"]
    
    subgraph "Frontend Layer (Single Page Application)"
        Router["React Router v6"]
        AuthContext["Auth State / LocalStorage Token"]
        NotifContext["NotificationContext (Polling & Realtime)"]
        Portals["Role-Based Portals"]
        
        Router --> Portals
        Portals --> SuperAdminPortal["/superadmin (Super Admin)"]
        Portals --> LibrarianAdminPortal["/librarian-admin (School Admin)"]
        Portals --> LibrarianPortal["/librarian (Librarian Staff)"]
        Portals --> StudentPortal["/studentpage (Student / Patron)"]
    end

    subgraph "Backend API Layer (Node.js + Express)"
        ExpressServer["Express Server (Port 5000 / API_ORIGIN)"]
        AuthMiddleware["JWT / Role-Based Auth Middleware"]
        RouteHandlers["Modular REST Endpoints"]
        
        ExpressServer --> AuthMiddleware
        AuthMiddleware --> RouteHandlers
        
        RouteHandlers --> AuthRoutes["/api/auth"]
        RouteHandlers --> BookRoutes["/api/books"]
        RouteHandlers --> BorrowReqRoutes["/api/borrow-requests"]
        RouteHandlers --> BorrowRoutes["/api/borrows"]
        RouteHandlers --> SchoolRoutes["/api/schools"]
        RouteHandlers --> FinesRoutes["/api/fines"]
        RouteHandlers --> NotifRoutes["/api/notifications"]
    end

    subgraph "Data & Persistence Layer"
        SupabaseClient["Supabase Client (Service Role & Anon)"]
        PostgreSQL["PostgreSQL Database"]
        Storage["Supabase / Local Uploads (Logos, IDs, Covers)"]
        
        RouteHandlers --> SupabaseClient
        SupabaseClient --> PostgreSQL
        SupabaseClient --> Storage
    end

    Client --> Router
    Portals --> ExpressServer
```

---

## 2. User Roles & Permission Matrix

| Role ID | Role Name | Primary Route | Scope & Responsibilities |
| :--- | :--- | :--- | :--- |
| **1** | **Super Admin** | `/superadmin` | Global consortium administrator. Registers schools, manages institutional subscriptions, oversees system-wide analytics, audits, and global user directory. |
| **2** | **Librarian Admin** | `/librarian-admin` | Head librarian / school administrator. Configures campus borrowing policies (loan periods, borrowing limits, daily overdue fines), manages staff accounts, audits activity logs, and oversees catalog inventory. |
| **3** | **Librarian** | `/librarian` | Front-desk library staff. Reviews and approves borrow requests, scans student QR access passes for check-in/check-out, inspects returned books, issues permission letters, and assesses overdue fines. |
| **4** | **Student** | `/studentpage` | Student / library patron. Discovers books across home and partner schools, adds books to borrow queue, submits borrow/visiting requests, tracks active loans, and presents digital QR access tokens. |

---

## 3. End-to-End Authentication & Onboarding Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Staff
    participant Frontend as React Client
    participant API as Backend Auth API
    participant DB as Database (Supabase)

    User->>Frontend: Enter credentials on /login
    Frontend->>API: POST /api/auth/login
    API->>DB: Query user by email & verify password (bcrypt)
    DB-->>API: User record (role_id, school_id, policy_accepted, etc.)
    API-->>Frontend: JWT token + User metadata
    
    Frontend->>Frontend: Persist token & profile to localStorage

    alt Role is Student (role_id = 4)
        alt Profile Incomplete or Policy NOT Accepted
            Frontend->>Frontend: Redirect to /student-onboarding or Show Profile Modal
            User->>Frontend: Upload profile photo, phone, recovery email & accept policy
            Frontend->>API: PUT /api/users/:id (update profile & policy_accepted=true)
            API->>DB: Update record
            Frontend->>Frontend: Route to /studentpage
        else Profile Complete & Policy Accepted
            Frontend->>Frontend: Route directly to /studentpage
        end
    else Role is Librarian (role_id = 3)
        Frontend->>Frontend: Route to /librarian
    else Role is Librarian Admin (role_id = 2)
        Frontend->>Frontend: Route to /librarian-admin
    else Role is Super Admin (role_id = 1)
        Frontend->>Frontend: Route to /superadmin
    end
```

---

## 4. Book Discovery & Catalog Search Flow

Students and staff navigate catalogs across both their home institution and partner libraries in the network.

```mermaid
flowchart TD
    Start([Student navigates to /studentpage]) --> SearchBar[Header Search Bar or /studentpage/search]
    SearchBar --> UserTypes[User enters title, author, category, or ISBN]
    UserTypes --> ScopeCheck{Select Catalog Scope}

    ScopeCheck -->|Home Library| FetchHome["Query Books for Home School (school_id)"]
    ScopeCheck -->|Partner Institutions| FetchPartner["Query Participating Consortium Libraries"]
    
    FetchHome --> StatusCheck["Evaluate Real-Time Status & Book Copies"]
    FetchPartner --> StatusCheck
    
    StatusCheck --> Display["Render Book Cards with Availability Badge"]
    
    Display --> ActionChoice{Student Action}
    ActionChoice -->|Add to Wishlist| Fav["Save to Favorites (LocalStorage / DB)"]
    ActionChoice -->|Borrow Book| Cart["Add to Student Borrowing Cart"]
```

---

## 5. Core Borrowing & Request Lifecycle

The borrowing flow distinguishes between **Home Library Borrowing** and **Inter-Library Partner School Visiting (Cross-School)**.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Portal as Student Portal
    participant API as Backend API
    actor Librarian
    participant Scanner as QR Verification / Desk

    Student->>Portal: Adds books to Borrowing Cart (Max limit enforced)
    Student->>Portal: Clicks Checkout -> Opens Borrowing Form
    Student->>Portal: Fills purpose, contact details, and selects request type (HOME / VISIT)
    Portal->>API: POST /api/borrow-requests
    
    Note over API: Validates active loans + pending count <= max_borrow_limit
    API->>API: Generates Request ID (e.g. LL-2026-XXXXXX)
    API->>API: Set status = 'pending' (QR token NOT yet active)
    API-->>Librarian: Dispatches notification to school staff
    API-->>Portal: 201 Created confirmation

    Librarian->>Librarian: Opens Librarian Portal (/librarian -> Borrow Requests)
    Librarian->>Librarian: Reviews student details, purpose, and requested titles
    
    alt Librarian Rejects
        Librarian->>API: PUT /api/borrow-requests/:id/reject with reason
        API-->>Student: Notification: Request Rejected
    else Librarian Approves
        Librarian->>API: PUT /api/borrow-requests/:id/approve
        Note over API: Generates secure cryptographic QR Token
        API->>API: Update status = 'approved' (or 'permission_ready' for cross-school)
        API-->>Student: Notification: Request Approved with Access Token
    end

    Note over Student,Portal: Student Home Dashboard displays "Active Access Pass" with dynamic QR Code
    
    Student->>Scanner: Visits library circulation desk and presents QR Code
    Librarian->>Scanner: Scans QR code via Librarian QR Scanner (/librarian/qr-scanner)
    Scanner->>API: POST /api/borrows/verify-qr with QR Token
    API-->>Scanner: Returns validated Student Info, Book Details, and Request ID
    
    Librarian->>Scanner: Confirms physical handover & assigns book accession number
    Scanner->>API: POST /api/borrows/checkout
    API->>API: Creates record in borrow_transactions (status = 'active')
    API->>API: Updates book_copies status = 'borrowed'
    API->>API: Updates borrow_requests status = 'completed'
    API-->>Student: Notification: Book checked out with Due Date
```

---

## 6. Digital QR Access Token Pass & Verification

```mermaid
graph LR
    subgraph Student Side
        Req[Borrow Request Approved] --> Gen[Cryptographic Token Generated]
        Gen --> PassCard["Active Library Access Pass (Hero Banner / Modal)"]
        PassCard --> RenderQR["Render QR Code (Student Number, Request ID, Hash)"]
    end

    subgraph Library Circulation Desk
        RenderQR -.->|Student presents screen| Camera["Librarian Webcam / Scanner Device"]
        Camera --> ScanProcess["LibrarianQRScanner Component"]
        ScanProcess --> VerifyCall["Verify with Backend API"]
        VerifyCall --> CheckAuth{"Valid Token & School Match?"}
        CheckAuth -->|Yes| CheckoutScreen["Display Checkout Confirmation & Student Photo"]
        CheckAuth -->|No / Expired| RejectAlert["Display Error / Invalid Token Warning"]
        CheckoutScreen --> CompleteCheckout["Confirm Physical Release -> Active Loan Created"]
    end
```

---

## 7. Return, Overdue Detection & Fine Calculation Flow

```mermaid
flowchart TD
    ActiveLoan["Active Borrow Transaction (borrow_transactions)"] --> TimePasses[Time Passes toward Due Date]
    TimePasses --> CheckDue{Due Date Reached?}

    CheckDue -->|Before Due Date| StudentAction{Student Action}
    StudentAction -->|Request Renewal| RenewalCheck{"Renewal Limit Reached?"}
    RenewalCheck -->|No| ExtendDue["Extend due_date & increment renewal_count"]
    RenewalCheck -->|Yes| CannotRenew["Renewal Denied (Must Return Book)"]
    
    StudentAction -->|Returns Book to Desk| DeskReturn["Librarian Inspects Book at Desk"]

    CheckDue -->|Past Due Date| OverdueDaemon["Automated Overdue Check / Cron Service"]
    OverdueDaemon --> MarkOverdue["Flag transaction as Overdue"]
    MarkOverdue --> CalcDaily["Calculate Days Overdue × Daily Fine Rate"]
    CalcDaily --> FineRecord["Create / Update Record in fines table"]
    FineRecord --> StudentAlert["Send Overdue Notification to Student Inbox"]
    FineRecord --> BlockBorrowing["Flag Account: Restrict New Borrowing Requests"]

    DeskReturn --> InspectCondition{"Book Condition Assessment"}
    InspectCondition -->|Good Condition| ClearReturn["Mark borrow_transactions status = 'returned'"]
    InspectCondition -->|Damaged / Lost| AssessDamage["Assess Replacement / Repair Fine"]

    ClearReturn --> SettleFines{"Outstanding Fines Exist?"}
    AssessDamage --> SettleFines
    
    SettleFines -->|Yes| PayFines["Student settles fines at Cashier / Library"]
    PayFines --> ReleaseHold["Remove restriction from Student Account"]
    SettleFines -->|No| CloseLoan["Book copy returned to 'available' shelf inventory"]
    ReleaseHold --> CloseLoan
```

---

## 8. Inter-Library Loan (Cross-School Consortium) Flow

When a student from **School A (Home)** wants to access or borrow a book physically located in **School B (Partner)**:

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (School A)
    participant HomeLib as School A Library Portal
    participant API as Central Backend
    actor PartnerLib as School B Librarian

    Student->>HomeLib: Browses Partner School B catalog
    Student->>HomeLib: Selects "Cross-School Visit Request" for book in School B
    HomeLib->>API: POST /api/borrow-requests (request_type: 'VISIT', partner_school_id: School B)
    API-->>HomeLib: Request pending approval

    HomeLib->>API: School A Librarian endorses & approves request
    API->>API: Generates Inter-Library Permission Letter & QR Visiting Pass
    API-->>PartnerLib: Partner School B notified of incoming visiting student
    API-->>Student: Permission Letter PDF / Digital Pass generated

    Student->>PartnerLib: Arrives at School B campus with Visiting Pass & School ID
    PartnerLib->>PartnerLib: Scans QR code with LibrarianQRScanner
    PartnerLib->>PartnerLib: Verifies student identity and permission letter authenticity
    PartnerLib->>API: Approves on-site room-use or cross-institutional borrowing
```

---

## 9. Database State Machine Reference

### 9.1 Borrow Request Lifecycle (`borrow_requests.status`)
```
[pending]
   │
   ├───> [rejected] (Librarian denies request with reason)
   ├───> [cancelled] (Student cancels before processing)
   │
   └───> [approved] / [permission_ready] (QR token created)
            │
            └───> [ready_for_pickup] (Librarian pulls book from shelf)
                     │
                     └───> [completed] (Physical book scanned & handed over)
```

### 9.2 Borrow Transaction Lifecycle (`borrow_transactions.status`)
```
[active]
   │
   ├───> [renewed] (Due date extended by policy allowance)
   │
   ├───> [returned] (Returned on or before due date in good condition)
   │
   ├───> [overdue] (Due date elapsed without return -> fines accumulate)
   │        │
   │        └───> [returned] (Returned late -> fines must be cleared)
   │
   └───> [lost] / [damaged] (Replacement assessment required)
```

### 9.3 Physical Book Copy Lifecycle (`book_copies.status`)
```
[available] ──(Checkout)──> [borrowed] ──(Check-in)──> [available]
     │                                                     ▲
     └──(Marked)──> [reserved] ──(Cancelled)───────────────┘
     │
     └──(Maintenance/Damage)──> [maintenance] / [lost]
```

---

## 10. Key API Route Reference

| Endpoint | Method | Role Allowed | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates user credentials, returns JWT and user metadata. |
| `/api/auth/signout` | `POST` | Authenticated | Logs out current session. |
| `/api/books/school` | `GET` | Authenticated | Retrieves catalog books filtered by `school_id`. |
| `/api/borrow-requests` | `POST` | Student | Creates new borrowing or cross-school visiting request. |
| `/api/borrow-requests` | `GET` | Staff / Student | Retrieves pending, approved, or historic requests. |
| `/api/borrow-requests/:id/approve` | `PUT` | Librarian Staff | Approves request and generates secure QR token. |
| `/api/borrow-requests/:id/reject` | `PUT` | Librarian Staff | Rejects request with reason. |
| `/api/borrows/verify-qr` | `POST` | Librarian Staff | Decodes and validates student QR access token. |
| `/api/borrows/checkout` | `POST` | Librarian Staff | Finalizes physical book checkout, assigns copy, creates active loan. |
| `/api/borrows/return` | `POST` | Librarian Staff | Records book return, inspects condition, computes final overdue fine. |
| `/api/fines/student/:id` | `GET` | Student / Staff | Retrieves unpaid and historic fines for a student. |
| `/api/notifications` | `GET` | Authenticated | Retrieves unread and recent system/action notifications. |
| `/api/schools` | `GET` | Authenticated | Lists participating consortium partner schools. |

---

## 11. Summary of Client Portals & File Mapping

- **Student Portal**:
  - Main container: `src/components/portals/student/StudentPortal.jsx`
  - Navigation & Layout: `src/components/collegeTabs/StudentTabs/StudentDashboardComponents.jsx`
  - Header search: `src/components/collegeTabs/StudentTabs/StudentHeaderSearch.jsx`
  - Catalog search: `src/components/collegeTabs/StudentTabs/StudentSearch.jsx`
  - Cart & Checkout: `src/components/collegeTabs/StudentTabs/StudentBorrowingList.jsx` & `StudentBorrowingForm.jsx`
  - Access Token Pass: `src/components/collegeTabs/StudentTabs/QRCodeDisplay.jsx`
- **Librarian Staff Portal**:
  - Main container: `src/components/portals/admin/LibrarianPortal.jsx`
  - Queue management: `src/components/collegeTabs/LibrarianTabs/LibrarianBorrowRequests.jsx`
  - Circulation QR Scanner: `src/components/collegeTabs/LibrarianTabs/LibrarianQRScanner.jsx`
  - Permission letter issuance: `src/components/collegeTabs/LibrarianTabs/LibrarianPermissionLetter.jsx`
- **Librarian Admin Portal**:
  - Main container: `src/components/portals/admin/LibrarianAdminPortal.jsx`
  - Fines & Policies: `src/components/collegeTabs/LibrarianAdminTabs/LibrarianAdminSettings.jsx`
- **Super Admin Portal**:
  - Main container: `src/components/portals/admin/Admin.jsx`
