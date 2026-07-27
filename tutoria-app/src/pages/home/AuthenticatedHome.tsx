import React from 'react';
import { AppShell, PageHeader, ContentArea } from '../../components/layouts';
import { Heading, Text, Button } from '../../components/primitives';
import { useSession } from '../../providers/SessionProvider';

export const AuthenticatedHome: React.FC = () => {
  const { logout, session } = useSession();

  return (
    <AppShell>
      <PageHeader
        title="Inicio"
        subtitle="Bienvenido a TutorIA"
        actionsSlot={<Button variant="outline" onClick={logout}>Cerrar Sesión</Button>}
      />
      <ContentArea>
        <Heading as="h2" size="xl">Panel Principal</Heading>
        <Text>ID de Usuario: {session.userId}</Text>
      </ContentArea>
    </AppShell>
  );
};
