# CHAPTER III
## RESEARCH DESIGN AND METHODOLOGY

This chapter describes the comprehensive research approach, system development framework, and evaluation techniques utilized in the creation and validation of **LibraLink: A Centralized Web-Based Library Management System for Book Resource Sharing across Selected Schools in Pampanga**. It details the research design, research locale, population and sampling technique, research instruments, validation procedures, data gathering procedures, statistical tools, software development methodology, and system development tools.

The methodology is engineered to support an inter-library resource sharing workflow that allows students to search for books across multiple campuses, verify real-time availability, receive partner institution suggestions, submit inter-library borrow requests, undergo home-institution librarian verification and approval, receive a secure Library Access Token, and gain authorized access to books in accordance with institutional sharing policies.

---

### 3.1 Research Design

The study employed a **developmental research design** combined with a **descriptive-evaluative approach**. Developmental research was chosen because the primary objective was to design, develop, test, and assess a functional software artifact—the LibraLink centralized web-based platform—engineered to solve resource scarcity and accessibility challenges experienced by students across participating school libraries.

The descriptive-evaluative technique was utilized to examine the existing challenges, workflows, and operational needs of students and library personnel regarding book discovery, cross-institutional borrowing, and catalog synchronization. The data obtained from this inquiry established the system specifications and functional requirements of LibraLink.

The overall operational flow established by the research design follows an eight-stage sequence:

Search → Availability Check → Partner School Suggestion → Borrow Request → Home Librarian Verification → Approval / Disapproval → Access Token Generation → Partner Library Verification & Book Access

1. **Local Availability:** When a searched book exists within the student's home institution, standard internal borrowing and reservation procedures apply.
2. **Inter-Library Resource Sharing:** When a book is unavailable locally but present in a partner institution's catalog, LibraLink highlights the holding library and facilitates an inter-library borrowing request.
3. **Dual Verification & Access Token:** The request is reviewed by the student's home librarian to ensure the student is in good standing. Upon approval, the system issues a verifiable digital **Library Access Token (Access Ticket)**. The student presents this token at the partner library, where the host librarian authenticates the token in the system before granting on-premise reading or controlled borrowing privileges based on inter-school agreements.

---

### 3.2 Research Locale

The study was strictly delimited to the province of Pampanga, Philippines, focusing exclusively on selected participating private higher education institutions within the province. The participating partner institutions for the pilot deployment, testing, and evaluation of the LibraLink system were:

1. **Guagua National College (GNC)** – Located in Guagua, Pampanga
2. **Santa Rita College (SRC)** – Located in Santa Rita, Pampanga

The geographic scope was explicitly confined to the province of Pampanga to establish a controlled, localized inter-library consortium. The geographic proximity of Guagua and Santa Rita within Pampanga makes cross-campus physical visits practical and convenient for students presenting their digital Library Access Tokens to read or borrow books on-site. The academic libraries of these two Pampanga-based institutions served as the primary setting for examining existing library constraints, gathering operational requirements, and validating the performance and acceptability of the LibraLink platform.

---

### 3.3 Population and Sampling Technique

The target population of the study comprised the primary stakeholders of the LibraLink system from Guagua National College and Santa Rita College. The participants were classified into two groups:
1. **Students:** The primary end-users who search for books, review holding suggestions, submit borrow requests, track request statuses, and redeem Library Access Tokens.
2. **Librarians and Library Administrators:** The institutional managers who oversee catalog records, evaluate and approve/disapprove inter-library requests, and verify access tokens presented by visiting students.

#### Sampling Technique: Purposive Sampling
The researchers employed **purposive sampling (judgmental sampling)** in selecting respondents. Purposive sampling is the most appropriate method because the study requires respondents who have direct experience with academic library services, understand book borrowing constraints, and possess the operational authority to assess library management workflows.

#### Inclusion Criteria:
* **Student Respondents:**
  * Must be currently enrolled students at Guagua National College or Santa Rita College within the following academic levels:
    * **College (Tertiary Level)**
    * **Senior High School**
    * **Junior High School**
  * Must possess an active student library record or prior experience utilizing the school library for research and coursework.
  * Must have access to an internet-capable device (smartphone, tablet, or computer) to test and navigate the LibraLink web application.
* **Librarian / Administrator Respondents:**
  * Must be an officially appointed head librarian, assistant librarian, or library staff member of GNC or SRC managing Junior High School, High School, or College library sections.
  * Must be actively involved in cataloging, circulation, student request verification, and resource acquisition.

#### Distribution of Respondents

The student respondents were purposively selected from the three (3) targeted academic levels—College, Senior High School, and Junior High School—along with the professional library staff of both institutions.

| Respondent Category | Guagua National College (GNC) | Santa Rita College (SRC) | Total ($N$) |
|:-------------------|:-----------------------------:|:------------------------:|:-----------:|
| Students           | 30                            | 30                       | 60          |
| Librarians / Staff | 2                             | 2                        | 4           |
| **Total**          | **32**                        | **32**                   | **64**      |

---

### 3.4 Research Instruments

The researchers constructed a **Researcher-Made Evaluation Questionnaire** based on the internationally recognized **ISO/IEC 25010 Software Product Quality Model**. The questionnaire was structured into distinct dimensions to capture a comprehensive assessment of the system:

1. **Part I: Demographic Profile** – Documents the participant's institutional affiliation (GNC or SRC) and user role (Student or Librarian/Administrator).
2. **Part II: System Quality Characteristics (ISO/IEC 25010)**:
   * **Functional Suitability:** Evaluates whether LibraLink effectively delivers its core capabilities, including centralized book discovery, multi-school inventory availability checks, automated partner recommendations, request submissions, dual-stage librarian approvals, and digital Library Access Token generation.
   * **Usability:** Assesses the clarity of the user interface, ease of navigation, readability, and overall user-friendliness across both mobile and desktop screens.
   * **Reliability:** Measures the consistency, data accuracy, fault tolerance, and error prevention of the system during transactions and data retrieval.
   * **Performance Efficiency:** Evaluates system responsiveness, transaction speed, and minimization of redundant manual steps in borrowing workflows.
3. **Part III: User Satisfaction and SDG 4 Impact** – Gauges overall stakeholder satisfaction and determines the extent to which LibraLink contributes to **United Nations Sustainable Development Goal 4 (SDG 4: Quality Education)** by democratizing access to academic books and learning materials across participating schools.

---

### 3.5 Validation Procedures

To ensure that the research instrument effectively measured the intended evaluation criteria, the questionnaire underwent rigorous pre-testing and validation procedures:

1. **Expert Review Panel:** The draft questionnaire was submitted to a panel composed of the thesis adviser, Information and Communications Technology (ICT) experts, and registered academic librarians.
2. **Evaluation Metrics:** The validators examined the instrument on the basis of clarity of instructions, relevance of indicators to research goals, technical alignment with ISO/IEC 25010 criteria, and linguistic appropriateness.
3. **Revision and Finalization:** Feedback, corrections, and contextual revisions suggested by the panel were incorporated into the final version of the instrument before deployment.

---

### 3.6 Data Gathering Procedures

The researchers followed a systematic protocol in collecting the required data:

```
[Phase 1: Administrative Permitting]
               │
               ▼
[Phase 2: Requirements Analysis & Library Process Mapping]
               │
               ▼
[Phase 3: System Development & Architectural Integration]
               │
               ▼
[Phase 4: Pilot Testing & User Simulation]
               │
               ▼
[Phase 5: Administration of Validated Questionnaire]
               │
               ▼
[Phase 6: Data Collation & Statistical Analysis]
```

1. **Securing Administrative Approvals:** Formal permission letters were transmitted to the school heads, deans, and chief librarians of Guagua National College and Santa Rita College to authorize the conduct of the study and user testing.
2. **Requirements Mapping:** The researchers audited existing library processes, record structures, and lending guidelines at both institutions to finalize technical specifications.
3. **System Development:** LibraLink was built, configured, and tested across iterative sprint cycles to realize the inter-library resource sharing architecture.
4. **Hands-on User Simulation:** Purposively selected students executed realistic scenarios: searching cross-institutional catalogs, filtering available items, submitting inter-library borrow requests, and monitoring approval statuses. Simultaneously, librarians evaluated request queues, performed student verifications, rendered approval/rejection decisions, and validated sample Access Tokens.
5. **Questionnaire Administration:** Immediately following the simulation, the validated evaluation questionnaire was administered to the participants using Google Forms and printed copies.
6. **Data Retrieval and Consolidation:** All responses were tallied, organized into data matrices, and prepared for statistical interpretation.

---

### 3.7 Statistical Treatment of Data

The quantitative data collected from the evaluation questionnaires were analyzed using descriptive statistical tools:

#### 1. Frequency and Percentage
**Formula:**  
P = (f / N) × 100

Where:
* P = Percentage
* f = Frequency of responses
* N = Total number of respondents

#### 2. Weighted Mean
Used to determine the central tendency and level of acceptance across each evaluation criterion (Functional Suitability, Usability, Reliability, Performance Efficiency, User Satisfaction, and SDG 4 contribution).

**Formula:**  
WM = Σ(f · x) / N

Where:
* WM = Weighted Mean
* f = Frequency of responses for a specific weight
* x = Assigned scale weight (1 to 4)
* N = Total number of respondents

#### 3. Four-Point Likert Scale and Interpretation Criteria
A four-point Likert scale was utilized to eliminate neutral ambiguity and provide a definitive measurement of system quality and user acceptance. The statistical boundaries for the weighted means are defined as follows:

| Scale Weight | Score Interval | Qualitative Interpretation | System Acceptability Level |
|:------------:|:--------------:|:--------------------------:|:--------------------------:|
|      4       |  3.26 – 4.00   |       Strongly Agree       |     Highly Acceptable      |
|      3       |  2.51 – 3.25   |           Agree            |         Acceptable         |
|      2       |  1.76 – 2.50   |          Disagree          |    Moderately Acceptable   |
|      1       |  1.00 – 1.75   |     Strongly Disagree      |       Not Acceptable       |

---

### 3.8 Software Development Methodology

The development of LibraLink was guided by the **Agile Software Development Methodology**. Agile was selected due to its iterative structure, flexibility in accommodating evolving library requirements, and continuous feedback integration from student and librarian stakeholders.

```
       ┌───────────────────────────────┐
       │         1. Planning           │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │    2. Requirements Analysis   │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │     3. Architectural Design   │
       └──────────────┬────────────────┘
                      ▼
 ┌───► ┌───────────────────────────────┐
 │     │    4. Incremental Coding      │
 │     └──────────────┬────────────────┘
 │                    ▼
 │     ┌───────────────────────────────┐
 │     │   5. Testing & Verification   │
 │     └──────────────┬────────────────┘
 │                    ▼
 │     ┌───────────────────────────────┐
 └──── │   6. Review & Refinement      │
       └──────────────┬────────────────┘
                      ▼
       ┌───────────────────────────────┐
       │  7. Deployment & Finalization │
       └───────────────────────────────┘
```

The system development process progressed through seven phases:

1. **Planning:** Defining the project scope, multi-institutional objectives, regulatory constraints, and resource-sharing policies between Guagua National College and Santa Rita College.
2. **Requirements Analysis:** Specifying functional needs including centralized indexing, multi-tenant school categorization, book availability flags, student account verification, and secure token schemas.
3. **Architectural and Interface Design:** Designing database Entity-Relationship Diagrams (ERDs), API endpoint contracts, secure role-based access rules, and responsive wireframes for student portals and librarian dashboards.
4. **Development:** Implementing software features in sprint iterations, developing responsive front-end components and integrating back-end services.
5. **Testing:** Performing continuous unit testing, end-to-end integration testing, token validation audits, and data integrity checks across institutional data boundaries.
6. **User Review and Refinement:** Demonstrating intermediate modules to participating librarians and student testers to identify UI friction points, workflow bottlenecks, and policy edge cases.
7. **Finalization and Deployment:** Applying code hardening, database optimizations, and deploying the stable release for formal pilot evaluation.

---

### 3.9 System Development Tools and Technology Stack

The technological foundation of the LibraLink platform comprises modern, robust, and open-source web technologies:

* **Front-End Architecture:**
  * **ReactJS:** A declarative component-based JavaScript library utilized to create dynamic, modular, and reactive user interfaces for student book exploration and administrative request queues.
  * **Vite:** A next-generation front-end tooling framework utilized for fast development compilation, hot module replacement (HMR), and optimized production builds.
  * **Tailwind CSS:** A utility-first CSS framework employed to construct clean, accessible, modern, and mobile-responsive UI layouts.
* **Back-End Architecture:**
  * **Node.js:** An event-driven, asynchronous JavaScript runtime environment powering server-side execution.
  * **Express.js:** A fast, minimalist web framework for Node.js used to architect RESTful APIs, manage session authentication, enforce borrowing business logic, and handle request state transitions.
* **Database and Data Persistence:**
  * **Supabase / PostgreSQL:** An open-source relational database management system providing real-time data synchronization, relational integrity for multi-school book records, and Row-Level Security (RLS) to enforce data privacy between participating institutions.
* **Development Environment and Quality Assurance:**
  * **Visual Studio Code:** The primary Integrated Development Environment (IDE) used for software coding and debugging.
  * **Git & GitHub:** Distributed version control system used for tracking code iterations, managing feature branches, and documenting changes.
  * **Postman:** API testing suite used to validate HTTP endpoints, request payloads, and response codes prior to client integration.
