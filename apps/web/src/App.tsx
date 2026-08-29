import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AgeGateProvider, useAgeGate } from './context/AgeGateContext';
import { ToastProvider } from './context/ToastContext';
import { AgeGate } from './components/AgeGate';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { StreamPage } from './pages/StreamPage';
import { StudioPage } from './pages/StudioPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletPage } from './pages/WalletPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './i18n';

function AppRoutes() {
  const { verified } = useAgeGate();
  if (!verified) return <AgeGate />;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/stream/:id" element={<StreamPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/u/:username" element={<ProfilePage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AgeGateProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </AgeGateProvider>
    </BrowserRouter>
  );
}
