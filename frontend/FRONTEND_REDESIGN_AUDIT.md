# Frontend redesign audit

Audit date: 2026-11-05. Scope: this existing `frontend/` checkout. Backend, database, `.env`, existing user changes and logs are not modified. The working tree already contained extensive uncommitted frontend work; the redesign builds on that state. A snapshot of the starting frontend is stored in the OS temporary directory.

## Architecture and verified contracts

React 19, JavaScript, Vite 8, React Router 7, Axios, Lucide React; plain CSS. No UI framework, chart or animation dependency is necessary. Backend: Spring controllers, request/response DTOs, services, JPA/Criteria repositories. Dates are ISO `yyyy-MM-dd`; pages are zero indexed. Books, members and role accounts return Spring Page metadata. Borrow endpoints return complete lists, so only those lists use client pagination.

Auth stores `accessToken` and `refreshToken` in localStorage. JWT contains `sub`, `role`, `permissions`, `exp`. Axios coordinates refresh with one shared promise and retries at most once. Retain this mechanism. Server enum roles are **ADMIN and USER**; **Staff is a permission-group experience**, identified by `BORROW_APPROVE` / `RETURN_CONFIRM`, not a newly invented server role.

## All existing screens/routes

| Route | Screen | Access |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Reader registration | Public |
| `/forgot-password` | Request reset OTP | Public |
| `/reset-password` | Reset password with OTP | Public |
| `/verify-email` | Email link / OTP / resend | Public |
| `/403` | Forbidden | Public |
| `/`, `/dashboard` | Dispatcher + UserDashboard / StaffDashboard / AdminDashboard | Authenticated |
| `/books` | Book catalog, search, grid/table | BOOK_VIEW |
| `/books/manage` | Book CRUD, CSV import, search, grid/table | BOOK_VIEW and one book mutation permission |
| `/members` | Reader search, CRUD, lock/unlock | MEMBER_VIEW; individual mutation permissions |
| `/borrow` | Multi-book request | BOOK_VIEW + BORROW_BOOK |
| `/return`, `/my-books` | Personal loans, history, return request | BORROW_BOOK; RETURN_BOOK for mutation |
| `/borrow-management` | Search, pagination, overdue, approve/reject/confirm | BORROW_APPROVE; RETURN_CONFIRM for return confirmation |
| `/roles` | Groups, account search, update account group | SYSTEM_MAINTENANCE |
| `/system-config` | Maintenance configuration | SYSTEM_MAINTENANCE |
| `/change-password` | Password update | Authenticated |
| `/change-email` | Request code / confirm / re-login | Authenticated |

19 page modules including role dashboards and dispatcher. Existing Sidebar/Topbar are legacy modules not mounted by MainLayout. Preserve compatible routes. Replace unknown-route silent redirect with an explicit 404 page.

## API inventory (from frontend services and backend controllers/DTOs)

All protected endpoints use Bearer access token. `Page<T>` includes `content,totalElements,totalPages,number,size,last`.

| Function | Method | Endpoint | Request | Response | Auth | Used by |
|---|---|---|---|---|---|---|
| Login | POST | /auth/login | {email,password} | {accessToken,refreshToken,tokenType} | Public | Login |
| Register | POST | /auth/register | {email,password,fullName,dateOfBirth,phone,address} | string | Public | Register |
| Verify link | GET | /auth/verify-email | query token | string | Public | VerifyEmail |
| Verify OTP | POST | /auth/verify-email-otp | {email,otp} | string | Public | VerifyEmail |
| Resend | POST | /auth/resend-verification | query email, null body | string | Public | VerifyEmail |
| Forgot password | POST | /auth/forgot-password | {email} | string | Public | ForgotPassword |
| Reset password | POST | /auth/reset-password | {email,otp,newPassword} | string | Public | ResetPassword |
| Refresh | POST | /auth/refresh | {refreshToken} | LoginResponse | Refresh token | Axios |
| Logout | POST | /auth/logout | {refreshToken} | string | Bearer when available | Layout |
| Change password | PUT | /auth/change-password | {oldPassword,newPassword} | string | Bearer | ChangePassword |
| Change email request | POST | /auth/change-email/request | {newEmail} | string | Bearer | ChangeEmail |
| Change email confirm | POST | /auth/change-email/confirm | {code} | string; old access blacklisted | Bearer | ChangeEmail |
| Search books | GET | /api/books/search | title,isbn,author,inStock,fromDate,toDate,page,size,sortBy,direction; optional sortBy2,direction2 | Page<BookResponse> | BOOK_VIEW | Catalog, borrow, dashboards |
| Create book | POST | /api/books | {title,isbn,quantity,publishedDate,image} | Book (201) | BOOK_CREATE | Book form |
| Update book | PUT | /api/books/{id} | same supported fields | Book | BOOK_UPDATE | Book form |
| Delete book | DELETE | /api/books/{id} | none | 204 | BOOK_DELETE | Confirmation |
| Import books | POST | /api/books/import | multipart file (CSV, <5MB) | {message,total} | BOOK_IMPORT | Catalog |
| Search readers | GET | /api/members/search | fullName,phone,address,fromDate,toDate,bookId,page,size,sortBy,direction | Page<MemberResponse> | MEMBER_VIEW | Members, admin |
| Reader detail | GET | /api/members/{id} | none | MemberResponse | MEMBER_VIEW | Existing service (not mounted) |
| Create reader | POST | /api/members | {accountId,fullName,dateOfBirth,phone,address} | MemberResponse (201) | MEMBER_CREATE | Member form |
| Update reader | PUT | /api/members/{id} | {fullName,dateOfBirth,phone,address} | MemberResponse | MEMBER_UPDATE | Member form |
| Delete reader | DELETE | /api/members/{id} | none | 204 | MEMBER_DELETE | Confirmation |
| Lock/unlock | PUT | /api/members/{id}/status | query enabled, null body | MemberResponse | MEMBER_UPDATE | Confirmation |
| Request loans | POST | /api/borrow | {bookIds: positive unique IDs[]} | {message,total,items: BorrowResponse[]} (201) | BORROW_BOOK | BorrowBook |
| Personal history | GET | /api/borrow/me | none | BorrowResponse[] | BORROW_BOOK | Reader home, personal loans |
| Request return | PUT | /api/borrow/{id}/request-return | no body | BorrowResponse | RETURN_BOOK | Personal loans |
| Manage loans | GET | /api/borrow/manage | memberName,bookTitle,fromDate,toDate,date,status | BorrowResponse[] | BORROW_APPROVE | Management, operations home |
| Approve | PUT | /api/borrow/{id}/approve | no body | BorrowResponse | BORROW_APPROVE | Management, staff home |
| Reject | PUT | /api/borrow/{id}/reject | no body (no reason supported) | BorrowResponse | BORROW_APPROVE | Confirmation |
| Confirm return | PUT | /api/borrow/{id}/confirm-return | no body | BorrowResponse | RETURN_CONFIRM | Management |
| Permission groups | GET | /api/admin/roles/groups | none | {id,name,description,permissions}[] | SYSTEM_MAINTENANCE | Roles |
| Account search | GET | /api/admin/roles/accounts | search,page,size (Spring Pageable) | Page<AccountRoleResponse> | SYSTEM_MAINTENANCE | Roles |
| Assign group | PUT | /api/admin/roles/accounts/{accountId} | {groupId} | AccountRoleResponse | SYSTEM_MAINTENANCE | Roles |
| Read config | GET | /api/system-config | none | {id,maintenanceMode} | SYSTEM_MAINTENANCE | Admin, config |
| Maintenance | PUT | /api/system-config/maintenance | {maintenanceMode:boolean} | SystemConfig | SYSTEM_MAINTENANCE | Config |

Backend also has book list/detail and alternative search endpoints, member list, `/api/test` helpers. They do not require new UI or fabricated features. No category, reservation, renewal, favorites, notification feed, export, report or audit-log API exists in the inspected controllers. Do not display those as working features. No WebSocket or polling is present.

## Workflow traces and invariants

- Book form -> handleSubmit -> bookApi -> axiosClient -> BookController -> BookService -> BookRepository. Preserve five supported fields; `authorNames` is returned but is not editable by these DTOs. `quantity` is available stock, not total copies. Images are URLs; CSV is the only upload.
- Borrow selection -> confirmation -> borrowBooks({bookIds}) -> BorrowController -> BorrowService -> BorrowRecordRepository. Creates PENDING without decrementing stock. Approval checks account/stock, decrements stock, sets BORROWED and due date +14 days.
- Reader return confirmation -> requestReturn(id) -> owner/status validation -> RETURN_PENDING. Staff confirms -> increments stock -> RETURNED and actual return date. REJECTED is terminal. Use server isOverdue/overdueDays, including historical late returns.
- Reader form -> memberApi -> MemberController -> MemberService -> MemberRepository / AccountRepository. Account linkage only on create. Server handles deletion protection and soft deletion. Do not execute destructive requests as part of testing against real data.
- Role dialog -> updateAccountRole(accountId,groupId) -> RoleController -> RoleService -> AccountRepository / PermissionGroupRepository. Server protects admin/self; UI gates follow permissions.
- Authentication -> authApi -> AuthController -> AuthService / OTP services -> AccountRepository and token repositories. Keep localStorage keys and refresh path. Never log response tokens.

## Baseline risks found before changes

Build passes. ESLint: 41 errors, 5 warnings. Runtime undefined identifiers in member handlers and book/member validation; inconsistent CSS selectors; unstable toast context object causing effects to refetch; search deep links ignored by borrow screen; author/quantity fields wrong in cards/search; fake system/shift status and opening hours; API failures converted to zero metrics/empty lists; dialogs lack focus trapping; mutations allow repeated submit; overdue recomputed incorrectly client-side; old requests can overwrite newer filters. Fix within frontend; keep server contracts.

## Design decisions

Direction: **Quiet Library / editorial workspace**. Teal ink, slate neutrals, warm paper book covers, strong spacing and restrained typography. Be Vietnam Pro body; Noto Serif display where useful. 4/8px spacing, 8/12/16px corners, 150–220ms motion, reduced-motion support. Shared CSS tokens and primitives cover every module; reader uses a discovery header, staff/admin use a collapsible workspace sidebar with permission-filtered navigation. Light/dark is persisted before initial paint. No dependency additions. Design feasibility score: impact 4 + fit 5 + feasibility 5 + performance 5 - consistency risk 4 = 15.

Assumption: preserve the existing Aura Library name. Use current API's page size 10. Do not invent scale requirements or health telemetry. API errors must be visible with retry; unknown values show an em dash rather than zero.

## Verification

Results and per-feature status are recorded after implementation in `FRONTEND_REDESIGN_REPORT.md`. Live authenticated business flows require valid existing accounts; isolated browser fixtures, when used, are test data only and never application data.
