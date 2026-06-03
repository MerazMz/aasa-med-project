import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

// Force recreation of PrismaClient when schema changes in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = undefined;
}

// Create a connection pool config from the serverless driver
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}