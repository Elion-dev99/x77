import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AgeGateProvider, useAgeGate } from './context/AgeGateContext';
import { AgeGate } from './components/AgeGate';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { StreamPage } from './pages/StreamPage';
import { StudioPage } from './pages/StudioPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import './i18n';

function AppRoutes() {
  const { verified } = useAgeGate();

  if (!verified) {
    return <AgeGate />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/stream/:id" element={<StreamPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AgeGateProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AgeGateProvider>
    </BrowserRouter>
  );
}
