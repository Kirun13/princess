This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

This repo now includes unit/integration tests (Vitest + Testing Library) and E2E smoke tests (Playwright).

Run all Vitest tests:

```bash
npm run test
```

Run Vitest in watch mode:

```bash
npm run test:watch
```

Run coverage:

```bash
npm run test:coverage
```

Install Playwright browser binaries (first time only):

```bash
npm run test:e2e:install
```

Run E2E tests:

```bash
npm run test:e2e
```

## Docker

This repo includes a production `Dockerfile` that builds the app on Linux using Next.js standalone output.

Build the image locally with:

```bash
docker build -t princess-web .
```

Run it with:

```bash
docker run --rm -p 3000:3000 princess-web
```

## Railway (Dockerfile mode)

Use the Dockerfile builder as the single deployment strategy:

- `railway.toml` uses `builder = "DOCKERFILE"`
- runtime command is `node server.js`
- healthcheck endpoint is `/api/health`

Required Railway variables:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `START_TOKEN_SECRET`
- `CRON_SECRET`

Optional variables (feature-dependent): OAuth, Upstash Redis, email SMTP, puzzle generator service.

### Daily Cron On Railway

The daily generator flow is designed to stay route-based:

`Railway cron service -> app private URL /api/cron/generate-daily -> createTomorrowDailyChallengeIfMissing() -> generator private URL /generate`

Recommended setup:

1. Keep the main web app service exactly as it is.
2. Create a second Railway service from the same repo for scheduled jobs.
3. Set that cron service's start command to:

```bash
npm run cron:generate-daily
```

4. Set these variables on the cron service:
   - `APP_INTERNAL_URL`: the app service's private Railway URL
   - `CRON_SECRET`: the same value used by the app service
5. Set these variables on the app service:
   - `CRON_SECRET`
   - `PUZZLE_GENERATOR_URL`: the generator service's private Railway URL
   - `PUZZLE_GENERATOR_API_KEY` if your generator requires it
6. Schedule the cron service before `00:00 UTC`.

Default schedule:

```text
0 20 * * *
```

Why `20:00 UTC`? The job creates tomorrow's challenge. Running it after midnight would create the following day's challenge instead of today's.

Validation checklist:

- Run `npm run cron:generate-daily` from the cron service shell once and confirm a `200` response.
- Run it a second time and confirm the response is a safe skip, not a duplicate create.
- Confirm app logs for `/api/cron/generate-daily` include `challengeDate`, `challengeNumber`, and `puzzleId`.
- Confirm generator failures return `500` and are visible in Railway logs.

## Logging on Railway

This app logs to stdout with structured JSON using `pino`, which Railway captures automatically.

- Set `LOG_LEVEL` (recommended default: `info`)
- Keep logs structured for filtering by fields like `route`, `method`, `requestId`, `status`, and `durationMs`
- Avoid logging secrets, tokens, cookies, raw request bodies, or user PII

## Regenerating the lockfile for Linux

If native optional dependencies drift toward a Windows-only lockfile, regenerate `package-lock.json` from Linux:

```bash
docker run --rm \
  -v "$PWD:/workspace" \
  -w /tmp \
  node:22-bookworm-slim \
  bash -lc "cp -r /workspace app && cd app && rm -rf node_modules package-lock.json && npm install && cp package-lock.json /workspace/package-lock.json"
```

This keeps Linux-native optional dependencies such as `lightningcss` and `@tailwindcss/oxide` in sync with CI.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
