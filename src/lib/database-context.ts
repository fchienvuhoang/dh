import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";
import type { Pool } from "pg";

export type DatabaseContext = { prisma?: PrismaClient; databasePool?: Pool };
export const databaseContext = new AsyncLocalStorage<DatabaseContext>();

export async function closeDatabaseContext(context: DatabaseContext) {
  if (context.prisma) await context.prisma.$disconnect();
  if (context.databasePool && !context.databasePool.ended) await context.databasePool.end();
}
