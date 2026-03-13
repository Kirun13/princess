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
