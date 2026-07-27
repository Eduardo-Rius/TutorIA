import React from 'react';
import { ContinuityItem } from '../../application/workspace/WorkspaceReadModel';
import { Card, Heading, Text, Button } from '../primitives';
import { Stack } from '../foundations';

export const ContinuityZone: React.FC<{ items: ContinuityItem[] }> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <Stack gap={4}>
      <Heading as="h3" size="md" className="text-content-secondary">Continuar donde te quedaste</Heading>
      <div className="flex flex-row flex-wrap gap-4">
        {items.map(item => (
          <Card key={item.id} className="p-4 flex-1 min-w-[250px]">
            <Stack gap={3}>
              <div>
                <Text weight={600}>{item.title}</Text>
                <Text size="sm" color="secondary" className="mt-1">Pausa: {item.pauseReason}</Text>
              </div>
              <Button variant="outline" size="sm" className="w-full">Retomar</Button>
            </Stack>
          </Card>
        ))}
      </div>
    </Stack>
  );
};
