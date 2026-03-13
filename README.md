# NeoConnect

NeoConnect is a full-stack staff feedback and complaint management platform built to match the hackathon brief in `Use Case Full Stack.pdf`.

## What is included

- Staff submission form with anonymous toggle, file uploads, and tracking IDs in `NEO-YYYY-001` format
- Role-based JWT authentication for Staff, Secretariat, Case Manager, and Admin
- Case inbox and lifecycle management with assignment, notes, status updates, and automatic 7-working-day escalation
- Public hub with quarterly digest, impact tracking, and searchable meeting-minutes archive
- Polling system with one vote per user and live chart results
- Analytics dashboard with department, status, and category counts plus hotspot flagging

## Tech stack

- Next.js + React + TypeScript
- Tailwind CSS
- shadcn-style UI component structure under `src/components/ui`
- Node.js + Express
- MongoDB + Mongoose wiring included via `MONGODB_URI`

## Local setup

1. Copy `.env.example` to `.env`.
2. Update `JWT_SECRET`.
3. Optionally point `MONGODB_URI` to a running MongoDB instance.
4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Demo logins

- Staff: `staff@neoconnect.local` / `password123`
- Secretariat: `secretariat@neoconnect.local` / `password123`
- Case Manager: `manager@neoconnect.local` / `password123`
- Admin: `admin@neoconnect.local` / `password123`

## Notes

- The app runs with seeded in-memory demo data so it works immediately during local evaluation.
- If `MONGODB_URI` is provided, Mongoose connects on startup, giving you a ready path for persistence expansion.
- Uploaded files are stored in `public/uploads`.

## Deploying on Render

This repo includes a `render.yaml` blueprint for Render because the app runs on a custom Express server in `server.ts`.

1. Push the repo to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Set the required environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
4. Deploy the generated web service.

Build command: `npm install && npm run build`

Start command: `npm start`
