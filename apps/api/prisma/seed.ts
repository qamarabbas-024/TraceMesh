import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const INITIAL_TOOLS = [
  {
    name: 'sherlock',
    displayName: 'Sherlock',
    description: 'Hunt down social media accounts by username across 400+ online platforms.',
    category: 'username',
    inputTypes: ['username'],
    tier: 'tier1',
    executionType: 'edge',
    sourceUrl: 'https://github.com/sherlock-project/sherlock',
    trackedVersion: '0.14.3',
    license: 'MIT',
    maintenanceStatus: 'active',
    isEnabled: true,
  },
  {
    name: 'holehe',
    displayName: 'Holehe',
    description: 'Check if an email address is attached to accounts across 120+ popular web services without notifying target.',
    category: 'email',
    inputTypes: ['email'],
    tier: 'tier1',
    executionType: 'edge',
    sourceUrl: 'https://github.com/megadose/holehe',
    trackedVersion: '2.0.2',
    license: 'GPL-3.0',
    maintenanceStatus: 'active',
    isEnabled: true,
  },
  {
    name: 'exiftool',
    displayName: 'ExifTool',
    description: 'Deep metadata extraction engine for digital images, GPS coordinates, timestamps, camera profiles, and device signatures.',
    category: 'image',
    inputTypes: ['image'],
    tier: 'tier1',
    executionType: 'edge',
    sourceUrl: 'https://github.com/exiftool/exiftool',
    trackedVersion: '12.70',
    license: 'Artistic / GPL',
    maintenanceStatus: 'active',
    isEnabled: true,
  },
];

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
