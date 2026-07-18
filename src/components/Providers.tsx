"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppDataProvider } from "@/lib/appContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AppDataProvider>{children}</AppDataProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
