import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interviewer",
  description: "AI-powered technical interview platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (children);
}