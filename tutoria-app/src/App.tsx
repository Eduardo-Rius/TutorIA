import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createInfrastructure } from './composition/createInfrastructure';
import { createApplication } from './composition/createApplication';
import { AppProviders } from './composition/AppProviders';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthenticatedHome } from './pages/home/AuthenticatedHome';
import { AuthorizationBoundary } from './components/auth/AuthorizationBoundary';
import { LoadingState } from './components/layouts';

const infra = createInfrastructure();
const app = createApplication(infra);

function App() {
  return (
    <AppProviders infra={infra} app={app}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <AuthorizationBoundary
              unauthorized={<LoginPage />}
              loading={<LoadingState text="Validando sesión..." />}
            >
              <Navigate to="/home" replace />
            </AuthorizationBoundary>
          } />
          
          <Route path="/home" element={
            <AuthorizationBoundary
              unauthorized={<Navigate to="/login" replace />}
              loading={<LoadingState text="Cargando aplicación..." />}
            >
              <AuthenticatedHome />
            </AuthorizationBoundary>
          } />
          
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
