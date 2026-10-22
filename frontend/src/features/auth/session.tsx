"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, Permission } from "@/lib/types";
import { getApi } from "@/lib/api";
import { effective } from "@/lib/access";
const Context = createContext<{
  session: Session | null;
  ready: boolean;
  refresh: () => Promise<void>;
  can: (key: Permission) => boolean;
}>({ session: null, ready: false, refresh: async () => {}, can: () => false });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setSession(await getApi().session());
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const check = () => {
      void refresh();
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        session,
        ready,
        refresh,
        can: (key) => !!session && effective(session.user, key, session.grants),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
