"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserSession } from "@/types";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  unreadCount: number;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  unreadCount: 0,
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUnreadCount(data.user?.unreadNotifications || 0);
      } else {
        setUser(null);
        if (pathname !== "/login" && !pathname.startsWith("/api")) {
          router.push("/login");
        }
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, unreadCount, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
