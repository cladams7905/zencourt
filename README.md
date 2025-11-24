# Zencourt Monorepo

This is a monorepo containing the Zencourt application suite.

## Structure

```
zencourt/
├── apps/
│   ├── web/              # Next.js web client and dashboard
│   └── video-server/     # Express + FFmpeg API for heavy media work
├── packages/
│   ├── db/               # Drizzle schema, migrations, and Neon client helpers
│   └── shared/           # Reusable TypeScript utilities (logger, storage paths, etc.)
├── demo-images/          # Reference assets for marketing/demo flows
├── scripts/              # Deployment and operational helpers
└── package.json          # Root workspace configuration and scripts
```

- `apps` contains the deployable services.
- `packages` hosts shared libraries consumed by the apps.
- `scripts` contains operational helpers (e.g., Hetzner deploy script).

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

Install all dependencies across all workspaces:

```bash
npm install
```

### Development

Install environment vars locally:

```bash
npm run env:pull
```

Run the web app in development mode:

```bash
npm run dev
# or
npm run dev:web
```

Run the video server in development mode:

```bash
npm run dev:video
```

### Building

Build all apps:

```bash
npm run build
```

Build specific apps:

```bash
npm run build:web
npm run build:video
```

### Database Management

Generate database migrations:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Push schema changes:

```bash
npm run db:push
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## License

Private
