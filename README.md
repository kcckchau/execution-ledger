# Execution Ledger

A trade journal for tracking and reviewing your executions. Data is stored in a shared Postgres database so multiple machines stay in sync.

---

## 1. Set up a free database (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project (pick any region close to you)
3. Copy the **Connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this URL — you'll use it on both machines

---

## 2. Running with Docker (recommended)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) installed.

```bash
# Build the image (once, or after pulling updates)
docker build -t execution-ledger .

# Run — paste your Neon connection string here
docker run -p 3000:3000 -e DATABASE_URL="postgresql://..." execution-ledger
```

Open [http://localhost:3000](http://localhost:3000). The first run automatically applies the database migrations.

Run both your laptop and desktop with the same `DATABASE_URL` and they share all trade data.

To run in the background (detached):

```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  --name execution-ledger \
  execution-ledger
```

To stop / restart:

```bash
docker stop execution-ledger
docker start execution-ledger
```

---

## 3. Local Development

**Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io/installation)

```bash
# Copy and fill in your database URL
cp .env.example .env
# edit .env and set DATABASE_URL

pnpm install       # also runs prisma generate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app hot-reloads as you edit files.

Apply migrations to your database before first run:

```bash
pnpm exec prisma migrate deploy
```

To build and run the production server locally:

```bash
pnpm build
pnpm start
```
