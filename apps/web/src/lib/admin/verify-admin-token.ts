import { jwtVerify } from "jose";

const DEV_JWT_SECRET = "dev-secret-change-in-production";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY ?? DEV_JWT_SECRET;
  return new TextEncoder().encode(secret);
}

/** Verify admin JWT signature, expiry, and scope (Edge-safe). */
export async function verifyAdminAccessToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.scope === "admin";
  } catch {
    return false;
  }
}
