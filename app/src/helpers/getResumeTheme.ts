import type { ThemeDocument } from "@/resume-engine/types/theme";

export default async function getResumeTheme(themeId?: string | null): Promise<ThemeDocument | null> {
  const path = themeId ? `/api/resume-themes/${themeId}` : `/api/resume-themes/default`;
  try {
    const response = await fetch(`${process.env.API_SERVER_URL}${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    return (data?.content as ThemeDocument) ?? null;
  } catch {
    return null;
  }
}
