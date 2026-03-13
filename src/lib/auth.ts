import jwt from "jsonwebtoken";
import type { AuthPayload, Role } from "@/lib/types";

export const AUTH_COOKIE = "neoconnect_token";

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || "dev-secret";
}

export function signAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token?: string): AuthPayload | null {
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function hasRole(role: Role, allowedRoles: readonly Role[]) {
  return allowedRoles.includes(role);
}
