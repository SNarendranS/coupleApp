import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PartnerSetupPage } from './pages/PartnerSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { DrawingPage } from './pages/DrawingPage';
import { GamesPage } from './pages/GamesPage';
import { CalendarPage } from './pages/CalendarPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { LinksPage } from './pages/LinksPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      {/* Public Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Authenticated Couple Space */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/partner" element={<PartnerSetupPage />} />
        <Route path="/drawing" element={<DrawingPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
