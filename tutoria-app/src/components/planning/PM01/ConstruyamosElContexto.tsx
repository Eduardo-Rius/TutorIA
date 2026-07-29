import React, { useEffect, useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';

interface Props {
  context: { groupId: string; period: string; observations: string };
  onNext: () => void;
  onBack: () => void;
}

export const ConstruyamosElContexto: React.FC<Props> = ({ context, onNext, onBack }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay for entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`max-w-2xl mx-auto py-12 transition-all duration-700 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
      <Stack gap={8}>
        <div className="text-center">
          <Heading as="h1" size="2xl" className="text-gray-900 mb-4 tracking-tight">
            Construyendo el contexto
          </Heading>
          <Text size="lg" className="text-gray-600">
            Antes de planificar, veamos qué sabe la institución sobre tu grupo.
          </Text>
        </div>

        <Surface withBorder radius="lg" className="p-8 shadow-sm bg-white">
          <Stack gap={8}>
            <div className="flex gap-4 p-5 rounded-lg bg-blue-50/50 border border-blue-100">
              <div className="text-blue-500 mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-blue-900 mb-1">Tu Grupo: {context.groupId}</Heading>
                <Text size="sm" className="text-blue-800/80 leading-relaxed">
                  Detectamos que trabajarás con niños de 2 a 3 años. El historial muestra que responden muy bien a actividades motoras al aire libre.
                </Text>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-lg bg-purple-50/50 border border-purple-100">
              <div className="text-purple-500 mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-purple-900 mb-1">El Momento: {context.period}</Heading>
                <Text size="sm" className="text-purple-800/80 leading-relaxed">
                  Este periodo marca el inicio del reconocimiento del entorno. Existen lineamientos institucionales aplicables sobre exploración segura de la naturaleza.
                </Text>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div className="text-emerald-500 mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-emerald-900 mb-1">Tus Observaciones</Heading>
                <Text size="sm" className="text-emerald-800/80 italic">
                  "{context.observations}"
                </Text>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <Button variant="ghost" onClick={onBack}>Regresar</Button>
              <Button variant="primary" size="lg" onClick={onNext} className="px-8 shadow-md">
                Ayúdame a planificar
              </Button>
            </div>
          </Stack>
        </Surface>
      </Stack>
    </div>
  );
};
