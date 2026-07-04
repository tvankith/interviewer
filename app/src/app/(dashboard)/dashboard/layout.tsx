import type { Metadata } from "next";
import AppShell from "@/components/basic/app-shell";

export const metadata: Metadata = {
  title: "Interviewer",
  description: "AI-powered technical interview platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>{children}</AppShell>
  );
}
