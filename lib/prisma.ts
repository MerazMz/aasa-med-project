import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

// Vercel serverless (Node 18+) provides a native global WebSocket.
// Only polyfill with the 'ws' package in environments that lack one (e.g., older local Node).
// Importing ws and using its native C++ bufferutil addon crashes on Vercel because
// native .node binary addons are not available in the serverless runtime.
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}


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