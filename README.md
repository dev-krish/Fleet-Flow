# FleetFlow — Transport & Logistics Management System

FleetFlow is a production-level, enterprise-grade Transport Management System (TMS) designed for a manufacturing company. It utilizes a modular MERN stack architecture with Role-Based Access Control (RBAC), live simulated GPS coordinates tracking via Socket.IO, custom Leaflet maps rendering truck route vectors, analytical dashboards, and local file storage with Multer.

---

## Technical Features

1. **Role-Based Access Control (RBAC)**:
   - **Admin**: System configurations, user/driver directories, database deletions.
   - **Dispatcher**: Allocates available vehicles and drivers to shipments.
   - **Warehouse Manager**: Registers delivery shipments, loads weights, coordinates presets.
   - **Driver**: Mobile portal showing assigned deliveries, route updates, comments feed, and Multer POD uploads.
2. **Real-time Live Operations Map**:
   - Leaflet.js maps drawing custom animated truck icons.
   - GPS simulators moving trucks step-by-step along coordinates paths.
3. **Analytics Dashboard**:
   - Recharts visual metrics showing completed deliveries, truck deployment stacks, and status distributions.
   - Operations timeline logging warehouse and dispatch activities.
4. **Resilient Mock Database Fallback**:
   - If local MongoDB instances are down, the server automatically reads and writes from an in-memory database populated with seed values (`mockDb.js`).

---

## Quick Demo Credentials

For recruiter reviews and immediate dashboard explorations:
* **Admin Portal**:
  * **Email**: `admin@fleetflow.com`
  * **Password**: `password123`
* **Dispatcher Portal**:
  * **Email**: `dispatcher@fleetflow.com`
  * **Password**: `password123`
* **Warehouse Manager Portal**:
  * **Email**: `warehouse@fleetflow.com`
  * **Password**: `password123`
* **Driver Portal**:
  * **Email**: `driver@fleetflow.com`
  * **Password**: `password123`

---

## Folder Directory Structure

```
FleetFlow/
 ├── backend/
 │    ├── src/
 │    │    ├── config/         # MongoDB and Mock JSON databases
 │    │    ├── controllers/    # Express controllers (Auth, Shipments, Vehicles, Drivers, Analytics)
 │    │    ├── middleware/     # JWT protection, RBAC checks, Multer uploads, Errors
 │    │    ├── models/         # Mongoose schemas (User, Vehicle, Driver, Shipment, Notification)
 │    │    ├── routes/         # Express routing definitions
 │    │    ├── services/       # GPS Simulator, Notification dispatcher
 │    │    ├── sockets/        # Socket.IO connection configurations
 │    │    └── utils/          # Standard response utilities, token signers
 │    ├── uploads/             # local image storage directory for Proof of Deliveries
 │    ├── server.js            # Node HTTP server launcher
 │    └── package.json
 ├── frontend/
 │    ├── src/
 │    │    ├── assets/         # CSS styles
 │    │    ├── components/     # Visual skeletons loading loaders
 │    │    ├── context/        # Theme, Auth, and WebSockets contexts
 │    │    ├── hooks/          # useAuth, useSocket, useTheme
 │    │    ├── layouts/        # Auth layouts, Sidebars layouts shell
 │    │    ├── pages/          # Login, Analytics, Shipments, Kanban board, Live tracking, Driver portal
 │    │    ├── routes/         # Protected routes and navigation matrices
 │    │    ├── services/       # Axios API hooks (auth, shipments, vehicles, drivers)
 │    │    └── App.jsx         # Context binders
 │    └── package.json
 └── README.md
```

---

## Local Installation Guide

### Prerequisites
- Node.js installed locally (version >= 18.0.0).
- MongoDB (optional - server automatically falls back to in-memory JSON if local connection is refused).

### 1. Configure Environment File
Create a `.env` file inside `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fleetflow
JWT_SECRET=fleetflow_jwt_secret_key_2026_super_secure
JWT_REFRESH_SECRET=fleetflow_jwt_refresh_secret_key_2026_super_secure
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 2. Seed Database Data
Populate users, vehicles, transit shipments, and audit logs:
```bash
cd backend
npm run seed
```

### 3. Start Backend server
Launch Express Node.js application:
```bash
npm run dev
```

### 4. Setup Frontend
Install client dependencies and launch Vite React app:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## API Router Summary

### Authentication (`/api/auth`)
- `POST /register` — Sign up users or drivers.
- `POST /login` — Authenticate and retrieve JWT + Refresh token.
- `POST /logout` — Invalidate user tokens.
- `POST /refresh` — Issue rotated access tokens.
- `GET /me` — Retrieve active profile.

### Shipment Workspace (`/api/shipments`)
- `GET /` — Fetch shipments with status/priority filtering.
- `POST /` — Register a shipment (Warehouse Manager / Admin).
- `GET /:id` — Load comments and status history timelines.
- `PUT /:id/assign` — Allocate driver and vehicle (Dispatcher / Admin).
- `PUT /:id/status` — Modify shipment status (Driver / Dispatchers).
- `POST /:id/deliver` — Upload receipt image (Multer) and close shipment (Driver).
- `DELETE /:id` — Wipe shipment record (Admin / Dispatcher).

### Fleet Assets (`/api/vehicles`)
- `GET /` — List truck metrics.
- `POST /` — Create vehicle (Dispatcher / Admin).
- `PUT /:id` — Toggle maintenance status (Service Due, Under Repair).
- `DELETE /:id` — Wipes truck details (Admin).

### Drivers Logs (`/api/drivers`)
- `GET /` — List active driver profiles.
- `PUT /:id` — Toggle shift status.
- `GET /tasks` — Driver dashboard tasks queue.

### Analytics Reports (`/api/analytics`)
- `GET /kpis` — Summarize total counts and delivery success percentage.
- `GET /charts` — Retrieve Recharts data feeds.
