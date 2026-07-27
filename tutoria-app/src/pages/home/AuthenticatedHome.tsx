import React from 'react';
import { AppShell, PageHeader, ContentArea } from '../../components/layouts';
import { Heading, Text, Button } from '../../components/primitives';
import { useSession } from '../../providers/SessionProvider';
import { useMembership } from '../../providers/MembershipProvider';
import { Stack } from '../../components/foundations';

export const AuthenticatedHome: React.FC = () => {
  const { logout, session } = useSession();
  const { contextState, selectContext } = useMembership();
  const activeMembership = contextState.activeContext?.membership;

  return (
    <AppShell>
      <PageHeader
        title="Inicio"
        subtitle="Bienvenido a TutorIA"
        actionsSlot={
          <Stack align="center">
            {contextState.availableMemberships.length > 1 && (
              <Button variant="outline" onClick={() => selectContext('') /* reset to selector */}>
                Cambiar Centro
              </Button>
            )}
            <Button variant="outline" onClick={logout}>Cerrar Sesión</Button>
          </Stack>
        }
      />
      <ContentArea>
        <div className="p-6">
          <Heading as="h2" size="xl">Panel Principal</Heading>
          <Stack gap={2} className="mt-4">
            <Text><strong>ID de Usuario:</strong> {session.userId}</Text>
            <Text><strong>Centro Activo:</strong> {activeMembership?.centerId || 'Ninguno'}</Text>
            <Text><strong>Rol:</strong> {activeMembership?.roleId || 'Ninguno'}</Text>
            <Text><strong>Tenant:</strong> {activeMembership?.tenantId || 'Ninguno'}</Text>
          </Stack>
        </div>
      </ContentArea>
    </AppShell>
  );
};
