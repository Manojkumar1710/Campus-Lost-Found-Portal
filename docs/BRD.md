# Business Requirements Document (BRD)

**Project Name:** FindIt — Campus Lost & Found Portal
**Team:** _[Fill in team name]_
**Date:** _[Fill in]_

---

## 1. Objective
Provide a centralized web platform where students can report lost items, post found items, search/filter listings by category or keyword, and track the status of an item (Pending → Returned) until it is safely reunited with its owner.

## 2. Problem Statement
Lost items on campus are currently reported informally (WhatsApp groups, physical noticeboards, word of mouth), making it hard to search, verify ownership, or know if an item has already been claimed. This project centralizes that process into a searchable, status-tracked system.

## 3. Scope

### 3.1 Must-Have Features (MVP — required for Sprint 1–3 delivery)
| # | Feature | Description |
|---|---------|-------------|
| 1 | User Authentication | Sign up / log in securely (student accounts only). |
| 2 | Post an Item | Create a "Lost" or "Found" listing with title, description, category, date, and location. |
| 3 | Image Attachment | Attach an image via URL (or local file simulated as base64/local storage for MVP — no cloud storage required). |
| 4 | Browse Listings | View all active listings in a paginated/scrollable list. |
| 5 | Search & Filter | Search by keyword; filter by category (Electronics, Documents, Clothing, Accessories, Other) and status. |
| 6 | Status Tracking | Each listing has a status: `Pending` or `Returned`. Only the post owner can mark it `Returned`. |
| 7 | Item Detail View | Clicking a listing shows full details, image, and poster's contact info (email only for MVP). |
| 8 | My Listings | A user can view/edit/delete only their own posts. |

### 3.2 Nice-to-Have Features (post-MVP, stretch goals)
| # | Feature | Description |
|---|---------|-------------|
| 1 | In-app Messaging | Contact the poster without exposing email directly. |
| 2 | Push/Email Notifications | Notify a "Lost" poster when a similar "Found" item is posted. |
| 3 | Admin Moderation Panel | Campus staff can flag/remove inappropriate posts. |
| 4 | Auto-archive | Listings older than 60 days auto-move to an "Archived" status. |
| 5 | Map/Location Pin | Pin the location on a campus map instead of free text. |
| 6 | Image Upload to Cloud | Real file upload (e.g., Cloudinary/S3) instead of URL/local simulation. |

> **Rule:** Nothing in section 3.2 may be started until all of 3.1 is built, tested, and reviewed.

## 4. Functional Requirements
- Users must be able to sign up and log in securely.
- Users must be able to create a listing with type (Lost/Found), title, description, category, date, optional image, and location.
- Users must be able to search listings by keyword and filter by category and status.
- Users must be able to view full details of any listing.
- Only the listing owner may edit, delete, or change the status of their own listing.
- Status must transition only `Pending → Returned` (no reopening for MVP — reopening is a nice-to-have).

## 5. Non-Functional Requirements
- **Security:** Passwords hashed with Bcrypt; protected routes require a valid JWT.
- **Performance:** Search/filter results must return in under 1.5 seconds for up to 1,000 listings.
- **Responsiveness:** Fully usable on mobile and desktop browsers.
- **Data Integrity:** A listing can never be deleted by anyone other than its owner.

## 6. Out of Scope (explicitly excluded from this project)
- Payment or reward systems for returned items.
- Real-time chat (websockets) — email contact only for MVP.
- Multi-campus support.

## 7. Success Criteria
- A student can post a found item and another student can find it via search within 2 minutes of posting.
- All Must-Have features pass QA with zero critical bugs before demo day.
