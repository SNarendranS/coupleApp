# UsTwo — Realtime Couples Web Application

A private, production-ready digital sanctuary designed exclusively for **exactly two connected people** in a relationship. Built from the ground up using the MERN stack with TypeScript, Tailwind CSS, Three.js / React Three Fiber, Zustand, and Socket.IO.

---

## 🌟 Features Implemented

### 1. 🔐 Authentication & Session Security
- Registration with Zod validation, username/email normalization, and uniqueness enforcement.
- Password hashing with bcrypt.
- JWT-based authentication with HTTP-only cookies and Bearer tokens.
- Rate limiting on auth and API endpoints using `express-rate-limit`.
- Helmet security headers and strict CORS configuration.

### 2. 🤝 Partner Discovery & Atomic Connection
- Search for registered users by username or display name.
- Send, accept, reject, or cancel partner requests.
- Strict constraint: **0 or exactly 1 partner per user**; **exactly 2 members per couple**.
- Atomic couple creation with MongoDB transactions to eliminate pairing race conditions.
- Realtime socket notification and instant redirect upon pairing acceptance.

### 3. 🎨 Realtime Collaborative Drawing Canvas
- **Architecture**: Mouse/touch movement streams intermediate coordinates directly to partner socket with ultra-low latency; completed strokes are batched and committed to MongoDB for persistence.
- Tools: Pen, Pencil, Marker, and Eraser.
- Palette: 9 curated swatches + custom brush width slider with live preview.
- Canvas background toggle: Clean White vs Sleek Obsidian Dark.
- Full Undo history, Clear Board, and Download PNG export.
- Touch & mobile friendly.

### 4. 🎮 Authoritative Realtime Couple Games
- **XO (Tic-Tac-Toe)**: Server-authoritative turn engine, 3-in-a-row winning line calculation, victory confetti, tie detection, and match restart.
- **Couple Bingo**: 5x5 randomized boards per player (numbers 1–25), turn rotation, shared called numbers crossed off on both boards, 5-line [B-I-N-G-O] letter light-up tracker, and server-validated win condition.
- Persistent game match history and score tracking.

### 5. 📅 Shared Couple Calendar & Milestones
- Month calendar grid view with day selection, today indicator, and event categories.
- Event types: `memory`, `anniversary`, `plan`, `date_night`, `birthday`.
- Annual recurrence toggle for yearly anniversaries with automatic days-together and milestone countdown.
- Full CRUD with instant realtime Socket.IO synchronization.

### 6. 🧠 Timeless Memories Scrapbook
- Timeline and photo grid of relationship moments with titles, descriptions, locations, and tags.
- Instant realtime updates when either partner adds or updates a memory.

### 7. 🔗 Shared Bookmarks
- Categorized bookmarks (Food & Dining, Travel, Movies & Shows, Music & Playlists, Shopping, Other).
- URL validation (HTTP/HTTPS only) with auto-extracted favicons and safe external tab launcher.
- Category filtering and search.

### 8. ⚡ Realtime Presence & Notifications
- Live online/offline status indicator and last seen timestamps.
- Activity broadcasting (e.g., "Drawing on canvas", "Playing Bingo", "Checking calendar").
- In-app notification bell with unread badge counter.
- Recent couple activity timeline.

### 9. 🪐 Visual Seasoning & Three.js / R3F
- Interactive 3D romantic orbital rings scene dancing in harmony with ambient stardust.
- Subtle background floating particles on dashboard.
- Elegant typography (Inter & Playfair Display), glassmorphism, soft glowing gradients, and mobile responsive layout.

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────┐
                    │      React + Vite       │
                    │   Tailwind CSS + R3F    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             REST API Calls             Socket.IO Realtime
             (Auth, CRUD)               (Drawing, Games, Presence)
                    │                         │
                    ▼                         ▼
            ┌───────────────┐         ┌────────────────┐
            │    Express    │         │  Couple Rooms  │
            │   Services    │         │  couple:{id}   │
            └───────┬───────┘         └───────┬────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                          ┌─────────────┐
                          │   MongoDB   │
                          │    Atlas    │
                          └─────────────┘
```

---

## 📁 Project Structure

```
coupleApp/
├── package.json               # Root scripts (build, dev, test)
├── .env.example               # Environment variables template
├── shared/                    # Shared types, Zod schemas & socket events
│   ├── src/
│   │   ├── types.ts           # DTOs and entity interfaces
│   │   ├── socket-events.ts   # Event name constants and payload types
│   │   └── schemas.ts         # Zod validation schemas
├── server/                    # Node.js + Express + Socket.IO server
│   ├── src/
│   │   ├── config/            # DB connection & env parsing
│   │   ├── models/            # User, Couple, PartnerRequest, Drawing, Game, Calendar, etc.
│   │   ├── middleware/        # auth, couple, validate, rateLimiters, errorHandler
│   │   ├── services/          # Authoritative business logic & game engines
│   │   ├── controllers/       # Thin REST controllers
│   │   ├── routes/            # Express routers
│   │   ├── socket/            # Socket.IO auth, rooms, presence & event handlers
│   │   ├── scripts/seed.ts    # Demo seed script
│   │   └── tests/             # Automated integration & socket tests
└── client/                    # React + Vite + TypeScript + Tailwind
    ├── src/
    │   ├── components/        # 3D scenes, Navbar, MobileNav, Notifications
    │   ├── pages/             # Landing, Auth, PartnerSetup, Dashboard, Canvas, Games, Calendar, Memories, Links, Settings
    │   ├── layouts/           # AppLayout, AuthLayout
    │   ├── stores/            # Zustand stores (auth, drawing, games, presence, calendar, links, memories)
    │   └── services/          # Centralized API & Socket client singletons
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18
- npm >= 9
- MongoDB Atlas connection string (or local MongoDB)

### 2. Environment Setup

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=super_secure_jwt_secret_couple_app_2026_production_grade_key_848201
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Create `client/.env`:
```env
VITE_API_URL=/api
VITE_SOCKET_URL=/
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Seed Demo Couple Data
Populates two demo users (`alex` and `sam`) connected in a demo couple with initial drawing strokes, calendar events, memories, bookmarks, and game state:
```bash
npm run seed --prefix server
```

**Demo Credentials**:
- **User 1**: `alex@example.com` (username: `alex`) | Password: `password123`
- **User 2**: `sam@example.com` (username: `sam`) | Password: `password123`

### 5. Start Development Servers
Runs both Express API (Port 5000) and Vite Client (Port 5173) concurrently:
```bash
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🧪 Running Automated Tests

Run backend integration and realtime two-client Socket.IO test suites:
```bash
npm run build:server
node --test server/dist/tests/integration.test.js server/dist/tests/two_client_realtime.test.js
```

**What is tested**:
- Authentication registration, password hashing, duplicate email/username rejection.
- Partner discovery, self-request rejection, duplicate request prevention, atomic transaction pairing.
- Drawing stroke persistence, deduplication, and board versioning.
- Authoritative XO game turn validation, move sequence, and 3-in-a-row winning line detection.
- Calendar couple isolation and query.
- Realtime multi-client Socket.IO stroke broadcasting, XO state sync, and presence activity propagation.

---

## 🔒 Security Measures
1. **Authorization**: Every protected route derives ownership server-side from `req.user.coupleId`. Never trusts client-supplied couple IDs.
2. **Socket Room Isolation**: Malicious clients cannot arbitrary join rooms. Sockets authenticate via JWT, query MongoDB for the user's active `coupleId`, and join only `couple:{coupleId}` and `user:{userId}`.
3. **No Database Flooding**: Drawing stream events are transient websocket broadcasts between partners; only completed strokes (mouseup/touchend) are validated with Zod and persisted to MongoDB.
4. **IDOR & Cross-Couple Prevention**: Resources (Calendar, Links, Memories, Drawing, Games) strictly query by `{ _id, coupleId }`.
