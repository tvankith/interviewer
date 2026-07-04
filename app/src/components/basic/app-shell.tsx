"use client";
import Header from "@/components/basic/header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <Header />
      <main className="flex-1 relative overflow-auto">{children}</main>
    </div>
  );
}
