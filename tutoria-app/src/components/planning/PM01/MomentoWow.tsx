import React from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ChevronRight } from 'lucide-react';

export const MomentoWow: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4">
      <Stack gap={8} className="max-w-2xl w-full">
        <Surface className="p-12 shadow-soft bg-white text-center border-0 rounded-[24px]">
          <div className="mx-auto w-24 h-24 bg-success/10 text-success rounded-[24px] flex items-center justify-center mb-8 shadow-sm">
            <CheckCircle2 size={48} className="text-success" />
          </div>

          <Heading as="h1" size="2xl" className="text-brandDark mb-8 tracking-tight font-poppins font-bold">
            Hoy ocurrió algo importante.
          </Heading>

          <div className="bg-surfaceSuccess/30 border border-success/20 rounded-[24px] p-10 mb-10 text-left relative overflow-hidden">
            {/* Elemento decorativo */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-success/10 rounded-bl-full -mr-16 -mt-16 z-0"></div>

            <div className="relative z-10 flex flex-col gap-5">
              <Text size="lg" className="text-gray-700 leading-relaxed font-inter">
                Tu experiencia ya forma parte del <span className="font-semibold text-brandDark">conocimiento institucional</span>.
              </Text>
              <Text size="lg" className="text-gray-700 leading-relaxed font-inter">
                La próxima docente que enfrente una situación similar no empezará desde cero. <span className="text-brandPrimary font-medium">Aprenderá también de ti.</span>
              </Text>
              <Text size="lg" className="text-brandDark font-semibold italic mt-4 font-poppins">
                Gracias por ayudar a construir una institución que aprende.
              </Text>
            </div>
          </div>

          <div className="bg-white border border-borderDefault rounded-[16px] p-8 mb-10 text-left mx-auto max-w-sm shadow-sm relative">
            {/* Conector visual */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3">
              <div className="w-1.5 h-6 bg-brandSecondary/20 rounded-full"></div>
            </div>

            <Text size="sm" className="font-bold text-gray-500 uppercase tracking-widest mb-6 text-center font-poppins">
              Contribución registrada
            </Text>
            <div className="space-y-4 font-inter">
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={14} className="text-success" />
                </div>
                <span className="font-medium">Observación preservada</span>
              </div>
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={14} className="text-success" />
                </div>
                <span className="font-medium">Experiencia compartida</span>
              </div>
              <div className="flex items-center gap-4 text-gray-700">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={14} className="text-success" />
                </div>
                <span className="font-medium">Planeación respaldada</span>
              </div>
              <div className="flex items-center gap-4 text-brandDark font-semibold">
                <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
                  <Check size={14} className="text-white" />
                </div>
                <span>Nuevo aprendizaje</span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/workspace')}
            className="px-10 h-14 rounded-[50px] font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] shadow-sm transition-all duration-300 mx-auto flex items-center gap-2"
          >
            Volver a mi espacio
            <ChevronRight size={20} />
          </Button>
        </Surface>
      </Stack>
    </div>
  );
};
