"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { AppSession, SessionUser } from "@/lib/types";

interface SessionContextType {
  session: AppSession | null;
  isLoading: boolean;
  user: SessionUser | null;
  refetchSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const result = await authClient.getSession();
      if (result?.data?.user) {
        setSession({ user: result.data.user as SessionUser });
      } else {
        setSession(null);
        router.push("/login");
      }
    } catch (error) {
      console.error("[SessionProvider] Error fetching session:", error);
      setSession(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [router]);

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        user: session?.user || null,
        refetchSession: fetchSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return ctx;
}
