import React from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';
import { useNavigate } from 'react-router-dom';

export const MomentoWow: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
      <Stack gap={8} className="max-w-2xl w-full">
        <Surface withBorder radius="xl" className="p-12 shadow-md bg-white text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-sm">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <Heading as="h1" size="2xl" className="text-gray-900 mb-6 tracking-tight">
            Planeación registrada correctamente.
          </Heading>
          
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-8 text-left">
            <Text size="lg" className="text-gray-700 leading-relaxed mb-4">
              Hoy no solo has creado una planeación.
            </Text>
            <Text size="lg" className="text-gray-700 leading-relaxed mb-4 font-medium">
              Has contribuido al conocimiento institucional de tu centro.
            </Text>
            <Text size="md" className="text-gray-600 leading-relaxed mb-4">
              Tu experiencia, tus observaciones y los ajustes que realizaste ayudarán a fortalecer futuras propuestas 
              y permitirán que la institución continúe aprendiendo con el tiempo.
            </Text>
            <Text size="md" className="text-gray-800 font-semibold italic mt-6 border-l-4 border-blue-500 pl-4">
              Gracias por formar parte de una institución que aprende.
            </Text>
          </div>

          <Button 
            variant="primary" 
            size="lg" 
            onClick={() => navigate('/workspace')} 
            className="px-10 shadow-sm"
          >
            Volver a mi espacio
          </Button>
        </Surface>
      </Stack>
    </div>
  );
};
