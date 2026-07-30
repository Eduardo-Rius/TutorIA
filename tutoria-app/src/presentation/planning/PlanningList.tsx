import React from 'react';
import { Stack } from '../../components/foundations/Stack';
import { Surface } from '../../components/foundations/Surface';
import { Container } from '../../components/foundations/Container';
import { Inline } from '../../components/foundations/Inline';
import { Heading } from '../../components/primitives/Heading';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Badge } from '../../components/primitives/Badge';
import { PageHeader } from '../../components/layouts/PageHeader';
import { PlanStatus } from '../../domain/planning/PlanStatus';

const MOCK_PLANS = [
  { id: '1', cycleId: '2026-2027', status: PlanStatus.DRAFT, version: 'v1' },
  { id: '2', cycleId: '2026-2027', status: PlanStatus.UNDER_REVIEW, version: 'v1' },
  { id: '3', cycleId: '2026-2027', status: PlanStatus.APPROVED, version: 'v2' }
];

export const PlanningList: React.FC = () => {
  return (
    <Container maxWidth="lg" padding={true}>
      <Stack gap={6}>
        <PageHeader
          title="Planeaciones Pedagógicas"
          subtitle="Gestiona las planeaciones de tu centro."
          actionsSlot={<Button variant="primary">Crear Planeación</Button>}
        />

        <Stack gap={4}>
          {MOCK_PLANS.map(plan => (
            <Surface key={plan.id} withBorder radius="md" className="p-4">
              <div className="flex flex-row items-center justify-between">
                <Stack gap={2}>
                  <Heading as="h3" size="lg">Ciclo {plan.cycleId}</Heading>
                  <Text size="sm">Versión: {plan.version}</Text>
                </Stack>
                <div className="flex flex-row items-center gap-4">
                  <Badge
                    variant={plan.status === PlanStatus.APPROVED ? 'primary' : 'default'}
                    label={plan.status}
                  />
                  <Button variant="outline" size="sm">Ver Detalles</Button>
                </div>
              </div>
            </Surface>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
};
