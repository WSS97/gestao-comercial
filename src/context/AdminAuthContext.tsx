import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const SS_KEY = 'admin_unlocked';

type AdminAuthContextType = {
  isAdminUnlocked: boolean;
  senhaAdmin: string | null;
  hasSenha: boolean;
  setSenhaAdmin: (s: string | null) => void;
  unlock: (remember: boolean) => void;
  lock: () => void;
  clearAll: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [senhaAdmin, setSenhaAdminState] = useState<string | null>(null);

  const setSenhaAdmin = useCallback((s: string | null) => {
    setSenhaAdminState(s);
  }, []);

  const unlock = useCallback((remember: boolean) => {
    setIsAdminUnlocked(true);
    if (remember) {
      try {
        sessionStorage.setItem(SS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const lock = useCallback(() => {
    setIsAdminUnlocked(false);
    try {
      sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearAll = useCallback(() => {
    setIsAdminUnlocked(false);
    try {
      sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep state in sync if sessionStorage changes in another tab
  useEffect(() => {
    const handler = () => {
      try {
        const v = sessionStorage.getItem(SS_KEY) === '1';
        setIsAdminUnlocked((prev) => (prev !== v ? v : prev));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const hasSenha = Boolean(senhaAdmin && senhaAdmin.trim() !== '');

  return (
    <AdminAuthContext.Provider
      value={{ isAdminUnlocked, senhaAdmin, hasSenha, setSenhaAdmin, unlock, lock, clearAll }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  return ctx;
}
