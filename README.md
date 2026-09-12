# CampusFind

CampusFind is a campus lost and found portal for reporting, searching, and managing lost or found items.

## Features

- User registration and login with JWT authentication
- Create lost and found reports
- Search and filter reports by keyword, type, category, and status
- View item details and contact the reporter by email
- Edit, delete, and resolve your own reports
- Responsive light pink, yellow, and cream interface
- MongoDB persistence through Mongoose

## Requirements

- Node.js 18 or newer
- MongoDB Atlas or MongoDB Community Server
- npm

## Configuration

Create `server/.env`:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/campus-lost-found
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Do not commit `.env` or expose database credentials in source control. If the database password contains characters such as `@`, `#`, or `/`, URL-encode them in the MongoDB URI.

## Install Dependencies

```powershell
cd server
npm install

cd ..\client
npm install
```

## Run Locally

Open two terminals.

Terminal 1, start the API:

```powershell
cd C:\Users\kumar\Campus-Lost-Found-Portal\server
npm run dev
```

The API runs at `http://localhost:5000`.

Terminal 2, start the frontend:

```powershell
cd C:\Users\kumar\Campus-Lost-Found-Portal\client
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Production Build

```powershell
cd client
npm run build
npm run preview
```

## Validation

Frontend lint and build:

```powershell
cd client
npm run lint
npm run build
```

Backend syntax checks:

```powershell
cd server
node --check server.js
node --check routes/auth.js
node --check routes/listings.js
```

The server currently has no automated test suite configured yet.

## Project Structure

```text
client/                 React and Vite frontend
  src/App.jsx           Main application experience
  src/App.css           Visual system and responsive styles
  src/services/api.js   Axios API client and error helpers
server/                 Express API
  server.js             API entry point
  routes/auth.js        Registration and login
  routes/listings.js    Listing CRUD and status updates
  routes/users.js       Current user's reports
  models/               Mongoose User and Listing schemas
docs/                   Product and technical documentation
```

## API Summary

| Method | Endpoint                   | Authentication  |
| ------ | -------------------------- | --------------- |
| POST   | `/api/auth/register`       | No              |
| POST   | `/api/auth/login`          | No              |
| GET    | `/api/listings`            | No              |
| GET    | `/api/listings/:id`        | No              |
| POST   | `/api/listings`            | Yes             |
| PATCH  | `/api/listings/:id`        | Yes, owner only |
| PATCH  | `/api/listings/:id/status` | Yes, owner only |
| DELETE | `/api/listings/:id`        | Yes, owner only |
| GET    | `/api/users/me/listings`   | Yes             |

## Current Scope

The current backend supports the MVP workflow: authentication, listing CRUD, search/filtering, item details, image URLs, and returned status tracking.

Claims, notifications, messaging, file uploads, and admin moderation are not implemented because they are not supported by the current API or database models.

The project is ready for future feature enhancements.