# FlowSpace ⚡

A full-stack livestreaming and social platform built for creators. Stream live, grow an audience, accept payments, and monetize — all in one place.

**Live:** [flowspace-one.vercel.app](https://flowspace-one.vercel.app)

---

## What it does

FlowSpace lets creators go live from a browser or OBS, chat with viewers in real time, accept coin donations, and set up paid subscriptions — while viewers can discover streams, follow creators, and interact through a social feed.

The platform handles the full creator economy stack: coin purchases via Razorpay, revenue splits on subscriptions, pay-per-view stream gating, and a withdrawal system. There's also an admin panel for moderation and analytics.

---

## Stack

**Frontend** — React + Vite, Zustand for state, Socket.io client, HLS.js for stream playback

**Backend** — Node.js + Express, MongoDB + Mongoose, Socket.io, NodeMediaServer for RTMP/HLS

**Infrastructure** — Vercel (frontend + admin), Render (backend), MongoDB Atlas, Cloudinary (media), Razorpay (payments)

---

## Features

### Streaming
- Browser-based streaming via WebRTC
- OBS / DSLR support via RTMP → HLS pipeline
- Live chat with rate limiting (3 msg/sec per user)
- Real-time viewer counts, likes, donations
- Pay-per-view stream gating
- Picture-in-picture when switching tabs

### Social
- Feed with posts, comments, likes, shares
- Follow system, DMs, notifications
- User profiles with goals and session tracking
- Search across users and streams

### Monetization
- Coin wallet — buy coins via Razorpay (UPI, cards, netbanking)
- Coin donations to streamers during live
- Creator subscription tiers (Yellow / Green / Purple)
- Revenue split system — creators earn 50–70% of subscription revenue
- Post boosting
- Withdrawal requests

### Platform
- Mobile responsive — feels like an app, not a website
- Dark / light theme
- Privacy policy gate for new users
- Admin panel — user management, stream moderation, transaction history
- Streamer analytics dashboard

---

## Project Structure

```
flowspace/
├── client/          # Main React app (Vite)
├── admin/           # Admin panel (separate React app)
└── server/          # Express API + Socket.io + NMS
    ├── models/
    ├── routes/
    ├── middleware/
    └── socket/
```

---

## Running locally

**Prerequisites:** Node 18+, MongoDB, FFmpeg (for HLS transcoding)

```bash
# Backend
cd server
npm install
# create server/.env (see below)
node index.js

# Frontend
cd client
npm install
npm run dev

# Admin
cd admin
npm install
npm run dev
```

**`server/.env`**
```
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=7d
JWT_REFRESH_EXPIRES=30d
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=5000
```

For OBS streaming locally, set RTMP server to `rtmp://localhost/live` and use your stream key from the profile settings.

---

## Deployment

- Frontend → Vercel (root: `client`)
- Admin → Vercel (root: `admin`)
- Backend → Render (root: `server`, start: `node index.js`)
- Add all env vars in Render dashboard — no `.env` file needed in production

---

## Early Access

FlowSpace is actively being developed. Features and APIs may change. Payments are handled by Razorpay and are non-refundable per the platform's terms.

---

Built by [Phaniraj B N](https://github.com/Phaniraj-123)
