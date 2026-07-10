import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_SERVER_URL

// Shares the auth cookie across subdomains, e.g. ".chumma.space"
const COOKIE_DOMAIN =
  process.env.COOKIE_DOMAIN || undefined;

function decodeToken(token: string): {
  exp?: number;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString(
        "utf-8"
      )
    );

    return decoded;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    // Extract tokens from request body (sent by frontend after Supabase OAuth)
    const body = await request.json();
    const { accessToken, refreshToken } =
      body;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Missing accessToken",
        },
        { status: 400 }
      );
    }

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "Missing refreshToken",
        },
        { status: 400 }
      );
    }

    // Call backend POST /auth/callback with tokens via Authorization header
    // Backend validates tokens, syncs user, returns user data
    const backendResponse = await fetch(
      `${BACKEND_URL}/auth/callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accessToken,
          refreshToken,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    const responseData =
      await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            responseData.error ||
            "Authentication failed",
        },
        { status: backendResponse.status }
      );
    }

    // Backend returns user data on success
    // Extract tokens from response to set as httpOnly cookies
    const userData = responseData;

    // Create response with user data
    const nextResponse =
      NextResponse.json({
        ok: true,
        user: userData.user,
      });

    // Set httpOnly cookies with token values
    // Use the Supabase tokens provided by frontend for now
    // On next request, backend will validate these via Authorization header
    const decodedAccess = decodeToken(
      accessToken
    );
    const accessExpires = decodedAccess?.exp
      ? new Date(decodedAccess.exp * 1000)
      : undefined;

    nextResponse.cookies.set(
      "access_token",
      accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        domain: COOKIE_DOMAIN,
        expires: accessExpires,
      }
    );

    const decodedRefresh = decodeToken(
      refreshToken
    );
    const refreshExpires = decodedRefresh?.exp
      ? new Date(decodedRefresh.exp * 1000)
      : undefined;

    nextResponse.cookies.set(
      "refresh_token",
      refreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        domain: COOKIE_DOMAIN,
        expires: refreshExpires,
      }
    );

    return nextResponse;
  } catch (error) {
    console.error(
      "Auth callback error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
