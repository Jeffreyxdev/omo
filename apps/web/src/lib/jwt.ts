import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "udyking_session";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "udyking-dev-secret-change-me"
);

export async function signSession(sub: string, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}
