import React from 'react';
import { Stack } from '../../components/foundations/Stack';
import { Surface } from '../../components/foundations/Surface';
import { Container } from '../../components/foundations/Container';
import { Divider } from '../../components/foundations/Divider';
import { Heading } from '../../components/primitives/Heading';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { PageHeader } from '../../components/layouts/PageHeader';

export const PlanningEditor: React.FC = () => {
  return (
    <Container maxWidth="lg" padding={true}>
      <Stack gap={6}>
        <PageHeader 
          title="Editar Planeación" 
          subtitle="Modifica los propósitos y actividades."
        />
        
        <Surface withBorder radius="md" className="p-6">
          <Stack gap={6}>
            <Stack gap={2}>
              <Heading as="h3" size="lg">Propósito General</Heading>
              <Text size="sm">
                Define el objetivo pedagógico de esta planeación.
              </Text>
              <div className="p-4 bg-white border border-gray-200 rounded-md mt-2">
                <Text>Área de texto para el propósito...</Text>
              </div>
            </Stack>
            
            <Divider />
            
            <Stack gap={4}>
              <Heading as="h3" size="lg">Actividades</Heading>
              <Button variant="outline" size="md">Agregar Actividad</Button>
            </Stack>
            
            <div className="flex flex-row items-center justify-end gap-4 mt-4">
              <Button variant="ghost">Guardar Borrador</Button>
              <Button variant="primary">Enviar a Revisión</Button>
            </div>
          </Stack>
        </Surface>
      </Stack>
    </Container>
  );
};
