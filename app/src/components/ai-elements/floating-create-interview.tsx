"use client";
import Link from "next/link";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

export function FloatingCreateInterview() {
    return (
      <Link href="/interviews/start">
        <Button
          className="fixed z-50 bottom-8 right-8 shadow-lg w-10 h-10"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </Link>
    );
  }
  