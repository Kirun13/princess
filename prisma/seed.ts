import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import puzzles from "../puzzles.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const adminPasswordHash = await bcrypt.hash("Qqwerty1!", 10);

  await db.user.upsert({
    where: { email: "admin@admin" },
    update: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    create: {
      username: "admin",
      email: "admin@admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("  ✓ Admin user seeded (admin@admin)");
  console.log(`Seeding ${puzzles.length} levels...`);

  for (let i = 0; i < puzzles.length; i++) {
    const { grid, solution, hash, size, difficulty } = puzzles[i];
    const levelNumber = i + 1;

    const puzzle = await db.puzzle.upsert({
      where: { hash },
      update: {},
      create: { grid, solution, hash, size, difficulty },
    });

    await db.level.upsert({
      where: { number: levelNumber },
      update: {
        name: `Level ${levelNumber}`,
        puzzleId: puzzle.id,
        sortOrder: levelNumber,
        status: "PUBLISHED",
      },
      create: {
        number: levelNumber,
        name: `Level ${levelNumber}`,
        puzzleId: puzzle.id,
        sortOrder: levelNumber,
        status: "PUBLISHED",
      },
    });

    console.log(`  ✓ Level ${levelNumber} (${size}×${size} ${difficulty})`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
