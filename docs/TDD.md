# Technical Design Document

## CampusFind: Campus Lost & Found Portal

**Version:** 1.0
**Status:** Implemented MVP
**Last updated:** September 2026

## 1. Purpose

CampusFind is a web application that helps students report, discover, and manage lost and found items on campus. Users can create lost or found reports, search the community listings, view item details, contact reporters by email, and manage the reports they own.

This document describes the technical design of the working application.

## 2. Scope

### In scope

- User registration and login
- JWT-based authentication
- Lost and found listing creation
- Listing search and filtering
- Listing detail view
- Image URL support
- Owner-only edit, delete, and resolve actions
- User report history
- Responsive React interface
- MongoDB persistence
- Vercel frontend deployment
- Render backend deployment

### Out of scope

The current API and database models do not implement the following features:

- Claims and claim approval workflows
- In-app messaging
- Notifications
- File uploads or cloud image storage
- Admin moderation and roles
- Multiple campuses
- Automatic archiving

These features must not be represented as working functionality until their backend contracts and data models are designed and implemented.

## 3. Architecture

```text
Browser
  |
  | HTTPS / JSON API requests
  v
Vercel React/Vite frontend
  |
  | Axios, VITE_API_URL
  v
Render Express API
  |
  | Mongoose
  v
MongoDB Atlas
```

### Frontend

- React 19
- Vite 8
- Axios for HTTP requests
- CSS design tokens and responsive media queries
- Browser local storage for the JWT and basic logged-in user information

### Backend

- Node.js
- Express 5
- Mongoose 9
- JSON Web Tokens
- bcrypt password hashing
- CORS
- dotenv environment configuration

### Deployment

- Frontend: Vercel, using the `client` directory
- Backend: Render, using the `server` directory
- Database: MongoDB Atlas

## 4. Repository Structure

```text
client/
  src/
    App.jsx              Main React application and UI flows
    App.css              Visual tokens, layouts, responsive rules, animations
    index.css            Global document reset
    main.jsx             React entry point
    services/api.js      Axios client and API error helpers
  package.json

server/
  server.js              Express application entry point
  middleware/auth.js     JWT authentication middleware
  models/User.js         User Mongoose schema
  models/Listing.js      Listing Mongoose schema
  routes/auth.js         Registration and login endpoints
  routes/listings.js     Listing CRUD and status endpoints
  routes/users.js        Current-user listing endpoint
  package.json

docs/
  BRD.md                 Business requirements
  TDD.md                 Technical design
```

## 5. Data Model

### User

Collection: `users`

| Field      | Type     | Rules                                |
| ---------- | -------- | ------------------------------------ |
| `_id`      | ObjectId | MongoDB generated identifier         |
| `name`     | String   | Required, trimmed                    |
| `email`    | String   | Required, unique, lowercase, trimmed |
| `password` | String   | Required, bcrypt hash only           |

Passwords are never stored in plain text and are not returned by the authentication responses.

### Listing

Collection: `listings`

| Field         | Type     | Rules                                          |
| ------------- | -------- | ---------------------------------------------- |
| `_id`         | ObjectId | MongoDB generated identifier                   |
| `type`        | String   | Required; `LOST` or `FOUND`                    |
| `title`       | String   | Required, trimmed                              |
| `description` | String   | Required, trimmed                              |
| `category`    | String   | Required; supported category value             |
| `location`    | String   | Required, trimmed                              |
| `imageUrl`    | String   | Optional HTTP/HTTPS URL                        |
| `status`      | String   | `Pending` or `Returned`; defaults to `Pending` |
| `date`        | Date     | Required                                       |
| `userId`      | ObjectId | Required reference to `User`                   |
| `createdAt`   | Date     | Mongoose timestamp                             |
| `updatedAt`   | Date     | Mongoose timestamp                             |

Supported categories:

- Electronics
- Documents
- Clothing
- Accessories
- Other

## 6. Authentication and Authorization

### Registration

1. The client submits name, email, and password.
2. The server trims and normalizes the email address.
3. The server validates required fields, email format, and minimum password length.
4. bcrypt hashes the password.
5. The user is saved to MongoDB.
6. The server returns a signed JWT and safe user details.

### Login

1. The client submits email and password.
2. The server normalizes the email and finds the user.
3. bcrypt compares the submitted password with the stored hash.
4. The server returns a seven-day JWT and safe user details.

### Protected requests

The client sends:

```http
Authorization: Bearer <jwt>
```

The authentication middleware verifies the token using `JWT_SECRET` and attaches the user identity to the request.

### Ownership rules

Only the listing owner can:

- Update a listing
- Delete a listing
- Change `Pending` to `Returned`

These rules are enforced on the server. Frontend visibility controls are not treated as security boundaries.

## 7. API Contract

Base URL:

```text
/api
```

| Method   | Endpoint               | Auth       | Purpose                                 |
| -------- | ---------------------- | ---------- | --------------------------------------- |
| `POST`   | `/auth/register`       | No         | Create a user and return a JWT          |
| `POST`   | `/auth/login`          | No         | Authenticate a user and return a JWT    |
| `GET`    | `/listings`            | No         | List reports with optional filters      |
| `GET`    | `/listings/:id`        | No         | Return one report with reporter details |
| `POST`   | `/listings`            | Yes        | Create a lost or found report           |
| `PATCH`  | `/listings/:id`        | Yes, owner | Update report details                   |
| `PATCH`  | `/listings/:id/status` | Yes, owner | Mark a report as returned               |
| `DELETE` | `/listings/:id`        | Yes, owner | Delete a report                         |
| `GET`    | `/users/me/listings`   | Yes        | Return the logged-in user's reports     |

### Listing query parameters

`GET /listings` supports:

- `search`: searches title, description, and location
- `category`: exact category filter
- `status`: `Pending` or `Returned`
- `type`: `LOST` or `FOUND`

Example:

```text
/api/listings?search=wallet&type=LOST&category=Accessories&status=Pending
```

### Common status codes

| Status | Meaning                             |
| ------ | ----------------------------------- |
| `200`  | Successful read or update           |
| `201`  | Resource created                    |
| `400`  | Invalid input                       |
| `401`  | Missing, invalid, or expired JWT    |
| `403`  | Authenticated user is not the owner |
| `404`  | Listing or resource not found       |
| `500`  | Unexpected server failure           |

## 8. Frontend Design

The application uses a single React shell with view state for:

- Discover and browse listings
- Report creation and editing
- My reports
- Profile and settings
- Authentication modal
- Listing detail modal

The frontend preserves live API data and does not use mock listings or fake statistics.

### UI states

API-driven areas provide:

- Loading skeletons
- Empty states
- Human-readable error toasts
- Success feedback
- Disabled submit buttons during requests

### Responsive behavior

The CSS adapts through fluid typography and breakpoints for:

- Desktop
- Laptop
- Tablet
- Mobile

The hero uses layered decorative cards with lightweight CSS transforms and respects `prefers-reduced-motion`.

## 9. Configuration

### Local backend: `server/.env`

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/campus-lost-found
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

### Vercel frontend environment variable

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

Secrets must be configured in hosting-provider environment settings and must not be committed to Git.

## 10. Local Development

Install dependencies:

```powershell
cd server
npm install

cd ..\client
npm install
```

Run the backend:

```powershell
cd server
npm run dev
```

Run the frontend in a second terminal:

```powershell
cd client
npm run dev
```

Default local addresses:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 11. Deployment Procedure

### Backend on Render

- Repository: `Manojkumar1710/Campus-Lost-Found-Portal`
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Required environment variables: `MONGO_URI`, `JWT_SECRET`, and `PORT`

### Frontend on Vercel

- Repository: `Manojkumar1710/Campus-Lost-Found-Portal`
- Root directory: `client`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Required environment variable: `VITE_API_URL`

## 12. Validation and Testing

### Existing checks

```powershell
cd client
npm run lint
npm run build

cd ..\server
node --check server.js
node --check routes/auth.js
node --check routes/listings.js
```

The server currently has a placeholder test script and does not yet contain automated endpoint tests.

### Manual acceptance checklist

- Register with valid details
- Reject invalid registration input
- Log in with valid credentials
- Reject invalid login credentials
- Browse listings without signing in
- Search by title, description, and location
- Filter by type, category, and status
- View listing details
- Require authentication before creating a report
- Create a lost report
- Create a found report
- Edit an owned report
- Delete an owned report
- Mark an owned report as returned
- Confirm another user cannot edit, delete, or resolve the report
- Confirm data persists after refresh
- Test desktop, tablet, and mobile widths
- Test the deployed Vercel frontend against the deployed Render API


## 13. Product Stories

### Story 1: Create an account and sign in

As a campus user, I want to register and sign in securely so that I can manage my own lost and found reports.

**Acceptance criteria:**

- A user can register with a name, email address, and password.
- Passwords are hashed before they are stored.
- Duplicate email addresses and invalid credentials return clear errors.
- Successful registration or login returns a JWT and safe user details.
- Protected actions require a valid JWT.

### Story 2: Report a lost or found item

As a campus user, I want to publish a lost or found report so that other users can help identify the item.

**Acceptance criteria:**

- An authenticated user can choose `LOST` or `FOUND`.
- The report accepts title, description, category, location, date, and an optional image URL.
- Required fields are validated in the client and server.
- A successful report is stored in MongoDB with `Pending` status.
- The interface shows loading and success or error feedback.

### Story 3: Search and view reports

As a campus user, I want to search and filter reports so that I can quickly find a matching item.

**Acceptance criteria:**

- Users can search title, description, and location.
- Users can filter by lost/found type, category, and status.
- Results come from the live API and MongoDB data.
- Loading, empty, and error states are displayed clearly.
- Selecting a result opens its full details, including permitted reporter contact information.

### Story 4: Manage my reports

As a report owner, I want to update, resolve, or delete my reports so that the information stays accurate.

**Acceptance criteria:**

- An authenticated user can view their own reports.
- Only the owner can edit or delete a report.
- Only the owner can change a report from `Pending` to `Returned`.
- The interface provides edit, resolve, and delete actions for owned reports.
- Unauthorized ownership attempts are rejected by the server with `403`.

### Story 5: Use the portal on any device

As a student using a desktop, tablet, or phone, I want the portal to remain readable and usable at every screen size.

**Acceptance criteria:**

- The layout adapts automatically across desktop, laptop, tablet, and mobile widths.
- Navigation, forms, cards, modals, and toasts do not cause horizontal overflow.
- Buttons and fields remain touch-friendly on mobile.
- The hero card animation is subtle and respects `prefers-reduced-motion`.
- The production client builds successfully and connects to the deployed API.

## 14. Definition of Done

A change is complete when:

- Existing API contracts and business behavior are preserved.
- Client lint and production build pass.
- Backend syntax checks pass.
- Relevant manual acceptance checks pass.
- Responsive behavior is checked at desktop, tablet, and mobile widths.
- Secrets are excluded from Git.
- The change is reviewed and deployed through the appropriate hosting service.
