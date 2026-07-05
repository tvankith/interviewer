import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AiServerToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

const INTERNAL_ASSERTION_AUDIENCE = 'ai-server-token-issuance';
const INTERNAL_ASSERTION_TTL_SECONDS = 30;

function signInternalAssertion(userId: string): string {
  return jwt.sign({ sub: userId }, env.aiServerInternalSecret, {
    algorithm: 'HS256',
    expiresIn: INTERNAL_ASSERTION_TTL_SECONDS,
    audience: INTERNAL_ASSERTION_AUDIENCE,
  });
}

// Exchanges an already-authenticated userId for a short-lived ai-server
// session token. The identity travels inside a signed, ~30s-lived assertion
// rather than a bare shared-secret header plus an arbitrary userId field, so
// a leaked assertion can't be replayed for long or repurposed for another user.
export async function issueAiServerToken(userId: string): Promise<AiServerToken> {
  const assertion = signInternalAssertion(userId);
  const response = await fetch(`${env.aiServerUrl}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${assertion}`,
    },
  });

  if (!response.ok) {
    throw new Error(`ai-server returned ${response.status} issuing token`);
  }

  return response.json();
}
