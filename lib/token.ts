import { SignJWT, jwtVerify } from "jose";

const secret = () => {
  const s = process.env.START_TOKEN_SECRET;
  if (!s) throw new Error("START_TOKEN_SECRET is not set");
  return new TextEncoder().encode(s);
};

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StartTokenPayload {
  userId: string;
  puzzleId: string;
  startedAt: string; // ISO
  expiresAt: string; // ISO
}

export async function signStartToken(
  userId: string,
  puzzleId: string
): Promise<string> {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + TTL_MS);

  return new SignJWT({
    userId,
    puzzleId,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret());
}

export async function verifyStartToken(
  token: string
): Promise<StartTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as StartTokenPayload;
  } catch {
    return null;
  }
}
