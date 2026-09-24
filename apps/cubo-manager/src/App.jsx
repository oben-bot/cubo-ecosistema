import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/Auth/LoginScreen';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import DashboardMenu from './modules/Dashboard/DashboardMain';
import Warehouse from './modules/Warehouse/Warehouse';
import ClientesMain from './modules/Customers/ClientesMain';
import FinanzasMain from './modules/Finance/FinanzasMain';
import ProductionMain from './modules/Production/ProductionMain';
import CotizacionesMain from './modules/Quotations/CotizacionesMain';
import Assistant from './components/IA/Assistant';
import VentasMain from './modules/Sales/VentasMain';
import LibraryMain from './modules/Library/LibraryMain';
import CosteoMain from './modules/Costeo/CosteoMain';
import SettingsMain from './modules/Settings/SettingsMain';
import LayoutSidebar from './components/Layout/LayoutSidebar';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const completed = await window.electron.config.get('onboarding_completed');
        setOnboardingComplete(completed === 'true' || completed === true);
        
        const tieneContrasena = await window.electron.auth.tieneContrasena();
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsAuth(isLoggedIn && tieneContrasena);
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  if (loading) return <div className="loading-screen">Cargando...</div>;

  if (!onboardingComplete) {
    return <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />;
  }

  if (!isAuth) {
    return <LoginScreen onLogin={() => setIsAuth(true)} />;
  }

  return (
    <div className="app-layout">
      <LayoutSidebar onLogout={() => setIsAuth(false)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardMenu />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/customers" element={<ClientesMain />} />
          <Route path="/finance" element={<FinanzasMain />} />
          <Route path="/production" element={<ProductionMain />} />
          <Route path="/quotations" element={<CotizacionesMain />} />
          <Route path="/sales" element={<VentasMain />} />
          <Route path="/library" element={<LibraryMain />} />
          <Route path="/costeo" element={<CosteoMain />} />
          <Route path="/settings" element={<SettingsMain />} />
          <Route path="/assistant" element={<Assistant />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
