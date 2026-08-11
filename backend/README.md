# Backend API

See the [root README](../README.md) for full documentation.

## Quick Start

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Scripts

- `npm run dev` — Development server with hot reload
- `npm run build` — Compile TypeScript
- `npm start` — Production server
- `npm test` — Run test suite
- `npm run db:seed` — Seed demo data
