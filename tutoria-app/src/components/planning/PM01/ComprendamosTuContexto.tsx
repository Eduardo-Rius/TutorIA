import React, { useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';

interface Props {
  onNext: (context: { groupId: string; period: string; observations: string }) => void;
}

export const ComprendamosTuContexto: React.FC<Props> = ({ onNext }) => {
  const [groupId, setGroupId] = useState('Maternal B');
  const [period, setPeriod] = useState('Septiembre - Explorando el mundo');
  const [observations, setObservations] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observations.trim()) return;
    onNext({ groupId, period, observations });
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <Stack gap={8}>
        <div className="text-center max-w-2xl mx-auto">
          <Heading as="h1" size="3xl" className="text-brandDark mb-4 tracking-tight font-poppins font-bold">
            Comprendamos tu contexto
          </Heading>
          <Text size="lg" className="text-gray-600 font-inter">
            Cuéntanos qué está pasando con tu grupo. No necesitas usar lenguaje técnico,
            solo describe lo que has observado en los niños últimamente.
          </Text>
        </div>

        <Surface className="p-10 shadow-soft bg-white border-0 rounded-[24px]">
          <form onSubmit={handleSubmit}>
            <Stack gap={8}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-brandDark font-poppins">¿Con qué grupo estás hoy?</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="border border-borderDefault rounded-[12px] p-4 bg-surfaceLight focus:ring-1 focus:ring-brandPrimary focus:border-brandPrimary outline-none transition-all text-gray-800 font-inter appearance-none"
                  >
                    <option value="Maternal A">Maternal A (1-2 años)</option>
                    <option value="Maternal B">Maternal B (2-3 años)</option>
                    <option value="Preescolar 1">Preescolar 1 (3-4 años)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-brandDark font-poppins">El Momento</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="border border-borderDefault rounded-[12px] p-4 bg-surfaceLight focus:ring-1 focus:ring-brandPrimary focus:border-brandPrimary outline-none transition-all text-gray-800 font-inter appearance-none"
                  >
                    <option value="Bloque 1 - Identidad">Bloque 1 - Identidad</option>
                    <option value="Septiembre - Explorando el mundo">Septiembre - Explorando el mundo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-brandDark font-poppins">¿Qué ha llamado tu atención?</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Cuéntamelo como si hablaras con otra docente..."
                  rows={5}
                  className="border border-borderDefault rounded-[16px] p-5 bg-surfaceLight focus:ring-1 focus:ring-brandPrimary focus:border-brandPrimary outline-none transition-all resize-none text-gray-800 font-inter text-base placeholder:text-gray-400 leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!observations.trim()}
                  className="px-10 h-12 rounded-[50px] font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] shadow-sm transition-all duration-300"
                >
                  Continuar
                </Button>
              </div>
            </Stack>
          </form>
        </Surface>
      </Stack>
    </div>
  );
};
