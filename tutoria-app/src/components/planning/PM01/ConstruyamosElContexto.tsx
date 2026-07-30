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
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`max-w-3xl mx-auto py-12 transition-all duration-700 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
      <Stack gap={8}>
        <div className="text-center max-w-2xl mx-auto">
          <Heading as="h1" size="3xl" className="text-brandDark mb-4 tracking-tight font-poppins font-bold">
            Construyendo el contexto
          </Heading>
          <Text size="lg" className="text-gray-600 font-inter">
            Esto es lo que la institución recuerda sobre tu grupo.
          </Text>
        </div>

        <Surface className="p-10 shadow-soft bg-white border-0 rounded-[24px]">
          <Stack gap={6}>
            <div className="flex gap-4 p-6 rounded-[16px] bg-brandPrimary/10 border border-brandPrimary/20">
              <div className="text-brandPrimary mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-brandDark mb-2 font-poppins font-semibold">Tu Grupo: {context.groupId}</Heading>
                <Text size="sm" className="text-gray-700 leading-relaxed font-inter">
                  Detectamos que trabajarás con niños de 2 a 3 años. El historial muestra que responden muy bien a actividades motoras al aire libre.
                </Text>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-[16px] bg-brandSecondary/10 border border-brandSecondary/20">
              <div className="text-brandSecondary mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-brandDark mb-2 font-poppins font-semibold">El Momento: {context.period}</Heading>
                <Text size="sm" className="text-gray-700 leading-relaxed font-inter">
                  Este periodo marca el inicio del reconocimiento del entorno. Existen lineamientos institucionales aplicables sobre exploración segura de la naturaleza.
                </Text>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-[16px] bg-success/10 border border-success/20">
              <div className="text-success mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <Heading as="h3" size="md" className="text-brandDark mb-2 font-poppins font-semibold">Tus Observaciones</Heading>
                <Text size="sm" className="text-gray-700 italic font-inter leading-relaxed">
                  "{context.observations}"
                </Text>
              </div>
            </div>

            <div className="pt-8 mt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={onBack} className="text-gray-500 font-poppins font-medium hover:bg-gray-50 rounded-[50px] px-6 h-12">
                Regresar
              </Button>
              <Button variant="primary" onClick={onNext} className="px-10 h-12 rounded-[50px] font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] shadow-sm transition-all duration-300">
                Ayúdame a planificar
              </Button>
            </div>
          </Stack>
        </Surface>
      </Stack>
    </div>
  );
};
