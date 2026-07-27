import React from 'react';
import { WorkItem } from '../../application/workspace/WorkItem';
import { Card, Heading, Text, Badge, Button } from '../primitives';
import { Stack } from '../foundations';

export const WorkQueueZone: React.FC<{ queue: WorkItem[] }> = ({ queue }) => {
  if (queue.length === 0) return null;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <Badge variant="default" label="Pendiente" />;
      case 'WAITING_APPROVAL': return <Badge variant="default" label="Esperando Aprobación" />;
      case 'BLOCKED': return <Badge variant="primary" label="Bloqueado" />;
      case 'IN_PROGRESS': return <Badge variant="primary" label="En Proceso" />;
      default: return <Badge variant="default" label={status} />;
    }
  };

  return (
    <Stack gap={4}>
      <Heading as="h3" size="md" className="text-content-secondary">Cola de Trabajo (Excepciones)</Heading>
      <Stack gap={3}>
        {queue.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-row justify-between items-center">
              <Stack gap={1}>
                <div className="flex flex-row items-center gap-3">
                  <Text weight={600}>{item.title}</Text>
                  {getStatusBadge(item.status)}
                </div>
                <Text size="sm" color="secondary">{item.description}</Text>
              </Stack>
              <Button variant="outline" size="sm">Resolver</Button>
            </div>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};
