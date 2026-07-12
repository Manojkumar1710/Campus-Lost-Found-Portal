# Technical Design Document (TDD)

**Project Name:** FindIt — Campus Lost & Found Portal

---

## A. Tech Stack
- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js with Express
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT (JSON Web Tokens)
- **Testing:** Jest + Supertest (backend), React Testing Library (frontend)
- **Image Handling (MVP):** Image URL field, OR base64 string stored in DB (no cloud storage for MVP)

## B. Testing Policy — Red-Green-Refactor (Mandatory)
Every API endpoint in this project **must** be built using the Red-Green-Refactor cycle:
1. **Red:** Write a failing test first that describes the expected behavior of the endpoint (e.g., "returns 401 if no token provided").
2. **Green:** Write the minimum code required to make that test pass.
3. **Refactor:** Clean up the implementation (naming, structure, duplication) while keeping the test green.

No endpoint may be merged to `main` without an accompanying test file demonstrating this cycle was followed (commit history should show a failing test commit before the passing implementation commit).

## C. API Design
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|----------------|
| POST | `/api/auth/register` | Create a new user account | No |
| POST | `/api/auth/login` | Authenticate and return JWT | No |
| GET | `/api/listings` | Fetch all listings (supports `?search=&category=&status=` query params) | No |
| GET | `/api/listings/:id` | Fetch a single listing's full detail | No |
| POST | `/api/listings` | Create a new Lost/Found listing | Yes |
| PATCH | `/api/listings/:id` | Update listing details (owner only) | Yes |
| PATCH | `/api/listings/:id/status` | Change status to `Returned` (owner only) | Yes |
| DELETE | `/api/listings/:id` | Delete a listing (owner only) | Yes |
| GET | `/api/users/me/listings` | Fetch listings belonging to the logged-in user | Yes |

## D. Database Schema (Prisma)

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  password  String
  name      String
  createdAt DateTime  @default(now())
  listings  Listing[]
}

model Listing {
  id          Int      @id @default(autoincrement())
  type        String   // "LOST" or "FOUND"
  title       String
  description String
  category    String   // Electronics, Documents, Clothing, Accessories, Other
  location    String
  imageUrl    String?
  status      String   @default("Pending") // "Pending" | "Returned"
  date        DateTime
  createdAt   DateTime @default(now())
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
}
```

## E. Implementation Strategy
- **Phase 1 (Database):** Set up Postgres, define Prisma schema for `User` and `Listing`, run initial migration.
- **Phase 2 (Backend):** Build and test (Red-Green-Refactor) all auth and listing endpoints. JWT middleware protects create/update/delete/status routes and enforces ownership checks.
- **Phase 3 (Frontend):** Build listing creation form, browse/search/filter view, listing detail page, and "My Listings" page.
- **Phase 4 (Deployment):** Frontend on Vercel, backend on Render/Railway.

---

## How to Start
1. Create a shared GitHub Repository.
2. Populate `BRD.md` and `TDD.md` in the `/docs` folder.
3. **No code should be written until these files are committed and reviewed by the group.**

---

## F. Sprint & Story Breakdown

### Sprint 1: Infrastructure & Auth (The Foundation)
**Goal:** Get the environment ready and ensure users can securely enter the system.

- **Story 1 — Database Setup**
  As a Developer, I want to initialize the database with `User` and `Listing` schemas so that we have a structured way to store data.
  *Acceptance Criteria:* Prisma client generated; migration applied to local Postgres instance.

- **Story 2 — User Registration**
  As a User, I want to sign up with an email and password so that I can have a private account.
  *Acceptance Criteria:* Password encrypted (bcrypt); test written first (Red) confirming 201 on valid signup and 400 on duplicate email (Green); user record saved in DB.

- **Story 3 — User Authentication**
  As a User, I want to log in to my account so that I can post and manage listings.
  *Acceptance Criteria:* Test-first confirms valid login returns JWT; unauthorized attempts return 401.

### Sprint 2: Core Functionality (The Build)
**Goal:** Enable the primary workflow — posting, browsing, and searching listings.

- **Story 4 — API: Create Listing**
  As a User, I want to post a lost or found item so that others can see it.
  *Acceptance Criteria:* Validates required fields (type, title, category, location); returns created listing; only accessible with valid JWT.

- **Story 5 — API: Search & Filter Listings**
  As a User, I want to search and filter listings by keyword, category, and status so that I can quickly find relevant items.
  *Acceptance Criteria:* `GET /api/listings` supports combinable query params; test-first covers empty results and matching results.

- **Story 6 — Frontend: Post Item Form**
  As a User, I want a form to submit a lost/found item, including an image URL, so that I don't need API tools.
  *Acceptance Criteria:* Form validates required fields; image preview renders from URL; triggers API call on submit.

- **Story 7 — Frontend: Browse & Search UI**
  As a User, I want to browse and filter listings visually so that I can find my item without technical knowledge.
  *Acceptance Criteria:* Search bar and category/status dropdowns update the listing grid in real time.

### Sprint 3: Status Tracking & Polish (The Reunion)
**Goal:** Close the loop — let users manage and resolve their listings, and ensure the app is reliable.

- **Story 8 — API: Update Status**
  As a User, I want to mark my listing as "Returned" so that others know it's no longer active.
  *Acceptance Criteria:* Only the listing owner can change status; test-first confirms 403 for non-owners; status only moves Pending → Returned.

- **Story 9 — API/Frontend: Delete & Edit Listing**
  As a User, I want to edit or delete my own listing so that my records stay accurate.
  *Acceptance Criteria:* Ownership enforced server-side; UI only shows edit/delete buttons on the user's own listings.

- **Story 10 — Frontend: My Listings Dashboard**
  As a User, I want to see all my posted listings in one place so that I can manage their status.
  *Acceptance Criteria:* Dashboard lists user's listings with status badges and edit/delete/mark-returned actions.

- **Story 11 — Quality Assurance & Bug Bash**
  As a Team, we want to perform a code audit so that we remove any "vibe-coded" technical debt.
  *Acceptance Criteria:* Every endpoint has a Red-Green-Refactor test suite; no console errors; all code documented.

---

## G. Definition of Done (DoD)
Applies to every story above:
- [ ] **Code Reviewed:** At least one other team member has read the PR.
- [ ] **Test-Driven:** Red-Green-Refactor cycle followed and visible in commit history.
- [ ] **Deployed:** The feature works in the development environment.
- [ ] **Merged:** The code is in the `main` branch.

## H. Board Management
Create a Kanban board with columns:
`Backlog` → `In Progress` (assigned to student) → `Peer Review` (needs teammate check) → `Done` (merged to main).
