import React from 'react';
import { NextActionItem } from '../../application/workspace/WorkspaceReadModel';
import { Heading, Button } from '../primitives';
import { Stack } from '../foundations';

export const NextActionZone: React.FC<{ actions: NextActionItem[] }> = ({ actions }) => {
  if (actions.length === 0) return null;

  return (
    <Stack gap={4}>
      <Heading as="h3" size="md" className="text-content-secondary">Siguientes Acciones</Heading>
      <div className="flex flex-row flex-wrap gap-3">
        {actions.map(action => (
          <Button key={action.id} variant="outline">
            {action.label}
          </Button>
        ))}
      </div>
    </Stack>
  );
};
