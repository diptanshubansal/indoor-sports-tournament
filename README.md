# Indoor Sports Tournament Management System

A centralized platform for managing indoor sports tournaments, participants, committee members, attendance, announcements, versioned rules, live leaderboards, and modular future game integrations.

---

## 🏗️ Architecture

The system is split into two primary components:
1. **`backend/`**: Node.js & Express API server connected to MongoDB Atlas. Uses JWT authentication, Role-Based Access Control (RBAC), Helmet, Express Rate Limiter, and Audit logging trackers.
2. **`frontend/`**: React.js SPA initialized via Vite, styled using Tailwind CSS for a premium dark/light sports theme, containing graphs constructed with Recharts, custom animated Toasts, and full mobile-responsiveness.

---

## 🎯 Modular Game Integration System

To support future additions of indoor sports like **Badminton**, **Table Tennis**, **Chess**, **Carrom**, **Pool**, and **Snooker** without changing the core database schema:
- **`backend/src/games/gameRegistry.js`** contains the game strategies scoring dictionary.
- The `Leaderboard` Mongoose schema uses a flexible `customStats` (mongoose `Mixed` field) to store specific records (e.g. frames, wickets, checkmates, sets won) while calculating standard standing points (wins, losses, draws, net score) dynamically based on the game type of the tournament.
- Submitting a game score in `POST /api/leaderboard/match-result` reads the registered algorithm and automatically adjusts ranks.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URL

### Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
4. Define your `MONGODB_URI` connection string and `JWT_SECRET` key in `.env`.
5. Pre-populate default settings and the Super Admin user (`superadmin` / `SuperAdmin@123`):
   ```bash
   npm run seed
   ```
6. Spin up the API server:
   ```bash
   npm run dev
   ```
   *(Running health checks on `http://localhost:5000/health`)*

### Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
4. Fire up the Vite local server:
   ```bash
   npm run dev
   ```
   *(Access the app at `http://localhost:3000`)*

---

## 📑 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /login`: Log in credentials (returns JWT and user metadata).
- `POST /logout`: Audit-logs user logout and resets sessions.
- `GET /me`: Fetches current profile settings.
- `POST /forgot-password`: Simulates recovery codes (RESET_123456).
- `POST /reset-password`: Commits password adjustments.

### Tournaments (`/api/tournaments`)
- `GET /`: Lists tournaments (filters out archived by default).
- `POST /`: Creates a new tournament.
- `PUT /:id`: Modifies tournament info.
- `POST /:id/archive`: Soft-archives tournament lists.
- `DELETE /:id`: Permanently deletes tournaments.

### Participants (`/api/participants`)
- `GET /`: Fetches athletes list (supports search query, gender, and college filters).
- `POST /`: Registers a new participant.
- `PUT /:id`: Edits profile records.
- `DELETE /:id`: Deletes athlete profile.

### Teams (`/api/teams`)
- `GET /`: Lists teams (optionally filtered by tournament).
- `POST /`: Registers new team roster.
- `PUT /:id`: Modifies players list, team manager, or captain.
- `DELETE /:id`: Removes team and unassigns members.

### Attendance (`/api/attendance`)
- `GET /`: Get attendance logs for a specific category and date.
- `POST /`: Saves bulk daily status.
- `POST /qr`: Simulates QR scan checking (logs check-in).
- `GET /stats`: Aggregates historical logs for analytical dashboard charts.

### Leaderboard (`/api/leaderboard`)
- `GET /`: Standings list.
- `POST /match-result`: Commits game outcomes and updates points.
- `POST /reset/:tournamentId`: Erases score standing back to zero.

### Rules (`/api/rules`)
- `GET /`: View rules (viewers only see published drafts).
- `POST /`: Add rules text.
- `PUT /:id`: Modify rules (increments version and saves history logs).
- `POST /:id/publish`: Publish a draft document.

### Announcements (`/api/announcements`)
- `GET /`: Bulletin lists.
- `POST /`: Compose notice (supports scheduling dates and pin banner toggles).
- `DELETE /:id`: Deletes notice.

### System Users (Super Admin Only) (`/api/users`)
- `GET /`: Lists committee accounts.
- `POST /`: Registers Admin or Viewer account.
- `PUT /:id`: Modifies role scopes/active status.
- `DELETE /:id`: Deletes account.

### System Audits (Super Admin Only) (`/api/audit-logs`)
- `GET /`: Lists database transaction audits.

---

## 🌐 Deployment Configuration

### Frontend (Vercel)
The root directory houses `frontend/vercel.json` configured with index.html rewrites. Connect the GitHub repository to Vercel, select the `frontend` root, select Vite framework preset, and set:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_API_URL` pointing to your Render backend API.

### Backend (Render)
Create a Web Service on Render, link the GitHub repository, select `backend` as the base directory, choose Node.js runtime, and configure:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: Define `MONGODB_URI` and `JWT_SECRET`. Run the seeding command `npm run seed` during build shell hooks or as a one-time Render cron job.
