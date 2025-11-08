# ZenCourt Monorepo

This is a monorepo containing the ZenCourt application suite.

## Structure

```
zencourt/
├── apps/
│   ├── web/              # Next.js web application
│   ├── db/               # Shared database package
│   └── video-server/     # Express video processing server
└── package.json          # Root workspace configuration
```

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
