import jwt, { JwtPayload } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload extends JwtPayload {
  sub?: string;
  email?: string;
  aud?: string;
}

interface JWKSKey {
  kid: string;
  kty: string;
  use: string;
  alg: string;
  // RSA fields
  n?: string;
  e?: string;
  // EC fields
  crv?: string;
  x?: string;
  y?: string;
}

interface CachedJWKS {
  keys: JWKSKey[];
  cachedAt: number;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;
let cachedJWKS: CachedJWKS | null = null;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return supabaseClient;
}

async function fetchJWKS(): Promise<JWKSKey[]> {
  const now = Date.now();

  // Return cached JWKS if still valid
  if (cachedJWKS && now - cachedJWKS.cachedAt < JWKS_CACHE_TTL) {
    return cachedJWKS.keys;
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }

    const data = (await response.json()) as { keys: JWKSKey[] };
    cachedJWKS = {
      keys: data.keys,
      cachedAt: now,
    };

    return data.keys;
  } catch (error) {
    // If JWKS fetch fails but cache exists, use cached keys
    if (cachedJWKS) {
      // Silently use cache fallback, error will be logged at request level if subsequent validation fails
      return cachedJWKS.keys;
    }
    // No cache available, propagate error to be logged at request handler level
    throw error;
  }
}

function jwkToPem(jwk: JWKSKey): string {
  const jwkObj: Record<string, string> = { kty: jwk.kty };

  if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
    jwkObj.n = jwk.n;
    jwkObj.e = jwk.e;
  } else if (jwk.kty === 'EC' && jwk.crv && jwk.x && jwk.y) {
    jwkObj.crv = jwk.crv;
    jwkObj.x = jwk.x;
    jwkObj.y = jwk.y;
  } else {
    throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }

  const key = crypto.createPublicKey({
    key: jwkObj,
    format: 'jwk',
  } as crypto.JsonWebKeyInput);

  return key.export({ format: 'pem', type: 'spki' }) as string;
}

export async function decodeAccessToken(token: string): Promise<TokenPayload> {
  try {
    // Decode header without verification to get algorithm
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) {
      throw new Error('Invalid token format');
    }

    const alg = decoded.header.alg as string;

    if (alg === 'HS256') {
      // Use HS256 with SUPABASE_JWT_SECRET (development)
      const payload = jwt.verify(token, env.jwtSecret, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      return payload;
    } else if (alg === 'RS256' || alg === 'ES256') {
      // Use RS256/ES256 with Supabase JWKS (production)
      const keys = await fetchJWKS();
      const kid = (decoded.header.kid as string);

      // Find the key matching the kid
      const jwk = keys.find((k) => k.kid === kid);
      if (!jwk) {
        throw new Error(`Key with kid ${kid} not found in JWKS`);
      }

      // Convert JWK to PEM and verify
      const pem = jwkToPem(jwk);
      const payload = jwt.verify(token, pem, {
        algorithms: ['RS256', 'ES256'],
      }) as TokenPayload;

      return payload;
    } else {
      throw new Error(`Unsupported algorithm: ${alg}`);
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export function extractBearerToken(authorization?: string): string {
  if (!authorization) {
    throw new Error('Missing authorization header');
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('Invalid authorization header format');
  }

  return parts[1];
}

export async function getTokenPayload(authorization?: string): Promise<TokenPayload> {
  const token = extractBearerToken(authorization);
  return decodeAccessToken(token);
}
