This is a Next.js campus map app backed by Neon Postgres and Neon Auth.

## Auth setup

The app uses `@neondatabase/auth` as the client/server bridge to Neon Auth.

Set these variables before running locally:

```bash
DATABASE_URL="postgresql://..."
NEON_AUTH_BASE_URL="https://your-neon-auth-domain"
NEON_AUTH_COOKIE_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Google OAuth provider credentials are configured in Neon Auth itself, so they do not need to be added to this project.

When a user signs in through Neon Auth, the app creates or updates the matching row in the local `users` table. That local row is used for roles, approvals, reviews, and other activity control.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
