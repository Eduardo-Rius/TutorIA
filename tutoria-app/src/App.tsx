import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createInfrastructure } from './composition/createInfrastructure';
import { createApplication } from './composition/createApplication';
import { AppProviders } from './composition/AppProviders';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthenticatedHome } from './pages/home/AuthenticatedHome';
import { AuthorizationBoundary } from './components/auth/AuthorizationBoundary';
import { ContextBoundary } from './components/auth/ContextBoundary';
import { ContextSelector } from './components/auth/ContextSelector';
import { LoadingState } from './components/layouts';
import { Stack } from './components/foundations';
import { Heading, Text } from './components/primitives';

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
              <ContextBoundary
                loading={<LoadingState text="Cargando contexto institucional..." />}
                noMemberships={
                  <Stack align="center" justify="center" className="min-h-screen bg-surface-base text-center p-6">
                    <Heading as="h1" size="xl">Pendiente de Aprobación</Heading>
                    <Text color="secondary">Tu cuenta no tiene centros asignados actualmente.</Text>
                  </Stack>
                }
                selector={<ContextSelector />}
              >
                <AuthenticatedHome />
              </ContextBoundary>
            </AuthorizationBoundary>
          } />
          
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
