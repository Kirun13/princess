import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import puzzles from "../puzzles.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
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
      update: { name: `Level ${levelNumber}`, puzzleId: puzzle.id },
      create: { number: levelNumber, name: `Level ${levelNumber}`, puzzleId: puzzle.id },
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
