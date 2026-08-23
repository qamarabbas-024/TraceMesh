import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.warn('Prisma could not connect immediately to DB. Ensure PostgreSQL container is running.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
