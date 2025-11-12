# Collaborative Note App (problem5)

This workspace bundles the Angular client (`note-app`), an API server, and the backing Postgres + Redis services that power real-time, shared note taking.

## Requirements

- Docker Desktop or Docker Engine with the Compose plugin
- Ports `4200`, `3000`, `5432`, and `6379` available on your host

### Important: server `.env`

Create `src/problem5/server/.env` before starting anything:

```env
DB_HOST="localhost"
DB_PORT=5432
DB_PASSWORD="password"
DB_NAME="collab_notes"
JWT_SECRET="your_jwt_secret_key"
PORT=3000
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
CLIENT_ORIGIN="http://localhost:4200"
```

The API reads these variables on boot, so missing values will prevent the server from starting.

## Quick Start

1. From the repo root jump into the problem directory:

   ```bash
   cd src/problem5
   ```

2. Build and launch every service:

   ```bash
   docker compose up --build
   ```

   The command starts Postgres, Redis, the Node.js API on `http://localhost:3000`, and serves the Angular bundle through NGINX on `http://localhost:4200`.

3. Open your browser at `http://localhost:4200`. Use the signup form to create an account, then log in to create notes.
4. When you are done, stop everything with `docker compose down` (add `-v` if you also want to discard the Postgres volume).

## How the App Works

- **Notes and roles**: Every note has an `owner` (the creator). Owners can share notes, switch them between private and public, and always edit. Shared members can be promoted or demoted between `edit` (can update content) and `view` (read-only) roles via the “Share” panel on the note page.
- **Sharing flow**: Owners invite collaborators by entering an email and role. The server records the share entry so, on the next login, invited users see the shared note in their list. Roles can be changed or revoked, and owners can copy a public link when a note is marked public.
- **Realtime collaboration**: The client joins a Socket.IO room per note. When someone saves edits, other open sessions receive the update instantly, along with a banner indicating another collaborator just synced. Version numbers protect against editing conflicts and the UI lets you toggle between edit and markdown-rendered preview modes.
- **Data & caching**: Postgres stores users, notes, and share metadata. Redis backs session-like data and the realtime broker used by the API.

## Backend Tech Stack

- **TypeORM + PostgreSQL**: Data modeling, migrations, and persistence for users, notes, and share links.
- **Redis + BullMQ**: Fast cache/queue foundation for collaboration events and background jobs.
- **Socket.IO**: WebSocket transport that streams real-time note updates to every participant.
- **Zod**: Runtime validation for request payloads before they hit the database.
- **JSON Web Tokens + bcryptjs**: Password hashing plus stateless auth for secure login flows.

That is all you need - `docker compose up --build` handles the entire stack so you can focus on exploring or extending the collaborative note experience.
