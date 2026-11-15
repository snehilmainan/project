# 🚀 UpVote — Product Feedback & Feature Request Board

A production-grade, zero-dependency product roadmap and feature voting board built on **pure Node.js REST API** principles and modern vanilla web standards.

Inspired by platforms like **Canny** and **ProductHunt**, UpVote allows users to submit feature requests, upvote existing ideas, join discussions, and track development progress through an interactive roadmap.

---

## 🌟 Key Highlights

- **Zero Third-Party Dependencies:** Built entirely with Node.js built-in modules (`node:http`, `node:fs/promises`, `node:crypto`, `node:url`, `node:path`).
- **RESTful API Standards:** Strict HTTP method mappings (`GET`, `POST`, `PATCH`, `DELETE`), status codes (`200`, `201`, `204`, `400`, `404`, `413`, `500`), and JSON responses.
- **Clean Architecture:** Strict separation of concerns across `config`, `routes`, `controllers`, `models`, and `middleware`.
- **Dual Storage Persistence:** High-performance in-memory caching paired with asynchronous disk persistence (`data/features.json`).
- **Modern Responsive UI:** Polished interface using Tailwind CSS, real-time optimistic upvote toggles, search debouncing, category filtering, and status tabs.
- **Admin & Moderation Mode:** Interactive toggle to manage roadmap statuses (`under-review` → `planned` → `in-progress` → `completed`) and delete items.

---

## 📂 Project Architecture

```text
upvote/
├── data/
│   └── features.json         # Seed features & persistent JSON datastore
├── public/                   # Static frontend assets
│   ├── css/
│   │   └── styles.css        # Micro-interactions, custom badges & transitions
│   ├── js/
│   │   └── app.js            # Reactive vanilla JS state & API client
│   └── index.html            # Modern roadmap UI
├── src/                      # Backend modular codebase
│   ├── config/
│   │   └── env.js            # Environment configuration & defaults
│   ├── controllers/
│   │   └── featureController.js # Full REST business logic & validation
│   ├── middleware/
│   │   ├── bodyParser.js     # Stream payload parser with 1MB limit & error handling
│   │   └── staticServer.js   # Fast static file server with path normalization
│   ├── models/
│   │   └── featureModel.js   # CRUD operations, query filters & persistence
│   ├── routes/
│   │   └── router.js         # REST route dispatching & CORS handling
│   └── server.js             # HTTP server bootstrap & graceful shutdown
├── .env.example              # Sample environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## ⚡ Quick Start (Run Locally)

Because UpVote uses only Node.js core modules, you do **not** need to install any npm packages!

### 1. Prerequisites
- Node.js (version 18.0.0 or higher)

### 2. Run the Server
From the `upvote` folder, run:

```bash
# Using node directly
node src/server.js

# Or using npm
npm start

# For auto-reloading during development (Node 18.11+)
npm run dev
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** to view the live board.

---

## 📡 REST API Reference

### 1. Get Roadmap Summary Stats
```http
GET /api/features/stats
```
**Response (200 OK):**
```json
{
  "data": {
    "total": 6,
    "underReview": 2,
    "planned": 2,
    "inProgress": 1,
    "completed": 1,
    "totalVotes": 147
  }
}
```

### 2. List Features (with Filtering & Search)
```http
GET /api/features?status=planned&category=feature&search=oauth&sort=votes
```
**Query Parameters:**
- `status`: `all` (default), `under-review`, `planned`, `in-progress`, `completed`
- `category`: `all` (default), `feature`, `bug`, `enhancement`, `ui/ux`, `integration`
- `search`: Substring search against title and description
- `sort`: `votes` (default, highest votes first), `newest`, `oldest`

### 3. Get Single Feature
```http
GET /api/features/:id
```

### 4. Create Feature Request
```http
POST /api/features
Content-Type: application/json

{
  "title": "Add Webhook Support",
  "description": "Send notifications to Slack or Discord when roadmap items change.",
  "category": "integration",
  "author": "Snehil Mainan"
}
```
**Response (201 Created):** Returns the newly created item with generated UUID and initial vote.

### 5. Toggle Upvote
```http
POST /api/features/:id/upvote
Content-Type: application/json

{
  "voterId": "user-uuid-123"
}
```
*Note: If the voter has already upvoted this item, their upvote is cleanly removed (toggle behavior).*

### 6. Update Feature Status (Admin)
```http
PATCH /api/features/:id/status
Content-Type: application/json
X-Admin-Key: admin123

{
  "status": "in-progress"
}
```

### 7. Add Discussion Comment
```http
POST /api/features/:id/comments
Content-Type: application/json

{
  "author": "Jordan",
  "content": "Looking forward to this feature!"
}
```

### 8. Delete Feature (Admin)
```http
DELETE /api/features/:id
X-Admin-Key: admin123
```
**Response (204 No Content)**

---

## 🚀 Easy 1-Click Cloud Deployment

### Deploy to Render (Recommended - 100% Free)
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New + → Web Service**.
3. Select your GitHub repository.
4. Set the following options:
   - **Environment:** `Node`
   - **Build Command:** *(leave empty or `npm install`)*
   - **Start Command:** `node src/server.js`
   - **Plan:** Free
5. Click **Create Web Service**. Your live roadmap URL will be live in ~1 minute!

### Deploy to Railway
1. Open [Railway.app](https://railway.app) and select **New Project → Deploy from GitHub repo**.
2. Railway detects the `package.json` and runs `npm start` automatically.

---

## 🎓 Course Connection

This project implements all core competencies from the **Node.js Crash Course: Build a REST API in a Weekend**:
- Direct use of `node:http.createServer()` without heavy frameworks
- Chunked stream buffering and payload size limits in `bodyParser.js`
- Modular ES6 import/export architecture
- WHATWG `URL` and `URLSearchParams` query parsing
- Proper HTTP response headers, status codes, and error payloads
