import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Client generation does not connect to the database. Runtime and migration
  // commands still require a real connection URL.
  datasource: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
