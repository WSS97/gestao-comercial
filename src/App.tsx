import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import ActivationScreen from '@/components/ActivationScreen';
import Navbar, { type Route } from '@/components/Navbar';
import PDVScreen from '@/components/PDVScreen';
import EstoqueScreen from '@/components/EstoqueScreen';
import DashboardScreen from '@/components/DashboardScreen';
import WorkOrdersScreen from '@/components/WorkOrdersScreen';
import { isDeviceAuthorized, clearDeviceToken, getDeviceInfo } from '@/lib/auth';
import { supabase, type AuthorizedDevice } from '@/lib/supabase';

function AppInner() {
  const [authorized, setAuthorized] = useState(isDeviceAuthorized());
  const [route, setRoute] = useState<Route>('pdv');
  const [company, setCompany] = useState<AuthorizedDevice | null>(null);

  useEffect(() => {
    const isAuth = isDeviceAuthorized();
    setAuthorized(isAuth);

    if (isAuth) {
      async function loadCompanyData() {
        const localDevice = getDeviceInfo();
        if (!localDevice) return;

        // 1. Define de imediato usando o cache local
        setCompany(localDevice);

        // 2. Atualiza em segundo plano via Supabase
        const deviceId = localDevice.id;

        if (deviceId) {
          const { data, error } = await supabase
            .from('authorized_devices')
            .select('*')
            .eq('id', deviceId)
            .maybeSingle();

          if (!error && data) {
            setCompany(data);
          }
        }
      }

      loadCompanyData();
    }
  }, [authorized]);

  const handleDisconnect = () => {
    clearDeviceToken();
    setAuthorized(false);
    setCompany(null);
    setRoute('pdv');
  };

  if (!authorized) {
    return <ActivationScreen onActivated={() => setAuthorized(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <Navbar route={route} onNavigate={setRoute} onDisconnect={handleDisconnect} company={company} />
      <main>
        {route === 'pdv' && <PDVScreen />}
        {route === 'estoque' && <EstoqueScreen />}
        {route === 'os' && <WorkOrdersScreen company={company} />}
        {route === 'dashboard' && <DashboardScreen />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}