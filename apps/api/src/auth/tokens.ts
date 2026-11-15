import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getConfig } from "../config";

export interface AccessTokenPayload {
  sub: string;
  role: "user" | "admin";
  type: "access";
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getConfig().JWT_SECRET);
}

export async function signAccessToken(payload: {
  userId: string;
  role: "user" | "admin";
}): Promise<string> {
  const config = getConfig();
  return new SignJWT({ role: payload.role, type: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setIssuer("plume-api")
    .setAudience("plume-mobile")
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: "plume-api",
    audience: "plume-mobile",
  });
  if (payload.type !== "access" || typeof payload.sub !== "string") {
    throw new Error("Jeton invalide.");
  }
  const role = payload.role === "admin" ? "admin" : "user";
  return { sub: payload.sub, role, type: "access" };
}
