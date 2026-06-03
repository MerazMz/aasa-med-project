import { pbkdf2Sync, randomBytes } from "crypto";

/**
 * Hashes a password using PBKDF2 with a random salt.
 * Returns a string in the format salt:hash
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const testHash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === testHash;
  } catch (error) {
    return false;
  }
}

import { verifyJWT } from "./jwt";

/**
 * Gets the authenticated user from the Request headers or cookies.
 */
export async function getAuthenticatedUser(request: Request) {
  try {
    let token = "";

    // Check cookies
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/auth-token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    // Check Authorization header
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    const payload = await verifyJWT(token);
    return payload;
  } catch (error) {
    return null;
  }
}
