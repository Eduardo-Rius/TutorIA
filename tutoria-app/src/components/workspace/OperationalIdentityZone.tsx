import React from 'react';
import { Stack } from '../foundations';
import { Heading, Text, Badge } from '../primitives';
import { ActiveContext } from '../../domain/identity/ActiveContext';

export const OperationalIdentityZone: React.FC<{ context: ActiveContext }> = ({ context }) => {
  const { membership } = context;
  return (
    <Stack gap={1}>
      <Heading as="h1" size="2xl">Workspace</Heading>
      <Stack align="center" gap={3} className="mt-1">
        <Text size="lg" weight={600} color="secondary">
          {membership.centerId || membership.institutionId || membership.tenantId}
        </Text>
        <Badge variant="default" label={membership.roleId} />
      </Stack>
    </Stack>
  );
};
