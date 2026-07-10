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
      Buffer.from(
        payload,
        "base64"
      ).toString("utf-8")
    );

    return decoded;
  } catch {
    return null;
  }
}

const REFRESH_ENDPOINT =
  "/api/auth/refresh";

async function refreshAccessToken(
  refreshToken: string
) {
  try {
    const response = await fetch(
      `${BACKEND_URL}${REFRESH_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
        signal:
          AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.ok || !data.access_token) {
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error(
      "Refresh Error:",
      error
    );

    return null;
  }
}

async function proxyRequest({
  request,
  accessToken,
  body,
}: {
  request: NextRequest;
  accessToken?: string;
  body?: string | ArrayBuffer;
}) {
  const pathname =
    request.nextUrl.pathname.replace(
      "/api/backend",
      ""
    );

  const targetUrl =
    `${BACKEND_URL}${pathname}${request.nextUrl.search}`;

  const headers =
    new Headers();

  // Copy incoming headers (except sensitive ones)
  request.headers.forEach(
    (value, key) => {
      const ignoredHeaders = [
        "host",
        "connection",
        "content-length",
        "cookie", // Don't forward cookies; use Authorization header instead
      ];

      if (
        ignoredHeaders.includes(
          key.toLowerCase()
        )
      ) {
        return;
      }

      headers.set(key, value);
    }
  );

  // Send access token via Authorization header
  // Backend accepts tokens from either Authorization header or cookies
  // Web clients: httpOnly cookies -> Authorization header (via this proxy)
  // Mobile/CLI: Authorization header directly
  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`
    );
  }

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
    signal:
      AbortSignal.timeout(30000),
  });
}

async function handler(
  request: NextRequest
) {
  try {
    const accessToken =
      request.cookies.get(
        "access_token"
      )?.value;

    const refreshToken =
      request.cookies.get(
        "refresh_token"
      )?.value;
    // Read body ONCE — use arrayBuffer for multipart to preserve binary (e.g. PDF uploads)
    let body: string | ArrayBuffer | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentType = request.headers.get("content-type") ?? "";
      body = contentType.includes("multipart/form-data")
        ? await request.arrayBuffer()
        : await request.text();
    }

    // If no access token but refresh token exists, refresh first
    let currentAccessToken = accessToken;
    let refreshTokensCookie: {
      access_token?: { token: string; expires?: Date };
      refresh_token?: { token: string; expires?: Date };
    } | null = null;

    if (!accessToken && refreshToken) {
      const refreshed =
      await refreshAccessToken(
        refreshToken
      );

      if (!refreshed) {
        const redirectResponse =
          NextResponse.redirect(
            new URL(
              "/signin",
              request.url
            ),
            { status: 307 }
          );

        redirectResponse.cookies.delete(
          "access_token"
        );

        redirectResponse.cookies.delete(
          "refresh_token"
        );

        return redirectResponse;
      }

      currentAccessToken =
        refreshed.accessToken;

      // Store tokens to set on final response
      const decoded = decodeToken(
        refreshed.accessToken
      );
      const expires = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : undefined;

      refreshTokensCookie = {
        access_token: {
          token: refreshed.accessToken,
          expires,
        },
      };

      if (
        refreshed.refreshToken
      ) {
        refreshTokensCookie.refresh_token = {
          token: refreshed.refreshToken,
        };
      }
    }

    // Initial request with current access token
    let response =
      await proxyRequest({
        request,
        accessToken: currentAccessToken,
        body,
      });

    // Handle 401 responses (expired or invalid token)
    if (
      response.status === 401 &&
      refreshToken
    ) {
      // Check error code to see if token expired
      let shouldRefresh = true;
      try {
        const errorData =
          await response.clone()
            .json()
            .catch(() => ({}));

        // If error code is not TOKEN_EXPIRED, don't retry
        // TOKEN_EXPIRED means backend couldn't validate token (likely expired)
        // Other codes (INVALID_TOKEN, USER_NOT_FOUND) shouldn't retry
        if (
          errorData?.error?.code &&
          errorData.error.code !== "TOKEN_EXPIRED"
        ) {
          shouldRefresh = false;
        }
      } catch {
        // If we can't parse error, assume it's worth retrying
      }

      if (!shouldRefresh) {
        // Non-retryable 401 error
        const nextResponse = new NextResponse(
          response.body,
          {
            status: response.status,
            statusText:
              response.statusText,
            headers: response.headers,
          }
        );
        return nextResponse;
      }

      // Try to refresh token
      const refreshed =
        await refreshAccessToken(
          refreshToken
        );

      // Refresh failed - redirect to signin
      if (!refreshed) {
        const redirectResponse =
          NextResponse.redirect(
            new URL(
              "/signin",
              request.url
            ),
            { status: 307 }
          );

        redirectResponse.cookies.delete(
          "access_token"
        );

        redirectResponse.cookies.delete(
          "refresh_token"
        );

        return redirectResponse;
      }

      // Retry original request with new token
      response =
        await proxyRequest({
          request,
          accessToken:
            refreshed.accessToken,
          body,
        });

      // Build final response
      const nextResponse =
        new NextResponse(
          response.body,
          {
            status:
              response.status,
            statusText:
              response.statusText,
            headers:
              response.headers,
          }
        );

      // Update access token cookie
      const decodedAccess = decodeToken(
        refreshed.accessToken
      );
      const accessExpires =
        decodedAccess?.exp
          ? new Date(decodedAccess.exp * 1000)
          : undefined;

      nextResponse.cookies.set(
        "access_token",
        refreshed.accessToken,
        {
          httpOnly: true,
          secure:
            process.env
              .NODE_ENV ===
            "production",
          sameSite: "lax",
          path: "/",
          domain: COOKIE_DOMAIN,
          expires: accessExpires,
        }
      );

      // Update refresh token cookie if provided
      if (
        refreshed.refreshToken
      ) {
        const decodedRefresh = decodeToken(
          refreshed.refreshToken
        );
        const refreshExpires =
          decodedRefresh?.exp
            ? new Date(
                decodedRefresh.exp * 1000
              )
            : undefined;

        nextResponse.cookies.set(
          "refresh_token",
          refreshed.refreshToken,
          {
            httpOnly: true,
            secure:
              process.env
                .NODE_ENV ===
              "production",
            sameSite: "lax",
            path: "/",
            domain: COOKIE_DOMAIN,
            expires: refreshExpires,
          }
        );
      }

      return nextResponse;
    }

    const nextResponse = new NextResponse(
      response.body,
      {
        status: response.status,
        statusText:
          response.statusText,
        headers: response.headers,
      }
    );

    // Set refreshed tokens if they exist
    if (refreshTokensCookie) {
      if (refreshTokensCookie.access_token) {
        nextResponse.cookies.set(
          "access_token",
          refreshTokensCookie.access_token.token,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV ===
              "production",
            sameSite: "lax",
            path: "/",
            domain: COOKIE_DOMAIN,
            expires:
              refreshTokensCookie.access_token
                .expires,
          }
        );
      }

      if (refreshTokensCookie.refresh_token) {
        nextResponse.cookies.set(
          "refresh_token",
          refreshTokensCookie.refresh_token.token,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV ===
              "production",
            sameSite: "lax",
            path: "/",
            domain: COOKIE_DOMAIN,
            expires:
              refreshTokensCookie.refresh_token
                .expires,
          }
        );
      }
    }

    return nextResponse;
  } catch (error) {
    console.error(
      "Proxy Error:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Internal proxy error",
      },
      {
        status: 500,
      }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;