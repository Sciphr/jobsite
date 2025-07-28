"use client";

import { SessionProvider } from "next-auth/react";
import { SiteThemeProvider } from "./contexts/SiteThemeContext";

export function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <SiteThemeProvider>
        {children}
      </SiteThemeProvider>
    </SessionProvider>
  );
}
