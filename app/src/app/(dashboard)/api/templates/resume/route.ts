import { NextResponse } from "next/server";
import { join } from "path";
import getDefaultResumeTemplate from "@/helpers/getDefaultResumeTemplate";

export async function GET() {
  const html = await getDefaultResumeTemplate()
  return NextResponse.json({ html });
}
