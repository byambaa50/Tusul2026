# CashmereTrace MN — Backend Architecture and Implementation Plan

**Project:** Монгол ноолуурын гарал үүсэл, чанарын мэдээллийг бүртгэх, хянах веб программ
**Document:** Backend architecture and implementation plan
**Status:** Plan only. No backend code, migration, or frontend change is made by this document.
**Source PDF:** `Төсөл-2026 (11).pdf` (164 pages). Page numbers below are the PDF page numbers. They match the printed footer page numbers.
**Stack:** Node.js, Express.js, TypeScript, Supabase PostgreSQL, Supabase Auth, Supabase Storage, REST `/api/v1`.
**Existing application:** `cashmeretrace/` is a Next.js presentation layer with mock data. This plan supplies the API that those screens need. It does not rebuild the screens.

> **Phase 1.1 implementation note (2026-11-09):** The Phase 1 database is implemented. Where this plan's names, roles, or permissions differ from the applied schema, the reconciliation notes below and `docs/PHASE1_1_DECISIONS.md` take precedence. This document remains a plan; no Phase 2 auth UI, middleware, or API is implemented.

This plan follows chapter 2 requirements (functional, non-functional, business rules, use cases) as the approved scope. Chapter 3.2 is the PDF’s own PostgreSQL data dictionary and is used for columns, keys, and constraints. Where chapter 2 and chapter 3 disagree, or where the PDF says a rule is only a proposal, the item is marked **UNCERTAIN** and is not treated as an approved business rule.

Technology note: chapter 3.1 (pp. 117–119) still names MySQL. Chapter 3.2 (p. 120) replaces that choice with Supabase PostgreSQL. This plan follows chapter 3.2 and the stack named for this task. Passwords are stored by Supabase Auth, which satisfies the hash requirement, so `profiles` does not contain `password_hash`.

Out of scope, as stated by the PDF version plan (p. 18) and chapter limits: payment, blockchain, laboratory API, government API, native mobile application, AI or ML grading, and invented laboratory pass/fail thresholds.

---

## 1. Requirement analysis

### 1.1 How to read status

| Status | Meaning |
| --- | --- |
| Approved — Must | Required in version 1 (MoSCoW table, pp. 14–17; version plan, p. 18). |
| Approved — Should | In version 1* if time allows (p. 18). Still an approved requirement, not an invention. |
| Approved — Could | Written in the NFR table, not required for version 1. |
| Design specification | Chapter 3.2/3.3 schema and layering. Used to implement approved rules. |
| Proposed / unapproved | Table 109 (pp. 109–110) and items the PDF marks as unconfirmed. |
| UNCERTAIN | The PDF does not define the value. The implementation must not invent it. |

### 1.2 Actors and roles

Approved actors who use the system directly are in table 19 (p. 33) and table 29 (p. 40).

| Actor | Mongolian name | Login | PDF access summary | Pages |
| --- | --- | --- | --- | --- |
| Supplier | Нийлүүлэгч (малчин, хоршоо, аж ахуйн нэгж) | Required | Own records only | 13, 32–33, 40 |
| Registration clerk | Бүртгэлийн ажилтан | Required | Register and correct suppliers and batches; generate batch numbers and QR; trace origin | 32–33, 40 |
| Quality staff | Чанарын ажилтан | Required | Enter laboratory results, compare history, choose public QR fields. Search batches. Does not edit batch master data | 32–33, 40–42 |
| Management | Удирдлага | Required | Read statistics, regional comparison, and reports. No data entry or correction | 32–33, 40, 46 |
| Administrator | Админ | Required | Create users, assign roles, approve or reject suppliers, settings, audit review | 32–33, 36–37, 40 |
| Public user / buyer | Энгийн хэрэглэгч, худалдан авагч, экспортлогч | None | Read only the fields published for one QR token | 32–33, 37, 40 |

Stakeholders that are **not** system actors (pp. 32–33, 42, 63):

- Боловсруулах байгууллага works through clerk and quality staff.
- Лаборатори does not log in. Quality staff types the laboratory answer (BR-04, p. 45).

Database role codes in this plan, from the PDF data dictionary (p. 123):

`SUPPLIER`, `REGISTRATION_STAFF`, `QUALITY_STAFF`, `MANAGEMENT`, `ADMIN`.

The current frontend uses `supplier`, `clerk`, `quality`, `management`, `admin`. The API maps `clerk` to `REGISTRATION_STAFF`. This plan originally stored the PDF codes.

**Phase 1.1 note:** the applied database stores the lowercase canonical values `supplier`, `registration_clerk`, `quality_staff`, `management`, and `admin` in `profiles.app_role`. The API maps frontend `clerk` to `registration_clerk` and frontend `quality` to `quality_staff`. The shared constant is `backend/src/types/roles.ts`.

### 1.3 Approved functional requirements

Version 1 Must requirements are R-01–R-03, R-05–R-10, R-12, R-13, R-17, R-19, R-20, R-23–R-25 (p. 18). Version 1* Should requirements are R-04, R-11, R-14–R-16, R-18, R-21, R-22 (p. 18).

The detailed FR identifiers below are from tables 21–26 (pp. 34–37).

#### Supplier — table 21 (pp. 34–35)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-1.1 | Supplier registers. The system checks required fields and creates the account as «баталгаажуулалт хүлээгдэж буй». | Must | 35, 33 |
| FR-1.2 | Supplier logs in with email and password. An unapproved registration cannot log in. | Must | 35 |
| FR-1.3 | Supplier records the quantity of cashmere supplied. | Must | 35 |
| FR-1.4 | Supplier records origin: place of origin and supplier link. Detailed attributes are aimag, sum, and livestock count (p. 33, p. 64). | Must | 33, 35, 64 |
| FR-1.5 | Supplier sees quality indicators of own batches only. | Should | 35 |

#### Registration clerk — table 22 (p. 35)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-2.1 | Clerk logs in and receives the clerk role. | Must | 35 |
| FR-2.2 | Clerk registers a supplier. | Must | 35 |
| FR-2.3 | Clerk selects a supplier and registers a raw-cashmere batch. | Must | 35 |
| FR-2.4 | The system generates a unique batch number. | Must | 35 |
| FR-2.5 | A duplicate batch number is rejected with an error. | Must | 35 |
| FR-2.6 | Clerk corrects supplier and batch data. The change is written to the audit log. | Must | 35 |
| FR-2.7 | Clerk searches by batch number and related data, and reads the record. | Must | 35 |
| FR-2.8 | Clerk generates a QR code linked to a registered batch. | Must | 35 |
| FR-2.9 | Clerk traces the selected batch to its supplier and origin. | Must | 35 |

#### Quality staff — table 23 (p. 36)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-3.1 | Quality staff logs in and receives the quality role. | Must | 36 |
| FR-3.2 | Quality staff finds a batch by batch number. | Must | 36 |
| FR-3.3 | Quality staff stores fineness (нарийн ширхэг), clean yield (цэвэр ноолуурын гарц), admixture (хольц), and the laboratory result against one batch. | Must | 36 |
| FR-3.4 | Quality staff compares a batch’s result with previous results. | Should | 36 |
| FR-3.5 | Quality staff chooses which information is public on the QR page. Unselected information is hidden. | Must | 36 |

#### Management — table 24 (p. 36)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-4.1 | Management logs in with read-only authority. | Must | 36 |
| FR-4.2 | Management reviews supply information. | Should | 36 |
| FR-4.3 | Management views quality statistics. | Should | 36 |
| FR-4.4 | Management compares supply and quality by aimag and sum. | Should | 36 |
| FR-4.5 | Management produces a supply and quality report. | Should | 36 |
| FR-4.6 | Management downloads that report as a file. | Should | 36 |

#### Administrator — table 25 (pp. 36–37)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-5.1 | Administrator logs in with administrative authority. | Must | 36 |
| FR-5.2 | Administrator creates and manages users. | Must | 36 |
| FR-5.3 | Administrator assigns and changes RBAC roles. | Must | 36 |
| FR-5.4 | Administrator changes system settings. | Should | 36 |
| FR-5.5 | Administrator reads the audit log (who, when, what). | Should | 37 |
| FR-5.6 | Administrator approves or rejects a pending supplier. An approved supplier can log in. | Must | 37 |

#### Public user — table 26 (p. 37)

| ID | Requirement | MoSCoW | Pages |
| --- | --- | --- | --- |
| FR-6.1 | Without logging in, the public user scans a QR code and sees only the permitted origin and quality information in under 10 seconds. | Must | 37 |

Conflict decisions that are approved (table 10, pp. 17–18):

- Supplier forms stay short. Detailed quality data is entered by quality staff (K-01).
- Public QR content is chosen by quality staff and is hidden by default (K-02).
- Version 1 reports are the basic supply/quality report. Extra report types wait (K-03).
- Clerks may correct data, and every correction is audited and role-limited (K-04).
- Laboratory answers are typed by an authorized user. A laboratory API is out of scope (K-05, p. 18).

### 1.4 Approved non-functional requirements

Table 27 (pp. 37–38).

| ID | Category | Rule | Measure | MoSCoW | Pages |
| --- | --- | --- | --- | --- | --- |
| NFR-1 | Performance | QR result appears within 10 seconds. | ≤ 10 s | Must | 37 |
| NFR-2 | Performance | Batch search returns within 2 seconds. | ≤ 2 s | Should | 37 |
| NFR-3 | Performance | The main page loads on a slow rural link. | ≤ 5 s | Should | 37 |
| NFR-4 | Performance | Fifty concurrent users. | response ≤ 3 s | Should | 37 |
| NFR-5 | Performance | Aggregated reports. | ≤ 10 s | Should | 37 |
| NFR-6 | Security | Passwords are hashed (bcrypt or Argon2). Plaintext is never stored. | 0 plaintext passwords | Must | 38 |
| NFR-7 | Security | All client–server traffic uses HTTPS. | 100% | Must | 38 |
| NFR-8 | Security | Login token expires. | lifetime ≤ 8 hours | Should | 38 |
| NFR-9 | Security | RBAC rejects every unauthorized request. | 100% | Must | 38 |
| NFR-10 | Security | The public QR page shows only fields selected by quality staff. | 0 secret disclosures | Must | 38 |
| NFR-11 | Security | Repeated bad passwords lock the account. | lock after 5 failures | Should | 38 |
| NFR-12 | Security | Server-side validation against SQL injection and XSS. | known tests blocked | Must | 38 |
| NFR-13 | Privacy | Personal data is collected for the stated purpose and is absent from the public page. | 0 personal fields on the public page | Must | 38 |
| NFR-14 | Audit | Data changes and logins are recorded (who, when, what). | 100% of changes | Should | 38 |
| NFR-15 | Integrity | Batch numbers do not duplicate. Primary and foreign keys hold. | 0 duplicates, 0 orphan rows | Must | 38 |
| NFR-16 | Reliability | Database backup. | once per day | Should | 38 |
| NFR-17 | Availability | Monthly availability excluding planned maintenance. | ≥ 99% | Could | 38 |
| NFR-18 | Usability | A new user completes the basic action without a manual. | ≤ 5 min, 90% of testers | Should | 38 |
| NFR-19 | Usability | Mongolian Cyrillic UI, UTF-8. | 100% of menus and messages | Must | 38 |
| NFR-20 | Usability | Errors tell the user how to correct the input. | every error has guidance | Should | 38 |
| NFR-21 | Usability | Main actions are short. | ≤ 3 steps | Should | 38 |
| NFR-22 | Compatibility | Phone, tablet, and computer layouts. | 3 screen classes | Should | 38 |
| NFR-23 | Compatibility | Chrome, Firefox, and Edge, last two versions. | listed browsers | Could | 38 |
| NFR-24 | Compatibility | Generated QR codes scan with a phone camera. | ≥ 95% on tested devices | Must | 38 |

NFR-3, NFR-18, NFR-19, NFR-21, NFR-22, and NFR-23 are presentation requirements. The backend supports them with UTF-8 JSON, stable error codes, and a small public payload. It does not reimplement the Next.js layout.

### 1.5 Approved business rules

Table 32 (pp. 45–46). These are the approved rules.

| ID | Rule | Source FR | Pages |
| --- | --- | --- | --- |
| BR-01 | A batch number is unique. A duplicate is not stored. | FR-2.4, FR-2.5 | 45 |
| BR-02 | Every batch belongs to exactly one supplier. | FR-2.3 | 45 |
| BR-03 | Every test result belongs to exactly one batch. | FR-3.3 | 45 |
| BR-04 | The system does not perform the laboratory test. Quality staff enters the laboratory answer. | FR-3.3 | 45 |
| BR-05 | A supplier writes and reads only that supplier’s own information. | FR-1.3, FR-1.4, FR-1.5 | 45 |
| BR-06 | Correcting records and tracing origin is open to the clerk. Quality staff only searches batches. | FR-2.6, FR-2.9, FR-3.2 | 46 |
| BR-07 | Management is read-only. | FR-4.2–FR-4.5 | 46 |
| BR-08 | Public QR fields are hidden by default. Only fields selected by quality staff are shown. | FR-3.5, FR-6.1 | 46 |
| BR-09 | QR verification does not require login, and the response stays within 10 seconds. | FR-6.1, NFR-1 | 46 |
| BR-10 | Every data change records who, when, and what in the audit log. | FR-2.6, FR-5.5, NFR-14 | 46 |
| BR-11 | Five failed logins temporarily lock the user. | FR-1.2, NFR-11 | 46 |
| BR-12 | A self-registered supplier cannot log in until an administrator approves. A supplier registered by a clerk is also created `PENDING` and becomes usable only after administrator approval. | FR-1.1, FR-5.6 | 46 |
| BR-13 | One supplier has one registration. A duplicate registration is not approved. | FR-1.1, FR-2.2, FR-5.6 | 46 |

Chapter 3.2 (p. 132) adds design labels that elaborate the schema. They are specifications in the PDF, and they are listed separately so they are not confused with table 32.

| Design label | What the PDF specifies | Treatment | Page |
| --- | --- | --- | --- |
| BR-02A | A batch may be linked to many supply records and a supply record may be allocated to many batches through `BATCH_SUPPLY_LINKS`. The link’s supplier must match the batch supplier. Allocated weight is checked inside a transaction. | Included as a table because the data dictionary defines it. The ceiling of the weight check is **UNCERTAIN** (the PDF does not say whether the sum must not exceed the supply quantity, the batch quantity, or both). | 132 |
| BR-03A | Supplier, supply, and batch locations use the sum lookup, and the aimag comes from that sum. | Approved by FR-1.4 and the data dictionary. | 121, 132 |
| BR-10A | Updates store `old_values` and `new_values`. Passwords and tokens are never stored in the audit row. | Implements BR-10. | 129, 132 |
| BR-11A | Lock timestamp columns. The PDF says the unlock duration and whether an administrator may unlock early must be confirmed by the customer. The duration is not in the document. | **Proposed.** Do not invent a duration or an admin unlock policy. | 132 |
| BR-13A | Optional `identity_type` + `identity_code` unique pair. Which national or organization code is used is not chosen. | Column pair is in the dictionary. The code system is **UNCERTAIN**. | 125, 132 |

### 1.6 Proposed and unapproved rules

Table 109 (pp. 109–110) says these are modeling proposals, not source requirements, and become rules only after the customer confirms them. The state-machine text calls them BR-14–BR-16 (p. 111) without giving those identifiers in the proposal table itself.

| Gap | PDF proposal | Decision for this plan | Pages |
| --- | --- | --- | --- |
| Lock release | After an unspecified duration the account becomes active again, and an administrator may unlock it earlier. | Store `locked_at`. Leave `locked_until` unused until a duration is approved. Do not add an unlock endpoint as an approved feature. | 105, 109–110, 132 |
| Rejected supplier | Whether a rejected supplier may edit and reapply, or whether «Татгалзсан» is final, is undefined. | Store the rejected state and the rejection reason (the state table says the reason is recorded, p. 105). Do not implement reapplication. | 105, 109–110 |
| QR revocation | Add a «Хүчингүй» state and let a clerk revoke a QR. No use case defines the action. | QR statuses remain `CREATED` and `READY` only (p. 128). Unknown tokens return “not found”. | 61, 109–110, 128 |
| Batch-number format | The format is explicitly unconfirmed (RUP row R-06, p. 16, and p. 109). | Generate a unique number with a database counter. The display pattern is a setting only after it is confirmed. The demo string `MN-YYYY-000001` used by the current frontend is **not** an approved PDF rule. | 16, 109 |

### 1.7 Use cases

Thirteen use cases cover all 32 functional requirements (traceability matrix, pp. 61–62).

| Use case | Name | Primary actor | MoSCoW | FR | Pages |
| --- | --- | --- | --- | --- | --- |
| UC-01 | Бүртгүүлэх | Supplier | Must | FR-1.1 | 44, 46–47 |
| UC-02 | Нийлүүлэлтийн хэмжээ, гарал үүсэл бүртгэх | Supplier | Must | FR-1.3, FR-1.4 | 44, 47–48 |
| UC-03 | Өөрийн чанарын мэдээлэл харах | Supplier | Should | FR-1.5 | 44, 48 |
| UC-04 | Нийлүүлэгч бүртгэх / засварлах | Clerk | Must | FR-2.2, supplier half of FR-2.6 | 44, 41–42 |
| UC-05 | Багц бүртгэх, дугаар үүсгэх, давхардал шалгах | Clerk | Must | FR-2.3, FR-2.4, FR-2.5 | 44, 61 |
| UC-06 | QR код үүсгэх | Clerk | Must | FR-2.8 | 44, 61 |
| UC-07 | Багц хайх, мэдээлэл засварлах, гарал үүсэл мөшгөх | Clerk; quality staff searches only | Must | FR-2.6, FR-2.7, FR-2.9, FR-3.2 | 42, 44 |
| UC-08 | Шинжилгээний үр дүн бүртгэх, харьцуулах | Quality staff | Must (compare is Should) | FR-3.3, FR-3.4 | 44 |
| UC-09 | QR-д нийтлэх мэдээлэл сонгох | Quality staff | Must | FR-3.5 | 44, 55–56 |
| UC-10 | Системд нэвтрэх | All five logged-in roles | Must | FR-1.2, FR-2.1, FR-3.1, FR-4.1, FR-5.1 | 42, 44 |
| UC-11 | Статистик, харьцуулалт, тайлан гаргах, татах | Management | Should | FR-4.2–FR-4.6 | 44 |
| UC-12 | Хэрэглэгч, эрх, тохиргоо, audit log удирдах | Administrator | Must (settings and audit view are Should) | FR-5.2–FR-5.6 | 44 |
| UC-13 | QR кодоор зөвшөөрсөн мэдээлэл шалгах | Public user | Must | FR-6.1 | 44, 61 |

Approved flow rules that the API must enforce:

- UC-01 creates «баталгаажуулалт хүлээгдэж буй», checks duplicate login name and duplicate supplier (BR-13), writes an audit row, and does not leave a partial row on failure (pp. 46–47).
- UC-02 requires an active supplier and binds the row to that supplier only (pp. 47–48). One supplier may add another supply record (alternate flow A2, p. 48).
- UC-03, when no result exists, returns a clear “not registered yet” outcome and never returns another supplier’s results (p. 48).
- UC-05 generates and checks the batch number inside batch registration. Those are not separate user actions (p. 42).
- UC-06 extends UC-05. QR generation is optional after a successful batch save, and it is also available later for an existing batch (p. 61).
- UC-09 removes personal or otherwise unpublished fields if selected (exception E2, p. 56). Selecting nothing leaves every field hidden (alternate flow A1, p. 56).
- UC-13 exception E1 (invalid QR or missing batch) and E2 (nothing published) both tell the user that information was not found (p. 61). The public API uses the same message for both, so it does not reveal whether a token exists.
- A batch is publicly verifiable only when the QR status is «Ашиглахад бэлэн» and the publication status is «Нийтлэгдсэн» (p. 109). Having a laboratory result is not required for that state.
- Previous test results are kept and compared. They are not deleted (p. 64, p. 136).

### 1.8 Data requirements

Approved stored facts, from the analysis class model (pp. 63–66) and the data dictionary (pp. 123–131):

- User: email, password hash (Auth), role, status, failed-attempt count.
- Supplier: name, type (малчин / хоршоо / аж ахуйн нэгж), sum (aimag derived), phone, approval state, approving administrator, rejection reason (p. 105).
- Supply record: quantity, sum, livestock count, date. Many records per supplier (p. 64).
- Batch: unique number, quantity, sum of origin, received date, one supplier, registering user, status «Бүртгэгдсэн» or «Шинжилгээтэй».
- Quality result: fineness, clean yield, admixture, laboratory text, test date, recording user. Many results per batch (p. 122).
- QR: one per batch, unguessable token, URL, status «Үүссэн» or «Ашиглахад бэлэн».
- Publication settings: one per batch, selected field list default empty, status «Нууц» or «Нийтлэгдсэн».
- Audit: time, action, object, actor, old and new values.
- System settings: key and value, changed by an administrator (FR-5.4). The PDF does not name the keys. **UNCERTAIN** which keys exist.
- Aimag and sum lookup tables (p. 121).
- Batch-to-supply allocation links (p. 121, p. 130).

Reports and statistics are derived. They are not a stored report table (p. 64).

Units and ranges that **are** in the data dictionary (pp. 125–127), and that this plan does not extend:

- Supply and batch quantity: `NUMERIC`, kilograms, greater than 0.
- Livestock count: integer, greater than or equal to 0, default 0.
- Fineness: nullable, microns, greater than or equal to 0 when present.
- Clean yield and admixture: nullable, percent, 0 through 100 when present.

These checks are input bounds from the data dictionary. They are not MNS or ISO pass/fail grades. The PDF says the indicator list may still change (p. 16). No grade, class, or acceptance threshold is added.

### 1.9 Security requirements

Approved security requirements are NFR-6, NFR-7, NFR-9, NFR-10, NFR-12, NFR-13, NFR-15 (Must) and NFR-8, NFR-11, NFR-14, NFR-16 (Should), plus BR-05, BR-08, BR-10, BR-11, and BR-12.

Personal data that the public QR response must not contain (NFR-10, NFR-13, UC-09 E2): supplier or user name, phone, email, identity code, internal ids, audit data, notes, and the full test history. The public response contains only the selected members of the closed field catalog in section 6.8.

---

## 2. Backend architecture

### 2.1 Request path

Logged-in work (UC-01 through UC-12), as specified on pp. 116 and 133–134:

1. The Next.js screen sends HTTPS JSON to Express `/api/v1`.
2. Express checks the Supabase JWT (signature, expiry, issuer) and loads the profile role.
3. Role middleware and the service apply RBAC, ownership, and the business rule.
4. The repository calls PostgreSQL with parameterized queries or a SQL function, inside a transaction when more than one row must succeed or fail together.
5. The audit writer records the change in the same transaction.
6. Express returns JSON. The Next.js screen renders it.

Public QR (UC-13):

1. The phone opens the existing Next.js route `/verify/[token]` with no session.
2. Next.js calls `GET /api/v1/public/verify/:token`.
3. A SQL function reads the QR, batch, publication row, and the single published quality snapshot, then returns only whitelisted keys.
4. Hidden or unknown tokens return the same not-found body (p. 61).

The browser never receives the Supabase `service_role` key (p. 134).

```text
Browser
  -> Next.js (existing cashmeretrace UI, locale routes)
    -> Express /api/v1
      -> Supabase Auth (identity, JWT)
      -> PostgreSQL (RLS + constraints + SQL functions)
      -> Supabase Storage (private QR PNG bucket)
```

### 2.2 Process layout

One Node.js process. Layered architecture is the PDF’s server structure; microservices are rejected in the PDF because one person must keep batch, quality, and audit rows in one transaction (pp. 114–115).

```text
backend/
  package.json
  tsconfig.json
  .env.example
  src/
    server.ts                 # process entry
    app.ts                    # Express app, /api/v1 mount
    config/env.ts             # validated environment
    lib/supabase.ts           # anon client and server-only admin client
    lib/logger.ts
    lib/errors.ts
    middleware/
      request-id.ts
      authenticate.ts
      require-role.ts
      require-active.ts
      error-handler.ts
      rate-limit.ts
      cors.ts
    validation/               # Zod schemas shared by controllers
    modules/
      auth/
      suppliers/
      supply-info/
      batches/
      quality/
      qr/
      publication/
      public-verify/
      reports/
      admin/
      audit/
    db/types.ts               # generated database types, committed after migration
  supabase/
    migrations/               # SQL created in the implementation phases
    seed/aimag_sum.sql
  tests/
    unit/
    api/
    rls/
```

Each module folder contains `*.routes.ts`, `*.controller.ts`, `*.service.ts`, and `*.repository.ts`. Controllers do not call Supabase. Repositories do not decide roles.

### 2.3 Layer responsibilities

| Layer | Responsibility | PDF mapping (p. 115) |
| --- | --- | --- |
| Next.js presentation | Forms, tables, charts, Mongolian/English text, public verify page. Client checks are hints only. | Client / boundary |
| Routes | URL, HTTP verb, middleware chain, version prefix. | API layer |
| Controller | Read the validated request, call one service method, map the result to the response envelope. No business rules. | API layer |
| Validation | Zod schemas for body, query, and path. Reject unknown public field names. | API layer, NFR-12 |
| Middleware | Request id, CORS, rate limit, JWT, role, active account, error translation. | ЭрхШалгагч |
| Service | BR-01–BR-13, ownership, transactions, audit intent, public whitelist. | Business logic / control classes |
| Repository | Parameterized reads and writes, RPC calls. No role decisions. | Data access |
| PostgreSQL | Keys, uniqueness, checks, transactions, RLS, numbering function, public verify function. | Data store, NFR-15 |
| Supabase Auth | Identity, password hash, JWT issue and refresh. | NFR-6, NFR-8 |
| Supabase Storage | Private PNG of a generated QR. | FR-2.8, NFR-24 |

Control classes from table 90 (pp. 66–67) become services:

| PDF control | Service |
| --- | --- |
| БүртгэлХянагч | `auth` registration + `suppliers` self-register |
| НэвтрэлтХянагч | `auth` |
| НийлүүлэлтХянагч | `supply-info` |
| НийлүүлэгчХянагч | `suppliers` |
| БагцХянагч, БагцХайлтХянагч | `batches` |
| QRХянагч | `qr` |
| ШинжилгээХянагч, ЧанарХарагч | `quality` |
| НийтлэхХянагч | `publication` |
| ТайланГаргагч | `reports` |
| АдминХянагч | `admin` |
| НийтийнХуудасХянагч | `public-verify` |
| ЭрхШалгагч | `require-role` + service checks |
| АудитБүртгэгч | `audit` writer used by every mutating service |

### 2.4 Supabase integration

Two server clients:

- **User-scoped client.** Built per request with the caller’s JWT. Used for ordinary reads and writes so RLS still applies if a service check is incomplete.
- **Admin client.** Uses `service_role` only inside named server functions: create an Auth user during admin/clerk provisioning, set the lock counter, run the batch-number transaction, and call the public-verify SQL function. It is constructed in `lib/supabase.ts` and is not exported to controllers. The batch RPC receives `p_registered_by` from the verified request context, never from the request body; the service-role key never reaches the browser. QR RPCs are not called through this client because they require `auth.uid()` (section 5.6).

Schema changes go through SQL migrations in `supabase/migrations`. Application code uses generated types from that schema.

QR PNG objects live in a private bucket `qr-codes`. The object path is `batch/{batch_id}/{qr_id}.png`. Authenticated clerk download uses a short-lived signed URL. The public verify response does not return a storage path or a signed URL.

### 2.5 Error handling

Service errors use a stable code. The error middleware maps them to HTTP and a Mongolian message with a correction hint (NFR-20). SQL text, constraint names, stack traces, tokens, and emails of other users are not returned.

| HTTP | When | Example code |
| --- | --- | --- |
| 400 | Zod validation failed | `VALIDATION_ERROR` |
| 401 | Missing or invalid JWT | `UNAUTHENTICATED` |
| 403 | Role, ownership, pending, or rejected | `FORBIDDEN` |
| 404 | Hidden from this caller, or unknown id | `NOT_FOUND` |
| 409 | Duplicate email, duplicate supplier, duplicate batch number | `DUPLICATE` |
| 423 | Account locked after 5 failures | `LOCKED` |
| 429 | Rate limit | `RATE_LIMITED` |
| 500 | Unexpected failure after rollback | `INTERNAL` |

Public verify uses 404 and `NOT_FOUND` for an unknown token, a QR that is not `READY`, a missing batch, and a publication that is still private. It does not use a distinct code for those cases.

Response envelope:

```json
{
  "data": null,
  "error": { "code": "DUPLICATE", "message": "Багцын дугаар давхардсан тул бүртгэл хадгалагдаагүй." },
  "meta": { "requestId": "uuid" }
}
```

Successful lists include `meta.page`, `meta.pageSize`, and `meta.total`.

### 2.6 Logging

Structured JSON logs to stdout: timestamp, request id, actor id, role, route, status, and duration. The log line does not include the password, the JWT, the refresh token, the full QR token, or `service_role`. A failed login log stores a hash of the email, not the raw address, when the address itself is not required for operations. Audit rows are the business record (BR-10). Application logs are the operational record.

### 2.7 API versioning

All business routes are under `/api/v1` (p. 134). A breaking change later uses `/api/v2` and leaves `/api/v1` in place until the frontend moves. This plan defines only v1.

---

## 3. Database design

### 3.1 Naming

The implementation names match the entities requested for this plan and the PDF dictionary.

| Implementation table | PDF dictionary | Why it exists |
| --- | --- | --- |
| `profiles` | `USERS` | Authenticated user. Password stays in `auth.users`. |
| `suppliers` | `SUPPLIERS` | A clerk-created supplier may have no login (p. 122). |
| `supply_info` | `SUPPLY_RECORDS` | FR-1.3, FR-1.4 |
| `batch` | `RAW_MATERIAL_BATCHES` | FR-2.3 |
| `quality_result` | `TEST_RESULTS` | FR-3.3. History is kept (p. 136). |
| `qr_code` | `QR_CODES` | FR-2.8 |
| `publish_config` | `PUBLICATION_SETTINGS` | FR-3.5 |
| `audit_log` | `AUDIT_LOGS` | BR-10 |
| `system_settings` | `SYSTEM_SETTINGS` | FR-5.4 |
| `aimag` | `PROVINCES` | BR-03A, FR-1.4 |
| `sum` | `DISTRICTS` | BR-03A, FR-1.4 |
| `batch_supply_link` | `BATCH_SUPPLY_LINKS` | PDF data dictionary, p. 130 |
| `batch_counter` | none | Technical row lock for FR-2.4 / BR-01 |

`profiles.id` is a UUID equal to `auth.users.id`. The PDF used `BIGINT` for `user_id` (p. 123). UUID is a technical adaptation required by Supabase Auth, not a new business attribute. Other primary keys stay `bigint generated by default as identity`.

Foreign keys use `ON DELETE RESTRICT`. Cascading deletes are not used. Users, suppliers, batches, and quality results are not physically deleted by the application (status changes and insert-only quality history).

**Phase 1.1 security note (2026-11-11):** every reference to `profiles` — including supplier approval actors, batch registrars, quality recorders, config updaters, and `audit_log.actor_id` — now uses `ON DELETE RESTRICT`, not `SET NULL`. This preserves audit attribution. A `profiles_reject_delete()` trigger blocks hard deletion; profiles are deactivated with `status` instead.

### 3.2 `aimag`

Lookup. Seeded. Not edited by suppliers.

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `aimag_id` | `bigint` identity | PK, not null | identity |
| `aimag_name` | `varchar(100)` | not null, unique | |
| `aimag_code` | `varchar(10)` | not null, unique | |
| `created_at` | `timestamptz` | not null | `now()` |

### 3.3 `sum`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `sum_id` | `bigint` identity | PK, not null | identity |
| `aimag_id` | `bigint` | not null, FK → `aimag.aimag_id` `ON DELETE RESTRICT` | |
| `sum_name` | `varchar(100)` | not null, unique (`aimag_id`, `sum_name`) | |
| `sum_code` | `varchar(10)` | not null, unique (`aimag_id`, `sum_code`) | |
| `created_at` | `timestamptz` | not null | `now()` |

Index: `aimag_id`.

### 3.4 `suppliers`

| Column | Type | Keys and constraints | Default | PDF |
| --- | --- | --- | --- | --- |
| `supplier_id` | `bigint` identity | PK, not null | identity | p. 124 |
| `name` | `varchar(150)` | not null | | p. 124 |
| `supplier_type` | `text` | not null, check in `HERDER`, `COOPERATIVE`, `BUSINESS` | | p. 124. Малчин, хоршоо, аж ахуйн нэгж (p. 66). |
| `phone` | `varchar(20)` | null | | p. 124 |
| `sum_id` | `bigint` | not null, FK → `sum.sum_id` `RESTRICT` | | p. 124 |
| `approval_status` | `text` | not null, check in `PENDING`, `APPROVED`, `REJECTED` | `PENDING` | p. 124 |
| `approved_by` | `uuid` | null, FK → `profiles.id` `RESTRICT` | | p. 124, type adapted to UUID |
| `rejection_reason` | `text` | null | | State table records «татгалзсан шалтгаан» (p. 105). |
| `identity_type` | `varchar(30)` | null | | p. 125. Code system **UNCERTAIN**. |
| `identity_code` | `varchar(50)` | null | | p. 125 |
| `created_at` | `timestamptz` | not null | `now()` | p. 125 |

Checks:

- Unique (`identity_type`, `identity_code`) where both are not null.
- Both identity columns are null, or both are set.
- `REJECTED` requires `rejection_reason`. `PENDING` and `APPROVED` have a null reason.

Indexes: `sum_id`, `approval_status`.

**Phase 1.1 note:** the applied column is `approved_by_id`, and its FK is `RESTRICT`. Supplier rows are created only by controlled paths: an active registration clerk inserts a `PENDING` row with `approved_by_id IS NULL` and `rejection_reason IS NULL`, or the Phase 2 server-side self-registration service uses `service_role` to insert a `PENDING` supplier plus a `PENDING` profile. Browser JWTs have no supplier `INSERT` policy, administrators have no supplier `INSERT` grant, and only an active administrator may move a pending supplier to `APPROVED` or `REJECTED`. `create_batch()` rejects `PENDING` and `REJECTED` suppliers.

### 3.5 `profiles`

Replaces PDF `USERS` (pp. 123–124) except `password_hash` and `email` uniqueness, which belong to `auth.users`.

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, not null, FK → `auth.users.id` `ON DELETE RESTRICT` | |
| `app_role` | `text` | not null, check in `SUPPLIER`, `REGISTRATION_STAFF`, `QUALITY_STAFF`, `MANAGEMENT`, `ADMIN` | |
| `status` | `text` | not null, check in `PENDING`, `ACTIVE`, `REJECTED`, `LOCKED` | `PENDING` |
| `supplier_id` | `bigint` | null, unique, FK → `suppliers.supplier_id` `RESTRICT` | |
| `failed_login_attempts` | `smallint` | not null, check 0 through 5 | `0` |
| `locked_at` | `timestamptz` | null | |
| `locked_until` | `timestamptz` | null, check: null or `locked_at` is not null | |
| `created_at` | `timestamptz` | not null | `now()` |

Checks:

- `app_role = 'SUPPLIER'` requires `supplier_id`.
- Every other role requires `supplier_id` null.
- Email is read from Auth when the API must show the caller their own address. It is not copied into a second writable column.

`locked_until` is reserved for the unapproved BR-11A proposal. Version 1 writes `locked_at` and `status = 'LOCKED'` at the fifth failure and does not calculate an expiry.

Index: (`status`, `locked_at`).

A database trigger on `auth.users` insert creates nothing by itself. The registration and admin services insert the profile in the same application transaction as the supplier row. If the database insert fails, the service deletes the Auth user it just created.

**Phase 1.1 security note:** self-registration is a server-side `service_role` flow that inserts `PENDING` supplier/profile rows; it is not exposed as a browser table write. `profiles` has no authenticated `INSERT`, `UPDATE`, or `DELETE` policy. Profile deletion is blocked by trigger, and every profile-referencing FK is `RESTRICT`, so audit rows cannot lose their actor.

### 3.6 `supply_info`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `supply_id` | `bigint` identity | PK, not null | identity |
| `supplier_id` | `bigint` | not null, FK → `suppliers.supplier_id` `RESTRICT` | |
| `quantity_kg` | `numeric(12,3)` | not null, check `> 0` | |
| `sum_id` | `bigint` | not null, FK → `sum.sum_id` `RESTRICT` | |
| `animal_count` | `integer` | not null, check `>= 0` | `0` |
| `supplied_at` | `date` | not null | |
| `created_at` | `timestamptz` | not null | `now()` |

Indexes: (`supplier_id`, `supplied_at`), (`sum_id`, `supplied_at`).

The PDF does not say whether `supplied_at` may be in the future. That limit is **UNCERTAIN** and is not enforced.

### 3.7 `batch_counter`

Technical table for FR-2.4. One row per calendar year.

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `year` | `integer` | PK, not null | |
| `last_value` | `integer` | not null, check `>= 0` | `0` |

The numbering function locks the year row with `SELECT … FOR UPDATE`, increments `last_value`, and inserts the batch in the same transaction. The printable code is `year || '-' || lpad(last_value)`. The prefix and the pad width are **UNCERTAIN** (p. 16, p. 109) and are not hard-coded as a business rule. Until the customer confirms a pattern, the function stores a unique opaque code `B-{year}-{last_value padded to 6 digits}` so BR-01 can be tested. Changing the pattern later is a data migration, not a silent overwrite of issued numbers. Issued `batch_no` values are immutable.

**Phase 1.1 note:** the applied schema follows the approved final-plan format `MN-YYYY-NNNNNN` (for example `MN-2026-000001`). The counter column is `sequence`, not `last_value`, and its check is `between 0 and 999999`. `YYYY` is derived from `batch.received_date`, not `current_date`, and the per-year counter is locked and incremented in the batch-insert transaction. `create_batch()` raises before formatting when the next value would exceed `999999`, so `lpad()` can never truncate `1000000` into a reused six-digit code. `batch_code` is immutable; `guard_batch_update()` allows a `received_date` correction only when its year still matches the code, and rejects a cross-year change. Single-connection PGlite proves rollback, per-year independence, same-year correction, cross-year rejection, and overflow rejection; two-session lock contention is not yet tested.

### 3.8 `batch`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `batch_id` | `bigint` identity | PK, not null | identity |
| `batch_no` | `varchar(50)` | not null, unique | from the numbering function |
| `supplier_id` | `bigint` | not null, FK → `suppliers.supplier_id` `RESTRICT` | |
| `quantity_kg` | `numeric(12,3)` | not null, check `> 0` | |
| `received_at` | `date` | not null | |
| `origin_sum_id` | `bigint` | not null, FK → `sum.sum_id` `RESTRICT` | |
| `status` | `text` | not null, check in `REGISTERED`, `TESTED` | `REGISTERED` |
| `registered_by` | `uuid` | not null, FK → `profiles.id` `RESTRICT` | |
| `created_at` | `timestamptz` | not null | `now()` |
| `updated_at` | `timestamptz` | not null | `now()` |

`updated_at` supports FR-2.6. A before-update trigger sets it.

Indexes: `supplier_id`, `origin_sum_id`, `received_at`.

Livestock count is stored on `supply_info`, which is where the data dictionary puts `animal_count` (p. 125). The batch table in the dictionary has no livestock column (p. 126). Trace reads livestock through `batch_supply_link`.

**Phase 1.1 note:** V1 keeps `batch.origin_sum_id` for origin display but does not implement `batch_supply_link` or a batch-level animal count. `animalCount` was therefore removed from the closed V1 public catalog, not merely left unpopulated. Finalization refuses to run if an existing `publish_config` row still selects it. This is a scope decision, not a claim that the PDF's many-to-many relationship is wrong.

`status` becomes `TESTED` when the first `quality_result` row for that batch is inserted. It does not return to `REGISTERED`.

`batch_no` cannot be updated.

### 3.9 `batch_supply_link`

PDF table (p. 130). Implements the many-to-many described on p. 122.

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `link_id` | `bigint` identity | PK, not null | identity |
| `batch_id` | `bigint` | not null, FK → `batch.batch_id` `RESTRICT` | |
| `supply_id` | `bigint` | not null, FK → `supply_info.supply_id` `RESTRICT` | |
| `allocated_quantity_kg` | `numeric(12,3)` | not null, check `> 0` | |
| `created_at` | `timestamptz` | not null | `now()` |

Unique (`batch_id`, `supply_id`). Index: `supply_id`.

A constraint trigger checks that `supply_info.supplier_id` equals `batch.supplier_id` (p. 132).

The PDF also says the allocated-weight sum is checked in a transaction (p. 132) and does not define the ceiling. **UNCERTAIN.** Version 1 stores the link and enforces the supplier match and the unique pair. It does not invent a “sum must equal batch quantity” rule.

### 3.10 `quality_result`

Insert-only. PDF relationship is one batch to many results (p. 122). Previous results are retained for comparison (pp. 64, 136). The API has no update and no delete.

**Phase 1.1 note:** the applied table is `quality_test`, with `created_by_id` instead of `recorded_by` and `admixture_pct` instead of `impurity_pct`. The date column was renamed from `test_date` to `tested_at` by the Phase 1.1 migration. It remains the laboratory/report date; latest-result ordering is still `created_at DESC, id DESC`. The public `impurityPct` key maps to `admixture_pct`.

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `quality_result_id` | `bigint` identity | PK, not null | identity |
| `batch_id` | `bigint` | not null, FK → `batch.batch_id` `RESTRICT` | |
| `fineness_micron` | `numeric(6,2)` | null, check null or `>= 0` | |
| `clean_yield_pct` | `numeric(5,2)` | null, check null or between 0 and 100 | |
| `impurity_pct` | `numeric(5,2)` | null, check null or between 0 and 100 | |
| `tested_at` | `date` | not null | |
| `lab_result` | `text` | null | |
| `recorded_by` | `uuid` | not null, FK → `profiles.id` `RESTRICT` | |
| `created_at` | `timestamptz` | not null | `now()` |

At least one of `fineness_micron`, `clean_yield_pct`, `impurity_pct`, or `lab_result` is required. The PDF lists those indicators and does not say which subset is mandatory on every row. This “at least one” check is a technical guard so an empty row is not stored. It is not a laboratory standard.

Index: (`batch_id`, `created_at`, `quality_result_id`).

Which row is the “latest” result for a single public value is **UNCERTAIN**. The PDF does not name the sort key. `tested_at` is the laboratory date (p. 127). `created_at` is when staff entered it. Comparison (FR-3.4) returns the full history. A public response that is allowed to show a quality field returns the row with the greatest `created_at`, then the greatest `quality_result_id`, and this ordering is documented as a technical choice pending confirmation.

Privileges: `INSERT` and `SELECT` for the application role. `UPDATE` and `DELETE` are revoked, and guard triggers reject update/delete/truncate for every role, including the table owner and `service_role`. The first inserted result moves the batch from `REGISTERED` to `TESTED`; the batch cannot return to `REGISTERED`.

### 3.11 `qr_code`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `qr_id` | `bigint` identity | PK, not null | identity |
| `batch_id` | `bigint` | not null, unique, FK → `batch.batch_id` `RESTRICT` | |
| `token` | `varchar(128)` | not null, unique | generated UUID, stored once |
| `url` | `varchar(500)` | not null | public path `/verify/{token}` |
| `storage_path` | `text` | null | private PNG path |
| `status` | `text` | not null, check in `CREATED`, `READY` | `CREATED` |
| `created_at` | `timestamptz` | not null | `now()` |
| `ready_at` | `timestamptz` | null | |

`storage_path` is a technical column for the PNG required by FR-2.8 and NFR-24. It is not a PDF dictionary column.

The PDF state table moves a code from «Үүссэн» to «Ашиглахад бэлэн» after a readability check (pp. 108–109, NFR-24). It does not define an automatic scanner inside the server. **UNCERTAIN** how the server decides readability. Version 1 generates the PNG, stores it, leaves status `CREATED`, and provides an authenticated clerk action that marks `READY` after the human scan test recorded for NFR-24. That action is the smallest mechanism that can reach the state the public rule on p. 109 requires. It is not a new revocation feature.

There is no second QR per batch (unique `batch_id`, p. 128). Replacing a token is the unapproved revocation gap (p. 110) and is not implemented.

**Phase 1.1 security note:** `authenticated` has only `SELECT` on `qr_code`; direct `INSERT`/`UPDATE` is neither granted nor covered by a policy. `create_qr(p_batch_id)` requires an active clerk, generates `token` with `gen_random_uuid()`, derives `url` as `/verify/<token>`, and always inserts `CREATED` with `ready_at = NULL`. `mark_qr_ready(p_batch_id)` performs only `CREATED -> READY` and assigns `ready_at = now()` in the guard trigger, ignoring any client value. Token, URL, and storage path are omitted from audit detail. Both RPCs must be invoked with the clerk's user-scoped JWT client; a service-role client has `auth.uid() = NULL` and is rejected by design. Do not set JWT claims manually to make a service-role call work.

### 3.12 `publish_config`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `publication_id` | `bigint` identity | PK, not null | identity |
| `batch_id` | `bigint` | not null, unique, FK → `batch.batch_id` `RESTRICT` | |
| `published_fields` | `jsonb` | not null | `[]` |
| `status` | `text` | not null, check in `PRIVATE`, `PUBLISHED` | `PRIVATE` |
| `updated_at` | `timestamptz` | not null | `now()` |
| `updated_by` | `uuid` | null, FK → `profiles.id` `RESTRICT` | |

`published_fields` is a JSON array of catalog keys. A check constraint rejects any key outside the catalog in section 6.8. Empty array with `PUBLISHED` is allowed and still shows nothing (UC-09 A1, p. 56). Missing row means hidden (BR-08, p. 122).

### 3.13 `audit_log`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `audit_id` | `bigint` identity | PK, not null | identity |
| `event_at` | `timestamptz` | not null | `now()` |
| `action` | `varchar(100)` | not null | |
| `object_type` | `varchar(100)` | not null | |
| `object_id` | `varchar(64)` | null | |
| `actor_label` | `varchar(150)` | null | role or `anonymous` for a failed login |
| `user_id` | `uuid` | null, FK → `profiles.id` `RESTRICT` | |
| `context` | `jsonb` | null | |
| `old_values` | `jsonb` | null | |
| `new_values` | `jsonb` | null | |

Indexes: (`user_id`, `event_at`), (`object_type`, `object_id`), (`action`, `event_at`).

`context`, `old_values`, and `new_values` must not contain passwords, JWT, refresh tokens, or the raw QR token. The writer stores only the last 6 characters of a token when a QR event needs an identifier. Audit rows are insert-only.

**Phase 1.1 note:** the applied table is `audit_log` with `actor_id` (FK `RESTRICT`), `actor_role`, `entity`, `entity_id`, `action`, and `detail` containing sanitized `old`/`new` snapshots. Ten central `SECURITY DEFINER` triggers cover `aimags`, `sums`, `suppliers`, `profiles`, `supply_info`, `batch`, `quality_test` (insert), `qr_code`, `publish_config`, and `system_config`. Supplier `name`, `phone`, identity fields, and free-text `rejection_reason`, profile lock counters, `lab_result`, QR token/URL/storage path, and `system_config.value` are stripped. Guard triggers reject update, delete, and truncate on `audit_log`, including for the table owner and `service_role`. A `DELETE` is never attributed to the deleted row's actor.

Action values used by services: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOCK`, `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `PUBLISH`. The PDF examples include `DELETE` (p. 129). Version 1 does not perform business deletes, so it does not write `DELETE`.

Retention period is **UNCERTAIN**. Rows are not purged by the application.

### 3.14 `system_settings`

| Column | Type | Keys and constraints | Default |
| --- | --- | --- | --- |
| `setting_id` | `bigint` identity | PK, not null | identity |
| `setting_key` | `varchar(100)` | not null, unique | |
| `setting_value` | `text` | not null | |
| `updated_at` | `timestamptz` | not null | `now()` |
| `updated_by` | `uuid` | null, FK → `profiles.id` `RESTRICT` | |

No business keys are seeded. The PDF requires the ability to change settings (FR-5.4) and does not list the keys. Adding a batch-number pattern, a lock duration, or a report format as a setting would invent a rule. The table exists so the approved admin use case has a place to write a future confirmed key.

### 3.15 Relationships

```text
auth.users ||--|| profiles
profiles  o|--o| suppliers          (supplier login; clerk-created supplier may have none)
profiles  ||--o{ batch              (registered_by)
profiles  ||--o{ quality_result     (recorded_by)
profiles  o|--o{ suppliers          (approved_by)
profiles  o|--o{ publish_config     (updated_by)
profiles  o|--o{ system_settings    (updated_by)
profiles  o|--o{ audit_log
suppliers ||--o{ supply_info
suppliers ||--o{ batch
aimag     ||--|{ sum
sum       ||--o{ suppliers
sum       ||--o{ supply_info
sum       ||--o{ batch
supply_info ||--o{ batch_supply_link
batch     ||--o{ batch_supply_link
batch     ||--o{ quality_result
batch     o|--o| qr_code
batch     o|--o| publish_config
batch_counter }o--|| batch          (number source; no FK)
```

### 3.16 Row-level privileges for quality history

`quality_result` grants:

- `SELECT` to the API role.
- `INSERT` to the API role.
- `UPDATE` and `DELETE` to nobody, including the table owner’s application login.

Corrections are new rows. The previous row remains.

---

## 4. Authentication and RBAC

### 4.1 Authentication flow

Supabase Auth stores the password with its hasher (NFR-6). The Express login route is the only login path the frontend uses, so lockout and approval can run before a session is given to the UI.

**Self-registration (UC-01, BR-12, BR-13)**

1. Validate email, password, name, supplier type, and `sum_id`. Phone is optional (p. 124). Password length and complexity are **UNCERTAIN**; the service accepts the password Supabase Auth accepts and does not add a private complexity policy.
2. Reject a duplicate Auth email (UC-01 E2).
3. Reject a duplicate supplier when `identity_type` and `identity_code` match an existing pair (BR-13A columns). Name-only duplicate detection, without an identity code, is **UNCERTAIN** (p. 132). Version 1 also rejects an exact match of normalized name plus `sum_id` plus `supplier_type` as the technical reading of BR-13 until the identity-code system is confirmed. This match is marked technical and must be reviewed with the supervisor.
4. Create the Auth user, then insert `suppliers` (`PENDING`) and `profiles` (`SUPPLIER`, `PENDING`) .
5. On a database failure, delete the Auth user and return the unsuccessful outcome (UC-01 E4).
6. Do not return a session. Tell the caller that an administrator must approve the account.

**Clerk registers a supplier; administrator approves (FR-2.2, FR-5.6, BR-12)**

- Insert `suppliers` as `PENDING` with `approved_by_id = NULL` and `rejection_reason = NULL`. A clerk cannot insert an already-approved row.
- If the approved Phase 2 provisioning design includes login credentials, the server may create the Auth user and a `PENDING` profile in the same controlled service transaction. No session is issued before approval.
- An active administrator performs the only `PENDING -> APPROVED` or `PENDING -> REJECTED` transition. Approval sets `approved_by_id` to the acting administrator; rejection requires a non-empty reason. Activating the linked profile is part of the same controlled approval service, not a browser write.
- A supplier record may have no user at all (p. 122).

**Login (UC-10, FR-1.2, BR-11)**

1. If the profile is `LOCKED`, return 423 and do not call the password checker again.
2. Call Supabase `signInWithPassword`.
3. On a bad password, increment `failed_login_attempts` in a privileged function. At 5, set `status = LOCKED`, `locked_at = now()`, and write `LOCK`. Return 401 for attempts 1–4 and 423 on the fifth.
4. On a good password, if status is not `ACTIVE`, sign the Auth session out and return 403. Pending and rejected suppliers receive that refusal (FR-1.2, BR-12).
5. On success, reset `failed_login_attempts` to 0 and write `LOGIN_SUCCESS`.
6. Return the Auth access token, refresh token, role, and status to the Next.js client.

Token lifetime: configure the Supabase access token to a value that does not exceed 8 hours (NFR-8, Should). Whether the selected Supabase project allows an 8-hour access token is **UNCERTAIN** and is checked at setup. If the platform maximum is shorter, the shorter platform value is used and recorded. It still satisfies “≤ 8 hours”. Refresh-token rotation follows the Supabase project setting. Its duration is **UNCERTAIN** in the PDF.

**Logout.** The client discards tokens and calls `POST /auth/logout`, which revokes the refresh session through Auth.

**Refresh.** `POST /auth/refresh` exchanges a refresh token. The new access token is rejected by `require-active` when the profile is no longer `ACTIVE`.

**Current user.** `GET /auth/me` returns the caller’s role, status, supplier id when present, and own email.

### 4.2 JWT validation

`authenticate` middleware:

- Read `Authorization: Bearer`.
- Verify with Supabase (`auth.getUser`) so signature, expiry, and issuer are checked.
- Load `profiles` by the JWT subject.
- Attach `{ userId, role, status, supplierId }` to the request.
- Missing profile, bad signature, or expired token → 401.

Public verify does not use this middleware.

### 4.3 Role verification

`require-role(...roles)` runs after `authenticate`. `require-active` rejects `PENDING`, `REJECTED`, and `LOCKED` with 403 or 423. Services repeat the ownership check. Hiding a button in Next.js is not the control (p. 119).

### 4.4 Permission matrix

Legend: **Own** = only rows whose `supplier_id` is the caller’s supplier. **All** = every row of that kind. **—** = no access. Public has no account.

| Action | Supplier | Clerk | Quality staff | Management | Administrator | Public |
| --- | --- | --- | --- | --- | --- | --- |
| Register self | Server-side only, once, `PENDING` | — | — | — | — | — |
| Login | Active only | Active only | Active only | Active only | Active only | — |
| Read own profile | Own | Own | Own | Own | Own | — |
| Create supplier record | — | All (`PENDING`) | — | — | — | — |
| Edit supplier record | — | All | — | — | — | — |
| List/search suppliers | Own | All | — | Read for reports | Read for approval queue | — |
| Approve or reject supplier | — | — | — | — | Pending only | — |
| Create supply row | Own, active | — | — | — | — | — |
| Read/update own supply row | Own | Read all (trace) | — | Read aggregates | — | — |
| Create batch and number | — | All | — | — | — | — |
| Edit batch master data | — | All | — | — | — | — |
| Search batches | Own | All | All, read | Read | — | — |
| Trace origin | Own supply and own batches | All | Read batch, no trace edit (BR-06) | Read aggregates | — | Published fields only |
| Generate QR / mark ready | — | All | — | — | — | — |
| Insert quality result | — | — | All | — | — | — |
| Update or delete quality result | — | — | — | — | — | — |
| Read quality history | Own batches | Read (trace) | All | Aggregates | — | One published snapshot |
| Compare quality history | Own, read | — | All | — | — | — |
| Edit publication fields | — | — | All | — | — | — |
| Public verify | — | — | — | — | — | Token only |
| Supply and quality statistics | — | — | — | Read | — | — |
| Aimag/sum comparison | — | — | — | Read | — | — |
| Generate and download report | — | — | — | Read | — | — |
| Create user and set role | — | — | — | — | All except last admin | — |
| Change system settings | — | — | — | — | All | — |
| Read audit log | — | — | — | — | All | — |

Administrator write access is the UC-12 set: users, roles, supplier approval, settings, and audit read (pp. 36–37, 44). Table 19 also says «бүрэн эрх» (p. 33). The action list does not give the administrator batch or quality mutation. Those writes stay with the clerk and quality staff (BR-06, BR-04). Administrator read of batch master data is **UNCERTAIN** and is omitted.

**Phase 1.1 note:** the applied RLS follows this narrower reading. `admin` may select suppliers, audit rows, system config, and its own profile; it may approve or reject a `PENDING` supplier and update existing `system_config` keys. It has no `INSERT` on suppliers; direct admin supplier creation is not granted. It has no `SELECT` or write on supply, batch, quality, QR, or publication tables. It cannot create a batch through `create_batch()` because that RPC requires an active `registration_clerk` and an `APPROVED` supplier. Clerk supplier creation is `PENDING` only, with null approval fields. Self-registration is a `service_role` server flow that creates `PENDING` rows; it is not granted to any browser role. Direct QR writes are replaced by clerk-only `create_qr()` and `mark_qr_ready()` RPCs called with the clerk's user JWT.

Management download is a read of a generated file (FR-4.6). It is not a write.

A supplier does not edit the clerk’s supplier master record. FR-1.1 is registration. The PDF user class lists the supplier’s attributes; it does not give the supplier an update-profile use case. Own-profile update is **UNCERTAIN** and is not in version 1. The supplier can add supply records (UC-02 A2).

### 4.5 Data ownership

For `app_role = SUPPLIER`, every query in the supplier services adds `supplier_id = auth_supplier_id()`. A supplier who passes another id receives 404, not 403, so the response does not confirm that the other row exists.

Clerk batch and supplier queries are not filtered by creator. FR-2.7 and table 19 give the clerk the registry, not a personal subset.

Quality insert sets `recorded_by` from the JWT. The body cannot choose another author (BR-04).

### 4.6 RLS policies

RLS is enabled on every business table. `service_role` bypasses RLS and is limited to the server functions named in section 2.4. Policies below are the final database check (p. 134).

Helper SQL:

- `auth.uid()` is the JWT subject.
- `app_role()` reads `profiles.app_role` for `auth.uid()`.
- `app_status()` reads `profiles.status`.
- `auth_supplier_id()` reads `profiles.supplier_id`.
- Policies for mutating roles also require `app_status() = 'ACTIVE'`.

| Table | Policy |
| --- | --- |
| `profiles` | Select own row. Administrator selects all. Users do not update role, status, or `failed_login_attempts`. Those columns are updated only by the lock and admin functions as security definer. |
| `suppliers` | Supplier selects own row. Clerk selects all, inserts a `PENDING` row with null approval fields, and updates master data but never approval fields. Administrator selects all and updates `approval_status`, `approved_by_id`, and `rejection_reason` only, from `PENDING`. No admin insert; self-registration is `service_role` server-side and inserts `PENDING`. |
| `supply_info` | Supplier selects, inserts, and updates own rows. Clerk and management select all. Quality staff selects all only through the trace/read path used by batch search. No public policy. |
| `batch` | Supplier selects own. Clerk selects, inserts, and updates all except `batch_no`. Quality staff and management select all. No supplier insert. |
| `batch_supply_link` | Clerk inserts and selects. Supplier selects links for own batches. Management selects. |
| `quality_result` | Supplier selects rows for own batches. Clerk selects. Quality staff selects and inserts. Management selects. No update or delete policy. |
| `qr_code` | Clerk selects and uses `create_qr()` / `mark_qr_ready()` with the clerk's user JWT; there is no direct table insert or update. Other logged-in registry roles select. No public select. |
| `publish_config` | Quality staff selects, inserts, and updates. Clerk and management select. No public select. |
| `audit_log` | Administrator selects. Insert is performed by the security-definer audit function, not by an end-user JWT. Update/delete/truncate are rejected by triggers, not only by absent policies. |
| `system_settings` | Administrator selects and updates. No insert of new keys until a key is approved; the administrator updates existing rows. Because no keys are seeded, the table stays empty in version 1. |
| `aimag`, `sum` | All authenticated roles select. No authenticated insert. Seed uses the migration role. |
| `batch_counter` | No authenticated policy. Only the numbering function reads it. |

**Phase 1.1 note:** the applied policies use the lowercase canonical roles from section 1.2. Table names are `quality_test`, `publish_config`, `system_config`, `aimags`, and `sums`. The admin policies are narrower than the `POST /suppliers` row in section 4.4: no direct supplier insert, no batch/quality/QR/publication read. `batch_supply_link` has no policy because the table is excluded from V1. Audit inserts are performed by the central `SECURITY DEFINER` trigger, not by an end-user JWT.

Public verify does not add a public `SELECT` policy. It calls `public_verify(token text)`, a `SECURITY DEFINER` function with a fixed `search_path`, executable by the `anon` and `authenticated` roles. The function returns a single JSON object of whitelisted keys or no row.

### 4.7 Public QR restrictions

The function returns a row only when all of the following hold:

- The token matches one `qr_code.token`.
- `qr_code.status = 'READY'` (p. 109).
- A `publish_config` row exists with `status = 'PUBLISHED'`.
- `published_fields` is not empty.

Otherwise it returns no row, and Express responds with the same not-found body.

The function never selects `suppliers.name`, `phone`, `identity_code`, `profiles`, `auth.users.email`, `audit_log`, `lab_result`, or `storage_path`.

---

## 5. REST API

Base path `/api/v1`. Bodies are JSON unless a report download is specified. Dates are ISO `YYYY-MM-DD`. Timestamps are ISO-8601 with offset. Identifiers in paths are numeric except user ids, which are UUIDs, and the QR token, which is an opaque string.

The closed publication catalog keys are:

| Key | Source column | Personal data |
| --- | --- | --- |
| `batchNo` | `batch.batch_no` | No |
| `aimagName` | aimag of `batch.origin_sum_id` | No |
| `sumName` | sum name of `batch.origin_sum_id` | No |
| `quantityKg` | `batch.quantity_kg` | No |
| `finenessMicron` | latest `quality_result` | No |
| `cleanYieldPct` | latest `quality_result` | No |
| `impurityPct` | latest `quality_result` | No |
| `testedAt` | latest `quality_result.tested_at` | No |
| `verificationStatus` | literal `verified` when published and QR ready | No |

`lab_result` is free text and is excluded. Whether a non-personal laboratory sentence may be published later is **UNCERTAIN**. Supplier name is excluded even when the supplier is a company. The PDF does not authorize a public legal-name exception.

`animalCount` is not part of the applied V1 catalog because `batch_supply_link` and the batch-level animal count are excluded. The finalization migration refuses to proceed if an existing `publish_config` row still selects it. `quantityKg` is a batch fact, not personal data, and is publishable only when selected (BR-08).

### 5.1 Authentication

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /auth/register` | UC-01 self-registration | Public route; server-side `service_role` write | `email`, `password`, `name`, `supplierType`, `sumId`, optional `phone`, optional `identityType`, `identityCode` | `{ data: { supplierId, status: "PENDING" } }` | Email format; type enum; `sumId` exists; identity pair both set or both empty; required fields present (UC-01 E1); supplier/profile are always `PENDING` | `auth.users`, `profiles`, `suppliers`, `audit_log` |
| `POST /auth/login` | UC-10 | Public | `email`, `password` | `{ data: { accessToken, refreshToken, role, status, supplierId } }` | Lock check; active check | `profiles`, `audit_log`, Auth |
| `POST /auth/logout` | End session | Authenticated | Bearer token | `{ data: { ended: true } }` | JWT | Auth |
| `POST /auth/refresh` | New access token | Refresh token | `refreshToken` | New token pair | Auth rules; profile still `ACTIVE` | `profiles`, Auth |
| `GET /auth/me` | Current caller | Authenticated active | Bearer | Profile summary, own email | JWT | `profiles`, `suppliers` |

Login failure messages do not say which of the email or the password was wrong, except 423 when the account is locked (BR-11). Pending and rejected accounts get a specific 403 after a correct password, because FR-1.2 requires the user to learn that an unapproved registration cannot log in.

### 5.2 Supplier

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /suppliers` | List | Clerk: all. Supplier: own row only. Admin: filter `approvalStatus` | Query `q`, `approvalStatus`, `sumId`, `page`, `pageSize` | Paged suppliers without password or identity hash | `pageSize` 1–100 | `suppliers`, `sum`, `aimag` |
| `POST /suppliers` | Clerk registers a `PENDING` supplier (FR-2.2, BR-12) | Clerk only | `name`, `supplierType`, `sumId`, optional `phone`, optional identity pair, optional `login` (`email`, `password`) | Supplier `PENDING`; profile `PENDING` when login provisioning is implemented | Same as register, but `approval_status = 'PENDING'`, `approved_by_id = NULL`, and `rejection_reason = NULL`; administrator approval is a separate route; no admin access | `suppliers`, `profiles`, Auth, `audit_log` |
| `GET /suppliers/:id` | Detail | Clerk: any. Supplier: own. Admin: any | Path id | Supplier, aimag, sum, approval | 404 when hidden | `suppliers` |
| `PATCH /suppliers/:id` | Correct supplier master data | Clerk | Any of name, type, phone, sum, identity pair | Updated supplier | Cannot change `approval_status` here | `suppliers`, `audit_log` |
| `POST /suppliers/:id/approve` | FR-5.6 | Admin | Empty body | `APPROVED`, profile `ACTIVE` if a profile exists | Only from `PENDING`; BR-13 duplicate check | `suppliers`, `profiles`, `audit_log` |
| `POST /suppliers/:id/reject` | FR-5.6 | Admin | `reason` required | `REJECTED` | Only from `PENDING`; reason non-empty | `suppliers`, `profiles`, `audit_log` |

Approve and reject are not granted to the clerk. FR-5.6 names the administrator.

### 5.3 Supply / origin

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /supply-info` | Own list, or all for clerk trace and management | Supplier own; clerk; management | Query `supplierId` (clerk, management), `sumId`, `from`, `to`, page | Paged rows with aimag and sum names | Supplier’s `supplierId` query is ignored and replaced by the token | `supply_info` |
| `POST /supply-info` | UC-02 | Active supplier | `quantityKg`, `sumId`, `animalCount`, `suppliedAt` | Created row | `quantityKg > 0`; `animalCount >= 0`; sum exists; caller active | `supply_info`, `audit_log` |
| `GET /supply-info/:id` | One row | Owner, clerk, management | Path id | Row | 404 if not owner | `supply_info` |
| `PATCH /supply-info/:id` | Correct own supply row | Owner supplier | Same fields as create | Updated row | Same checks | `supply_info`, `audit_log` |

Clerk correction of supply rows is not a separate FR. FR-2.6 names supplier and batch information. Supply rows are the supplier’s entry (UC-02). Clerk read is required for trace (FR-2.9).

### 5.4 Batch

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /batches` | Search | Clerk, quality, management: all. Supplier: own | Query `batchNo`, `supplierId`, `sumId`, `status`, `from`, `to`, page | Paged batches | Quality and management cannot use this route to mutate | `batch` |
| `POST /batches` | UC-05 | Clerk | `supplierId`, `quantityKg`, `receivedAt`, `originSumId`; `links` excluded from V1 | Batch including generated `batchCode` | Active clerk; supplier exists and is `APPROVED`; quantity `> 0`; sum exists; number issued inside the transaction | `batch`, `batch_counter`, `audit_log` |
| `GET /batches/:id` | Detail | Clerk, quality, management; supplier if own | Path id | Batch, supplier id and name for authorized roles, origin | Public is not this route | `batch`, `suppliers` |
| `PATCH /batches/:id` | FR-2.6 batch half | Clerk | `quantityKg`, `receivedAt`, `originSumId`, `supplierId` | Updated batch | `batch_no` rejected if present; supplier required | `batch`, `audit_log` |
| `GET /batches/:id/trace` | FR-2.9 | Clerk; supplier if own | Path id | Supplier, origin aimag/sum, linked supply rows, QR status, quality count | Quality staff uses batch search, not this trace write-up (BR-06). Quality may `GET /batches/:id` | `batch`, `suppliers`, `supply_info`, `batch_supply_link` |
| `PUT /batches/:id/supply-links` | Replace allocation links | Clerk | `links` array | Links | Unique pairs; supplier match; `allocatedQuantityKg > 0` | `batch_supply_link`, `audit_log` |

`POST /batches` is the only creator of the applied `batch_code` (API alias `batchNo`). A client-supplied number is rejected. The applied V1 RPC accepts only an active clerk and an `APPROVED` supplier; a batch supplier update to a non-approved supplier is rejected by the guard trigger. `p_registered_by` is set from the authenticated session context, never from the request body; with a user JWT the database also requires it to equal `auth.uid()`. A `receivedAt` correction is accepted only within the year embedded in the immutable batch code. `batch_supply_link` and the link-replacement route are not part of V1. Exactly one audit row is written per successful create by the central trigger; the RPC does not write a second one.

### 5.5 Quality

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /quality/results` | History list | Quality: all. Supplier: own batches | Query `batchId`, page | Paged results, oldest or newest by `created_at` | No update fields | `quality_result` |
| `POST /quality/results` | FR-3.3 insert | Quality | `batchId`, `testedAt`, optional fineness, yield, impurity, `labResult` | Created row; batch status `TESTED` | Batch exists; at least one indicator; numeric bounds from section 3.10; `recorded_by` from JWT | `quality_result`, `batch`, `audit_log` |
| `GET /quality/results/:id` | One stored result | Quality; supplier if own batch | Path id | The unchanged row | 404 otherwise | `quality_result` |
| `GET /batches/:id/quality` | History for one batch | Quality; clerk read; supplier own; management read | Path id | All rows | Ordered by `created_at`, then id. Ordering is the technical choice in section 3.10 | `quality_result` |
| `GET /batches/:id/quality/compare` | FR-3.4 | Quality; supplier own (read) | Path id | Full history plus numeric deltas between adjacent rows | Empty history returns the UC-03 “not registered yet” message for a supplier | `quality_result` |
| `PUT /batches/:id/publish-fields` | UC-09 | Quality | `fields` array, `status` `PRIVATE` or `PUBLISHED` | Saved config and a preview object | Every key is in the catalog; personal keys rejected (UC-09 E2); empty selection forces an effective hidden page | `publish_config`, `audit_log` |
| `GET /batches/:id/publish-fields` | Read current choice and preview | Quality | Path id | Config, or the default private empty config | | `publish_config` |

There is no `PATCH` or `DELETE` for `/quality/results`.

### 5.6 QR

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /batches/:id/qr` | UC-06 create via `create_qr()` | Clerk | Empty | QR id, token, relative URL, status `CREATED`, signed PNG URL | Active clerk; one QR per batch; 409 if one exists; token/URL/status/timestamp supplied by the database | `qr_code`, Storage, `audit_log` |
| `GET /batches/:id/qr` | Read QR for print | Clerk | Path id | Same metadata and a new signed URL | 404 if none | `qr_code`, Storage |
| `POST /batches/:id/qr/ready` | Record the human scan test via `mark_qr_ready()` | Clerk | Empty | Status `READY`, `ready_at` | Active clerk; only from `CREATED`; `ready_at` assigned by the database | `qr_code`, `audit_log` |
| `GET /public/verify/:token` | UC-13 | Public, no JWT | Path token | Whitelisted object or 404 | Rate limited; token not echoed in logs | `public_verify` function |

Signed PNG URLs expire in 5 minutes. That duration is a technical choice, not a PDF rule.

**Phase 1.1 security note:** the API calls the SQL RPCs; it never inserts or updates `qr_code` directly. `create_qr()` returns a database-generated UUID token and `/verify/<token>` URL. `mark_qr_ready()` is the only allowed lifecycle transition, and the guard trigger overwrites `ready_at` with `now()`. `authenticated` has only `SELECT` on the table. Both RPCs are called with the clerk's user-scoped JWT client so `auth.uid()` is the verified subject. They are not called through the service-role client: a service-role request has `auth.uid() = NULL` and is rejected before the clerk-role check. The implementation must not weaken or bypass that check.

Public success body:

```json
{
  "data": {
    "fields": {
      "batchNo": "MN-2026-000001",
      "aimagName": "Архангай",
      "sumName": "Цэнхэр"
    }
  },
  "error": null,
  "meta": { "requestId": "uuid" }
}
```

Keys absent from `published_fields` are absent from `fields`. The response has no `supplier` object.

### 5.7 Reports

All routes require `MANAGEMENT` and are read-only (BR-07). Aggregates are computed in SQL (p. 119, NFR-5).

| Method and URL | Description | Input | Response | Tables |
| --- | --- | --- | --- | --- |
| `GET /reports/supply` | FR-4.2 supply totals | `from`, `to`, optional `aimagId`, `sumId` | Total quantity, supply count, supplier count | `supply_info`, `suppliers` |
| `GET /reports/quality` | FR-4.3 | `from`, `to` | Count of tested batches, count of results, average of each numeric indicator where the value is present | `quality_result`, `batch` |
| `GET /reports/regions` | FR-4.4 | `from`, `to`, `metric` `quantity` or `resultCount` | One row per aimag and per sum | `supply_info` or `batch` + `sum` + `aimag` |
| `POST /reports/export` | FR-4.5 and FR-4.6 | `kind` `supply` or `quality` or `regions`, same filters | File stream | same |

The file format is **UNCERTAIN** (p. 16, R-16: report type undefined; p. 36 says “файл” and does not name CSV, Excel, or PDF). Version 1 returns `text/csv` with a UTF-8 BOM so Mongolian text opens in a spreadsheet. That is a technical delivery choice for “download a file”, and it is labeled as such. PDF and Excel are not added as approved products.

Averages are arithmetic means of stored numbers. They are not quality grades.

### 5.8 Administration

| Method and URL | Description | Role | Input | Response | Validation | Tables |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /admin/users` | List accounts | Admin | Query `role`, `status`, page | Users without secrets | | `profiles`, Auth email |
| `POST /admin/users` | FR-5.2 create a non-supplier user | Admin | `email`, `password`, `role` in clerk, quality, management, admin | Active profile | Role cannot be `SUPPLIER` on this route; supplier accounts use section 5.2 | Auth, `profiles`, `audit_log` |
| `PATCH /admin/users/:id/role` | FR-5.3 | Admin | `role` | Updated role | Cannot change own role away from admin when that would leave zero admins; cannot assign `SUPPLIER` here | `profiles`, `audit_log` |
| `PATCH /admin/users/:id/status` | Enable or reject a staff account | Admin | `status` `ACTIVE` or `REJECTED` | Updated status | Does not clear `LOCKED`. Unlock is unapproved (BR-11A). | `profiles`, `audit_log` |
| `GET /admin/settings` | FR-5.4 read | Admin | None | Key list, possibly empty | | `system_settings` |
| `PATCH /admin/settings/:key` | FR-5.4 update an existing key | Admin | `value` | Updated row | 404 when the key was not previously approved and seeded | `system_settings`, `audit_log` |
| `GET /admin/audit-logs` | FR-5.5 | Admin | Query `action`, `objectType`, `userId`, `from`, `to`, page | Paged audit rows | No token or password columns exist to return | `audit_log` |
| `GET /admin/approvals` | Pending supplier queue | Admin | Page | Pending suppliers | | `suppliers` |

`GET /lookups/aimags` and `GET /lookups/aimags/:id/sums` are authenticated reads for every logged-in role, used by the registration and supply forms. They are reference data for FR-1.4, not a new actor.

### 5.9 Endpoint to screen map

The existing Next.js routes stay the UI. The API replaces `cashmeretrace/lib/mock/*` later. This plan does not edit those files.

| Existing screen | API |
| --- | --- |
| `/[locale]/register` | `POST /auth/register` |
| `/[locale]/login` | `POST /auth/login` |
| `/[locale]/supplier/records` | supply-info routes |
| `/[locale]/supplier/quality` | own quality history |
| `/[locale]/clerk/suppliers` | supplier routes |
| `/[locale]/clerk/batches` | batch routes |
| `/[locale]/clerk/batches/[id]/trace` | trace |
| `/[locale]/clerk/batches/[id]/qr` | QR routes |
| `/[locale]/quality/batches/[id]/test` | `POST /quality/results` |
| `/[locale]/quality/.../history` and `compare` | quality history and compare |
| `/[locale]/quality/.../publish` | publish-fields |
| `/[locale]/management/reports` | report routes |
| `/[locale]/admin/users`, `approvals`, `configuration`, `audit-log` | admin routes |
| `/verify/[token]` | `GET /public/verify/:token` |

---

## 6. Security design

### 6.1 JWT

- Access tokens are Supabase JWTs. Express verifies them on every protected route.
- Lifetime does not exceed 8 hours (NFR-8).
- Tokens are sent on `Authorization`. They are not written to the audit log or to stdout.
- A locked, pending, or rejected profile cannot use a still-unexpired token (`require-active`).
- The refresh token is stored by the Next.js client. The storage mechanism is a frontend concern. The API accepts it only on `/auth/refresh`.

### 6.2 RLS

Section 4.6 is the policy set. Application checks and RLS are both required. A service-role call is allowed only from the registration compensator, the lockout function, the numbering function, and `public_verify`.

### 6.3 Input validation

- Zod on every body, query, and path.
- Unknown JSON keys are stripped.
- Numbers use the dictionary bounds in section 3. No extra grade thresholds.
- Publication keys are an enum.
- SQL is parameterized. Dynamic sort columns are an allow-list (`created_at`, `batch_no`, `supplied_at`), not raw query text.
- Output is JSON. The Next.js layer escapes HTML (NFR-12).

### 6.4 Rate limiting

- Login and register: per IP. The PDF does not give a requests-per-minute number. The limit is a technical control for NFR-12. The numeric threshold is **UNCERTAIN**. The implementation starts with 10 requests per 15 minutes per IP for login and register, and this number is recorded as a technical default rather than a business rule.
- The approved lock remains 5 bad passwords per account (BR-11), independent of the IP limit.
- Public verify: per IP. The PDF requires a 10-second response (NFR-1) and does not give a rate. Technical default: 60 requests per minute per IP. **UNCERTAIN** as a business number.
- Authenticated APIs: 300 requests per minute per user. Technical default. **UNCERTAIN.**

### 6.5 CORS

The API allows the configured frontend origin only, with methods `GET`, `POST`, `PATCH`, `PUT`, and headers `Authorization` and `Content-Type`. Credentials are not required when the token is a bearer header. A wildcard origin is not used.

### 6.6 Environment variables

| Name | Where | Rule |
| --- | --- | --- |
| `SUPABASE_URL` | Server | Public URL of the project |
| `SUPABASE_ANON_KEY` | Server | Used to verify user JWTs. Not a secret of the service role, but still not committed if the project treats it as private |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never in Next.js, never in git, never in logs |
| `CORS_ORIGIN` | Server | Exact frontend origin |
| `PUBLIC_APP_ORIGIN` | Server | Used to build `qr_code.url` |
| `LOG_LEVEL` | Server | `info` in production |

`.env.example` lists the names with empty values. Secrets stay in the host environment. NFR-7 requires HTTPS in deployment. Local HTTP is only for the developer machine.

**Phase 1.1 note:** the current backend validates optional `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the publishable key), and `DATABASE_URL` in `backend/src/config/env.ts`. `DATABASE_URL` is for manual migration tooling only; the API runtime does not connect with it. Local `backend/.env` keeps `[YOUR-PASSWORD]` as a placeholder and is Git-ignored. `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_ORIGIN`, JWT verification, and the service-role client remain Phase 2 work; the service-role key is server-only and is never exposed to the browser. The SQL `create_qr()` stores the relative URL `/verify/<token>`; if an absolute URL is required later, the API can join it with `PUBLIC_APP_ORIGIN` without letting the client choose the token.

### 6.7 Audit logging

Every successful login, failed login, lock, create, update, approve, reject, and publish writes one `audit_log` row in the same transaction as the data change (BR-10). A failed transaction writes nothing. Login failure is written by the lockout function because there is no data transaction.

The administrator is the only reader (FR-5.5).

**Phase 1.1 note:** the applied database performs the business-table audit writes in `SECURITY DEFINER` row triggers, in the same transaction as the mutation. Ten triggers cover the listed tables; `quality_test` is insert-only. Audit detail is sanitized as described in section 3.13. `audit_log` can only be inserted by the trigger; update, delete, and truncate are rejected for all roles. A failed transaction leaves neither the mutation nor its audit row. Authentication event rows (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOCK`) remain Phase 2 work because they are not table mutations.

### 6.8 Public QR data protection

Enforced in three places: Zod catalog, `publish_config` check constraint, and `public_verify` column list. A selected key that is not in the catalog is rejected at save time (UC-09 E2). The public function does not trust the JSON array blindly; it intersects the array with the catalog again.

The response omits internal ids. `verificationStatus` is the literal `verified` when the row is returned. A hidden record is indistinguishable from an unknown token.

**Phase 1.1 note:** earlier drafts of this plan used `published` for `verificationStatus`. The applied function returns `verified`, matching the existing frontend display (`cashmeretrace/components/domain/verify/verify-page.tsx`) and the Phase 1.1 decision. `PUBLISHED` remains a `publish_config.status` value, not a `verificationStatus` value.

### 6.9 Safe errors

Section 2.5 is the contract. PostgreSQL `23505` unique violations on `batch_no` become `409 DUPLICATE` with the BR-01 message. Other constraint failures become `400` or `409` without the SQL statement.

---

## 7. Implementation plan

Work is sequential. Each phase ends when its completion criteria pass. No phase edits `cashmeretrace` source. Frontend wiring is a later task outside this plan.

### Phase 0 — Backend project skeleton

**Files:** `backend/package.json`, `tsconfig.json`, `src/server.ts`, `src/app.ts`, `src/config/env.ts`, `src/middleware/error-handler.ts`, `src/middleware/request-id.ts`, `.env.example`, `.gitignore`.

**Features:** TypeScript Express process, `/api/v1/health`, JSON error envelope, env validation that refuses to boot without `SUPABASE_URL` when a later phase needs it. Health does not need Supabase yet.

**Depends on:** Node.js LTS.

**Tests:** Health returns 200. An unknown route returns the envelope’s 404. Env validation fails when a required variable is empty.

**Done when:** `npm test` passes and the server starts without reading the frontend `.env`.

### Phase 1 — Schema, seed, integrity

**Files:** `supabase/migrations/001_schema.sql`, `supabase/seed/aimag_sum.sql`, generated `src/db/types.ts`.

**Features:** All tables, keys, checks, indexes, `quality_result` privilege revoke, aimag/sum seed for Mongolia’s current administrative names. The seed content is reference data, not a business rule. `batch_counter` and `create_batch` SQL function. `public_verify` function returning no row until publication exists.

**Depends on:** Phase 0 and a Supabase project.

**Tests:** Duplicate `batch_no` fails. Batch without supplier fails. Quality row without batch fails. Two QR rows for one batch fail. Update and delete on `quality_result` fail. Empty `public_verify` returns no row.

**Phase 1.1 implementation note (2026-11-11):** the local migration chain now has five files: `20261108000000` cleanup, `20261109000000` schema, `20261109000100` functions, `20261109000200` RLS, and `20261109000300` finalization. `backend/tests/phase1-security.test.ts` applies all five to PGlite against the local legacy backup and covers numbering overflow, same-year batch date correction and cross-year rejection, approved-supplier gating, authenticated actor binding on the batch RPC, clerk-created suppliers staying `PENDING`, admin-only approval/rejection, profile deletion/audit retention, `PUBLIC`/`anon`/`authenticated` table and sequence privileges, no `PUBLIC` function `EXECUTE`, controlled QR creation/readiness, service-role QR rejection without a user context, supplier self-registration denial, audit sanitization/single-row coverage, the public whitelist, quality append-only behavior, and rename guards. The migrations have **not** been applied to the hosted project.

**Done when:** Migrations apply on an empty database and the integrity tests pass.

### Phase 2 — Auth, profiles, lockout, RLS

**Files:** `src/modules/auth/*`, `src/middleware/authenticate.ts`, `src/middleware/require-role.ts`, `src/middleware/require-active.ts`, `src/lib/supabase.ts`, migration `002_rls.sql`, migration `003_auth_functions.sql`.

**Features:** Register, login, logout, refresh, me. Pending supplier cannot obtain a usable session. Fifth failure locks. RLS policies from section 4.6.

**Depends on:** Phase 1, Supabase Auth.

**Tests:** API tests for UC-01 E2, BR-12 pending login, BR-11 fifth failure. RLS tests: supplier JWT cannot select another supplier’s `supply_info`.

**Done when:** Those tests pass and `service_role` is referenced only in `lib/supabase.ts` and SQL definer functions.

### Phase 3 — Suppliers and approval

**Files:** `src/modules/suppliers/*`, `src/modules/audit/audit.writer.ts`.

**Features:** Clerk create and correct, admin approve and reject with reason, audit rows, BR-13 identity and technical name+sum+type check.

**Depends on:** Phase 2.

**Tests:** Self-register stays pending. Clerk-created supplier is pending with no approver and can log in only after an administrator approves it. Reject requires a reason. Duplicate identity pair returns 409. Supplier and clerk JWTs cannot approve or reject.

**Done when:** UC-01 and FR-5.6 integration tests pass.

### Phase 4 — Supply and lookups

**Files:** `src/modules/supply-info/*`, lookup routes inside that module.

**Features:** UC-02 create, list, update own, clerk/management read, aimag/sum lookups.

**Depends on:** Phase 3.

**Tests:** Supplier A cannot read supplier B. Inactive supplier receives E1. Quantity `<= 0` is rejected. Audit row written.

**Done when:** FR-1.3 and FR-1.4 tests pass.

### Phase 5 — Batches, numbering, links, trace

**Files:** `src/modules/batches/*`, SQL function tests.

**Features:** Create with locked counter, search, clerk update except `batch_no`, supply links, trace.

**Depends on:** Phase 4.

**Tests:** Two concurrent creates receive different numbers. Client-supplied `batch_no` is rejected. Link to another supplier’s supply row is rejected. Quality JWT cannot `PATCH` a batch. Search test data returns inside the test database; the 2-second target (NFR-2) is measured in Phase 10 against a seeded volume.

**Phase 1.1 note:** local PGlite tests cover rollback, per-year independence, same-year receipt-date correction, cross-year correction rejection, and overflow rejection, but not true two-session lock contention. V1 defers supply links and the link-replacement route. The local limit case is `999999`; the next value raises before `lpad()` can produce a duplicate six-digit code. The batch RPC's actor must come from the verified session context, not the request body.

**Done when:** BR-01, BR-02, and FR-2.9 tests pass.

### Phase 6 — QR and storage

**Files:** `src/modules/qr/*`, storage bucket migration.

**Features:** Create one QR, store PNG, signed URL, mark ready. No second token.

**Depends on:** Phase 5.

**Tests:** Second create returns 409. Signed URL is not present on the public route. Token is absent from log snapshots in the unit test of the logger.

**Done when:** FR-2.8 creates one row and one object.

### Phase 7 — Quality history and publication

**Files:** `src/modules/quality/*`, `src/modules/publication/*`.

**Features:** Insert-only results, batch status `TESTED`, history, compare deltas, publish catalog.

**Depends on:** Phase 6 for preview data; quality insert itself depends only on Phase 5. Publication preview does not require a QR.

**Tests:** Update HTTP method is not routed. History keeps both rows. Personal field name is rejected. Empty selection stays private. Supplier reads only own history.

**Done when:** FR-3.3, FR-3.4, and FR-3.5 tests pass.

### Phase 8 — Public verification

**Files:** `src/modules/public-verify/*`, rate-limit middleware on this route.

**Features:** `GET /public/verify/:token` through `public_verify`. Same 404 body for unknown, not ready, and private.

**Depends on:** Phases 6 and 7.

**Tests:** Ready + published returns only selected keys. A fixture row that contains a supplier phone is not in the JSON. Not-ready QR returns 404. Response does not include `lab_result` or `supplier_id`.

**Done when:** NFR-10 and NFR-13 fixture tests pass. Timing against NFR-1 is Phase 10.

### Phase 9 — Reports

**Files:** `src/modules/reports/*`.

**Features:** Supply, quality, region aggregates, CSV download.

**Depends on:** Phases 4 and 7.

**Tests:** Management can read. Clerk receives 403. Averages ignore null indicators. CSV is UTF-8 and contains no phone or email column.

**Done when:** FR-4.2–FR-4.6 tests pass. File format remains documented as a technical CSV choice.

### Phase 10 — Admin, settings shell, audit read, hardening

**Files:** `src/modules/admin/*`, `src/middleware/cors.ts`, `src/middleware/rate-limit.ts`.

**Features:** User create, role change, staff status, empty settings list, audit query, CORS, rate limits.

**Depends on:** Phase 2, and audit rows from Phases 3–9.

**Tests:** Non-admin receives 403 on audit. Role change writes audit. Login rate limit returns 429. Error bodies contain no SQL. Load check: public verify p95 ≤ 10 s and batch search p95 ≤ 2 s on the seeded set, 50 concurrent virtual users for NFR-4 if the environment can run them.

**Done when:** The security tests in section 6 pass and the performance numbers are written into the test report. A missed NFR-4 environment is recorded as not measured, not as a pass.

### Phase 11 — Backup note

**Files:** `docs/BACKUP_CHECKLIST.md` only if the operator wants a runbook. It is not required to finish the API.

**Features:** Confirm the Supabase plan’s daily backup (NFR-16, Should) and schedule one restore rehearsal. Backup retention on the chosen plan is **UNCERTAIN** until the project is created.

**Depends on:** Phase 1 deployed to the hosted project.

**Done when:** A restore rehearsal has been executed once, or the checklist states that the hosted plan does not support it yet.

---

## 8. Traceability of every planned module

| Module or technical piece | Approved source | Not a new business feature |
| --- | --- | --- |
| `auth` | UC-10, FR-1.2, FR-2.1, FR-3.1, FR-4.1, FR-5.1, BR-11, BR-12, NFR-6, NFR-8 | |
| `suppliers` | UC-01, UC-04, FR-1.1, FR-2.2, FR-2.6, FR-5.6, BR-12, BR-13 | |
| `supply-info` | UC-02, FR-1.3, FR-1.4, BR-05 | |
| Lookups `aimag`/`sum` | FR-1.4, BR-03A, data dictionary pp. 121–131 | |
| `batches` | UC-05, UC-07, FR-2.3–FR-2.7, FR-2.9, BR-01, BR-02, BR-06 | |
| `batch_counter` | FR-2.4, BR-01, NFR-15. Format remains UNCERTAIN | Technical |
| `batch_supply_link` | Data dictionary p. 130, trace FR-2.9, design rule p. 132 | Weight ceiling UNCERTAIN |
| `qr` | UC-06, FR-2.8, NFR-24, state table pp. 108–109 | Ready transition is the PDF state, via a recorded human scan |
| Storage PNG | FR-2.8, NFR-24 | Technical |
| `quality` | UC-08, FR-3.3, FR-3.4, BR-03, BR-04, history pp. 64 and 136 | No grade thresholds |
| `publication` | UC-09, FR-3.5, BR-08, NFR-10 | |
| `public-verify` | UC-13, FR-6.1, BR-09, NFR-1, NFR-10, NFR-13 | |
| `reports` | UC-11, FR-4.2–FR-4.6, BR-07, NFR-5 | CSV is a technical file choice |
| `admin` users and roles | UC-12, FR-5.2, FR-5.3 | |
| `admin` approvals | FR-5.6, BR-12, BR-13 | |
| `system_settings` | FR-5.4 | No keys invented |
| `audit` | BR-10, NFR-14, FR-2.6, FR-5.5 | |
| RLS and JWT middleware | NFR-9, BR-05–BR-07, p. 134 | |
| Validation and error envelope | NFR-12, NFR-20 | |
| Rate limit and CORS | NFR-12, NFR-7. Numeric limits UNCERTAIN | Technical |
| Logging | Operational support for BR-10; does not replace `audit_log` | Technical |
| `/api/v1` | p. 134 | Technical |
| Daily backup check | NFR-16 | Operational |

Items deliberately absent, with the PDF reason:

| Absent item | Reason | Pages |
| --- | --- | --- |
| Payment, blockchain, laboratory API, government API | Version 2 / out of scope | 18, 117 |
| Quality pass/fail thresholds | Not in the PDF. Dictionary bounds are only input ranges | 125–127 |
| QR `REVOKED` status and token replacement | Proposal, table 109 | 109–110 |
| Lock duration and admin unlock | Proposal BR-11A | 105, 132 |
| Reapply after rejection | Undefined | 105, 109 |
| Public supplier name, phone, email | NFR-10, NFR-13, UC-09 E2 | 38, 56 |
| Delete or update of `quality_result` | History must remain | 136 |
| Physical delete of users, suppliers, batches | Status and restrict FKs | 124–129 |
| Second password table | Supabase Auth implements NFR-6 | 38, 134 |

---

## 9. Open items that block a business choice

These stay unresolved until the supervisor or the customer answers them. The implementation uses the technical behavior named in this document and does not pretend the answer is in the PDF.

1. Batch-number display pattern (p. 16, p. 109).
2. Lock duration and whether an administrator may unlock (pp. 105, 132).
3. Whether a rejected supplier may reapply (pp. 105, 109).
4. Which identity document BR-13 uses (p. 132).
5. Whether name + sum + type is the right duplicate test until that document exists.
6. Allocated-weight ceiling for `batch_supply_link` (p. 132).
7. Sort key that defines the single public quality snapshot.
8. Whether `lab_result` text may ever be published.
9. Report file type beyond “a file” (p. 36).
10. Audit retention.
11. Supabase access-token maximum on the chosen plan versus the 8-hour ceiling (NFR-8).
12. System-setting keys (FR-5.4 names the capability only).
13. Whether `supplied_at` and `received_at` may be future dates.
14. Password length and complexity beyond what Supabase Auth requires.
