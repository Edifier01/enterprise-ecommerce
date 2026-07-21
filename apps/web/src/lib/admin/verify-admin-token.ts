import { jwtVerify } from "jose";

const DEV_JWT_SECRET = "dev-secret-change-in-production";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET_KEY is required in production");
    }
    return new TextEncoder().encode(DEV_JWT_SECRET);
  }
  return new TextEncoder().encode(secret);
}

/** Verify admin JWT signature, expiry, scope, and active account (Edge-safe). */
export async function verifyAdminAccessToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.scope === "admin" && payload.is_active === true;
  } catch {
    return false;
  }
}
