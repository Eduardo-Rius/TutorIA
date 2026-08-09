import React from 'react';
import { Stack } from '../../components/foundations/Stack';
import { Surface } from '../../components/foundations/Surface';
import { Container } from '../../components/foundations/Container';
import { Divider } from '../../components/foundations/Divider';
import { Heading } from '../../components/primitives/Heading';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Badge } from '../../components/primitives/Badge';
import { PageHeader } from '../../components/layouts/PageHeader';

export const PlanningReviewer: React.FC = () => {
  return (
    <Container maxWidth="lg" padding={true}>
      <Stack gap={6}>
        <PageHeader
          title="Revisar Planeación"
          subtitle="Auditoría pedagógica y aprobación."
          actionsSlot={<Badge variant="default" label="UNDER_REVIEW" />}
        />

        <Surface withBorder radius="md" className="p-6">
          <Stack gap={6}>
            <Stack gap={2}>
              <Heading as="h3" size="lg">Detalles de la Planeación</Heading>
              <Text>Autor: Anita (Pedagoga)</Text>
              <Text>Ciclo: 2026-2027</Text>
            </Stack>

            <Divider />

            <Stack gap={4}>
              <Heading as="h4" size="md">Resultados de IA</Heading>
              <Surface radius="sm" className="p-4 bg-brandPrimary/10">
                <Stack gap={2}>
                  <Text color="primary">✓ Consistencia Pedagógica: 100%</Text>
                  <Text color="primary">✓ Seguridad: 100%</Text>
                  <Text color="primary">✓ Inclusión: 95%</Text>
                </Stack>
              </Surface>
            </Stack>

            <Divider />

            <Stack gap={4}>
              <Heading as="h3" size="lg">Decisión</Heading>
              <div className="flex flex-row items-center gap-4">
                <Button variant="outline">Rechazar</Button>
                <Button variant="outline">Devolver con Correcciones</Button>
                <Button variant="primary">Aprobar Planeación</Button>
              </div>
            </Stack>
          </Stack>
        </Surface>
      </Stack>
    </Container>
  );
};
