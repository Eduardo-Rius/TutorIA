import React from 'react';
import { useMembership } from '../../providers/MembershipProvider';
import { Card, Heading, Text, Button } from '../primitives';
import { Stack } from '../foundations';

export const ContextSelector: React.FC = () => {
  const { contextState, selectContext } = useMembership();

  if (contextState.status !== 'SELECTING_CONTEXT') return null;

  return (
    <Stack align="center" justify="center" className="min-h-screen bg-surface-base">
      <Stack gap={6}>
        <div className="text-center">
          <Heading as="h1" size="xl">Selecciona tu Entorno</Heading>
          <Text color="secondary">Tienes acceso a múltiples centros</Text>
        </div>

        <Stack gap={4}>
          {contextState.availableMemberships.map((membership) => (
            <Card key={membership.id} className="p-4 shadow-sm">
              <Stack gap={3}>
                <div>
                  <Text weight={600}>{membership.centerId || membership.institutionId || membership.tenantId}</Text>
                  <Text size="sm" color="secondary">Rol: {membership.roleId}</Text>
                </div>
                <Button variant="outline" onClick={() => selectContext(membership.id)}>
                  Entrar
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
};
