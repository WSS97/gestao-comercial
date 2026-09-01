import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import ActivationScreen from '@/components/ActivationScreen';
import Navbar, { type Route } from '@/components/Navbar';
import PDVScreen from '@/components/PDVScreen';
import EstoqueScreen from '@/components/EstoqueScreen';
import DashboardScreen from '@/components/DashboardScreen';
import WorkOrdersScreen from '@/components/WorkOrdersScreen';
import FinanceiroScreen from '@/components/FinanceiroScreen';
import AdminLockModal from '@/components/AdminLockModal';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import TermsModal from '@/components/TermsModal';
import { isDeviceAuthorized, clearDeviceToken, getDeviceInfo } from '@/lib/auth';
import { isReadOnlyCached } from '@/lib/readonly';
import { supabase, type AuthorizedDevice } from '@/lib/supabase';

const PROTECTED_ROUTES: Route[] = ['financeiro'];

function AppInner() {
  const [authorized, setAuthorized] = useState(isDeviceAuthorized());
  const [route, setRoute] = useState<Route>('pdv');
  const [company, setCompany] = useState<AuthorizedDevice | null>(null);
  const { hasSenha, isAdminUnlocked, setSenhaAdmin, clearAll } = useAdminAuth();
  const [lockOpen, setLockOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const readOnly = company ? Boolean(company.is_read_only) : isReadOnlyCached();

  useEffect(() => {
    const isAuth = isDeviceAuthorized();
    setAuthorized(isAuth);

    if (isAuth) {
      async function loadCompanyData() {
        const localDevice = getDeviceInfo();
        if (!localDevice) return;

        setCompany(localDevice);

        const deviceId = localDevice.id;
        if (deviceId) {
          const { data, error } = await supabase
            .from('authorized_devices')
            .select('*')
            .eq('id', deviceId)
            .maybeSingle();

          if (!error && data) {
            setCompany(data);
            setSenhaAdmin(data.senha_admin ?? null);
            if (!data.terms_accepted) {
              setTermsOpen(true);
            }
          }
        }
      }
      loadCompanyData();
    }
  }, [authorized, setSenhaAdmin]);

  const handleDisconnect = () => {
    clearDeviceToken();
    clearAll();
    setAuthorized(false);
    setCompany(null);
    setRoute('pdv');
    setLockOpen(false);
    setPendingRoute(null);
    setTermsOpen(false);
  };

  const handleNavigate = (r: Route) => {
    if (PROTECTED_ROUTES.includes(r) && hasSenha && !isAdminUnlocked) {
      setPendingRoute(r);
      setLockOpen(true);
      return;
    }
    setRoute(r);
  };

  const handleUnlockClose = () => {
    setLockOpen(false);
    setPendingRoute(null);
  };

  useEffect(() => {
    if (lockOpen && isAdminUnlocked) {
      setLockOpen(false);
      if (pendingRoute) {
        setRoute(pendingRoute);
        setPendingRoute(null);
      }
    }
  }, [lockOpen, isAdminUnlocked, pendingRoute]);

  if (!authorized) {
    return <ActivationScreen onActivated={() => setAuthorized(true)} />;
  }

  if (termsOpen) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
        <TermsModal
          onAccepted={() => {
            setTermsOpen(false);
            setCompany((prev) => prev ? { ...prev, terms_accepted: true, terms_accepted_at: new Date().toISOString() } : prev);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <Navbar
        route={route}
        onNavigate={handleNavigate}
        onDisconnect={handleDisconnect}
        company={company}
      />
      {readOnly && <ReadOnlyBanner />}
      <main>
        {route === 'pdv' && <PDVScreen readOnly={readOnly} />}
        {route === 'estoque' && <EstoqueScreen readOnly={readOnly} />}
        {route === 'os' && <WorkOrdersScreen company={company} />}
        {route === 'dashboard' && <DashboardScreen />}
        {route === 'financeiro' && <FinanceiroScreen readOnly={readOnly} />}
      </main>

      {lockOpen && (
        <AdminLockModal
          viewName={pendingRoute === 'dashboard' ? 'Dashboard' : 'Financeiro'}
          onClose={handleUnlockClose}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AppInner />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
