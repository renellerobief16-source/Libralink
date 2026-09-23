# LibraLink - UML Use Case Diagram

This diagram matches the exact UML design style from your reference image:
- **Stick-figure Actors** on the left with direct solid association lines
- **Sky-Blue Ovals (`#68C5F7`)** with dark borders for Use Cases
- **Dashed arrows (`-.->`) with `<<Include>>`** pointing to required sub-tasks
- **Dashed arrows (`-.->`) with `<<Extend>>`** pointing back to base use cases (Extension Points)
- **3-tier column layout**: Actors ➔ Base Use Cases ➔ Include / Extend Use Cases

---

## 1. Mermaid.ai Code (Copy & Paste directly)

```mermaid
flowchart LR
    %% ==========================================
    %% COLOR & SHAPE STYLING (Matching Reference Image)
    %% ==========================================
    classDef actor fill:#E0F2FE,stroke:#0284C7,stroke-width:2px,color:#0F172A,font-weight:bold;
    classDef usecase fill:#68C5F7,stroke:#000000,stroke-width:1.5px,color:#000000,font-weight:bold;
    classDef extcase fill:#BAE6FD,stroke:#0284C7,stroke-width:1.5px,color:#000000,font-weight:bold;

    %% ==========================================
    %% 1. ACTORS (Column 1 - Left)
    %% ==========================================
    subgraph ACTORS ["Actors"]
        direction TB
        STUDENT["🧍<br>Student"]:::actor
        HOMELIB["🧍<br>Home-School<br>Librarian"]:::actor
        PARTNERLIB["🧍<br>Partner-School<br>Librarian"]:::actor
        ADMIN["🧍<br>Administrator"]:::actor
    end

    %% ==========================================
    %% 2. BASE USE CASES (Column 2 - Center)
    %% ==========================================
    subgraph BASE_CASES ["Core Use Cases"]
        direction TB
        UC_REG(["Register an Account"]):::usecase
        UC_LOGIN(["Log-in"]):::usecase
        UC_SEARCH(["Search for Books"]):::usecase
        UC_SUBMIT(["Submit a Request"]):::usecase
        UC_MONITOR(["Monitor Request Status"]):::usecase
        UC_REVIEW(["Review Student Requests<br>------------------<br><i>extension points</i><br>Approve / Disapprove"]):::usecase
        UC_VERIFY_APP(["Verify Approved Requests"]):::usecase
        UC_PROCESS_ACC(["Process Applicable Access Requests"]):::usecase
        UC_MANAGE_USERS(["Manage Users"]):::usecase
        UC_MANAGE_SCHOOLS(["Manage Participating Schools"]):::usecase
        UC_MANAGE_RECORDS(["Manage System Records"]):::usecase
    end

    %% ==========================================
    %% 3. INCLUDE & EXTEND USE CASES (Column 3 - Right)
    %% ==========================================
    subgraph SUB_CASES ["Include & Extend Points"]
        direction TB
        UC_AVAIL(["Check Book Availability"]):::extcase
        UC_SUGG(["View Partner-School Suggestions"]):::extcase
        UC_ACCESS(["Access Approved Resources"]):::extcase
        UC_VERIFY_INFO(["Verify Submitted Information"]):::extcase
        UC_APPROVE(["Approve Requests"]):::extcase
        UC_DISAPPROVE(["Disapprove Requests"]):::extcase
        UC_CONFIRM_AVAIL(["Confirm Resource Availability"]):::extcase
    end

    %% ==========================================
    %% ACTOR ASSOCIATIONS (Solid Lines)
    %% ==========================================
    
    %% Student Associations
    STUDENT --- UC_REG
    STUDENT --- UC_LOGIN
    STUDENT --- UC_SEARCH
    STUDENT --- UC_SUBMIT
    STUDENT --- UC_MONITOR

    %% Home-School Librarian Associations
    HOMELIB --- UC_LOGIN
    HOMELIB --- UC_REVIEW
    HOMELIB --- UC_MONITOR

    %% Partner-School Librarian Associations
    PARTNERLIB --- UC_LOGIN
    PARTNERLIB --- UC_VERIFY_APP
    PARTNERLIB --- UC_PROCESS_ACC

    %% Administrator Associations
    ADMIN --- UC_LOGIN
    ADMIN --- UC_MANAGE_USERS
    ADMIN --- UC_MANAGE_SCHOOLS
    ADMIN --- UC_MANAGE_RECORDS

    %% ==========================================
    %% <<INCLUDE>> RELATIONSHIPS (Dashed Arrows to Target)
    %% ==========================================
    UC_SEARCH -.->|"<<Include>>"| UC_AVAIL
    UC_SEARCH -.->|"<<Include>>"| UC_SUGG
    UC_SUBMIT -.->|"<<Include>>"| UC_AVAIL
    UC_REVIEW -.->|"<<Include>>"| UC_VERIFY_INFO
    UC_VERIFY_APP -.->|"<<Include>>"| UC_CONFIRM_AVAIL

    %% ==========================================
    %% <<EXTEND>> RELATIONSHIPS (Dashed Arrows from Extension to Base)
    %% ==========================================
    UC_ACCESS -.->|"<<Extend>>"| UC_SUBMIT
    UC_APPROVE -.->|"<<Extend>>"| UC_REVIEW
    UC_DISAPPROVE -.->|"<<Extend>>"| UC_REVIEW
```

---

## 2. UML Relationship Rules Applied

1. **Association (Solid Line `---`)**: Direct connection showing which actor triggers or interacts with a use case.
2. **`<<Include>>` (`-.->|"<<Include>>"|`)**: The base use case unconditionally executes the included use case:
   - When a Student performs **Search for Books**, it automatically includes **Check Book Availability** and **View Partner-School Suggestions**.
   - When a Student performs **Submit a Request**, it unconditionally includes **Check Book Availability**.
   - When a Home-School Librarian performs **Review Student Requests**, it includes **Verify Submitted Information**.
   - When a Partner-School Librarian performs **Verify Approved Requests**, it includes **Confirm Resource Availability**.
3. **`<<Extend>>` (`-.->|"<<Extend>>"|`)**: Conditional branch extending the base use case under specific conditions:
   - **Access Approved Resources** extends **Submit a Request** (only after formal approval and issuance of access pass).
   - **Approve Requests** and **Disapprove Requests** extend **Review Student Requests** based on librarian decision.
