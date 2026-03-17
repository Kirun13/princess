import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
