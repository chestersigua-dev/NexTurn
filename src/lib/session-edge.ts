export const SESSION_COOKIE_NAME = 'nexturn_session';

export interface EdgeSessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export async function verifySessionEdge(
  token: string,
  secret: string
): Promise<EdgeSessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataB64, sigB64] = parts;

    // Verify expiry first
    const jsonStr = atob(dataB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: EdgeSessionPayload = JSON.parse(jsonStr);

    if (Date.now() > payload.exp) {
      return null;
    }

    // Verify HMAC using Web Crypto API (native in Edge runtime)
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url signature back to ArrayBuffer
    const sigBinary = atob(sigB64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBuf = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBuf[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuf,
      enc.encode(dataB64)
    );

    if (!isValid) return null;

    return payload;
  } catch (err) {
    return null;
  }
}
