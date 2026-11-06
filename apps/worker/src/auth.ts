import { createRemoteJWKSet, jwtVerify } from 'jose';
export type AuthEnv = {
  OWNER_SUB: string;
  ACCESS_TEAM: string;
  ACCESS_AUD: string;
};
const caches = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function owner(request: Request, env: AuthEnv) {
  if (
    !env.OWNER_SUB ||
    env.OWNER_SUB === 'UNCONFIGURED' ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM)
  )
    return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return false;
  try {
    let keys = caches.get(env.ACCESS_TEAM);
    if (!keys) {
      keys = createRemoteJWKSet(
        new URL(env.ACCESS_TEAM + '/cdn-cgi/access/certs'),
      );
      caches.set(env.ACCESS_TEAM, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer: env.ACCESS_TEAM,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
    });
    return payload.sub === env.OWNER_SUB;
  } catch {
    return false;
  }
}
export const sha256 = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
export async function hmac(secret: string, input: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input)),
      ),
    ),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export function equal(a: string, b: string) {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
