import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createInfrastructure } from './composition/createInfrastructure';
import { createApplication } from './composition/createApplication';
import { AppProviders } from './composition/AppProviders';
import { LoginPage } from './pages/auth/LoginPage';
import { OperationalWorkspace } from './pages/home/OperationalWorkspace';
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
              <Navigate to="/workspace" replace />
            </AuthorizationBoundary>
          } />
          
          <Route path="/workspace" element={
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
                <OperationalWorkspace />
              </ContextBoundary>
            </AuthorizationBoundary>
          } />
          
          <Route path="/home" element={<Navigate to="/workspace" replace />} />
          <Route path="/" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
