import React from 'react';
import { FocusItem } from '../../application/workspace/WorkspaceReadModel';
import { Card, Heading, Button } from '../primitives';

export const FocusZone: React.FC<{ focus?: FocusItem }> = ({ focus }) => {
  if (!focus) {
    return (
      <Card className="p-6 bg-surface-subtle border-none">
        <Heading as="h3" size="md" className="text-content-secondary">Todo está bajo control hoy.</Heading>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-l-4 border-l-intent-danger bg-surface-base">
      <div className="flex flex-row justify-between items-center">
        <Heading as="h2" size="lg">{focus.title}</Heading>
        <Button variant="primary">{focus.actionLabel}</Button>
      </div>
    </Card>
  );
};
