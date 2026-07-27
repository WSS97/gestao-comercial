import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import ActivationScreen from '@/components/ActivationScreen';
import Navbar, { type Route } from '@/components/Navbar';
import PDVScreen from '@/components/PDVScreen';
import EstoqueScreen from '@/components/EstoqueScreen';
import DashboardScreen from '@/components/DashboardScreen';
import WorkOrdersScreen from '@/components/WorkOrdersScreen';
import { isDeviceAuthorized, clearDeviceToken } from '@/lib/auth';

function AppInner() {
  const [authorized, setAuthorized] = useState(isDeviceAuthorized());
  const [route, setRoute] = useState<Route>('pdv');

  useEffect(() => {
    setAuthorized(isDeviceAuthorized());
  }, []);

  const handleDisconnect = () => {
    clearDeviceToken();
    setAuthorized(false);
    setRoute('pdv');
  };

  if (!authorized) {
    return <ActivationScreen onActivated={() => setAuthorized(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors">
      <Navbar route={route} onNavigate={setRoute} onDisconnect={handleDisconnect} />
      <main>
        {route === 'pdv' && <PDVScreen />}
        {route === 'estoque' && <EstoqueScreen />}
        {route === 'os' && <WorkOrdersScreen />}
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
