import { NextRequest, NextResponse } from "next/server";

// Must match the domain the cookies were set with, or the browser won't clear them
const COOKIE_DOMAIN =
  process.env.COOKIE_DOMAIN || undefined;

export async function POST(
  request: NextRequest
) {
  try {
    const response =
      NextResponse.json({
        ok: true,
        message: "Logged out",
      });

    // Clear httpOnly cookies
    response.cookies.delete({
      name: "access_token",
      path: "/",
      domain: COOKIE_DOMAIN,
    });
    response.cookies.delete({
      name: "refresh_token",
      path: "/",
      domain: COOKIE_DOMAIN,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
