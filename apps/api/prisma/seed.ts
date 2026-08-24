import { PrismaClient } from '@prisma/client';
import { INITIAL_TOOLS } from '../src/tools/tools.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial tools into TraceMesh registry...');

  for (const tool of INITIAL_TOOLS) {
    const upserted = await prisma.tool.upsert({
      where: { name: tool.name },
      update: tool,
      create: tool,
    });
    console.log(`Seeded tool: ${upserted.displayName} [${upserted.category}] (${upserted.id})`);
  }

  console.log('Tool registry seed complete.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
