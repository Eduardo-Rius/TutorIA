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
    <div className="max-w-2xl mx-auto py-12">
      <Stack gap={8}>
        <div className="text-center">
          <Heading as="h1" size="2xl" className="text-gray-900 mb-4 tracking-tight">
            Comprendamos tu contexto
          </Heading>
          <Text size="lg" className="text-gray-600">
            Cuéntanos qué está pasando con tu grupo. No necesitas usar lenguaje técnico, 
            solo describe lo que has observado en los niños últimamente.
          </Text>
        </div>

        <Surface withBorder radius="lg" className="p-8 shadow-sm bg-white">
          <form onSubmit={handleSubmit}>
            <Stack gap={6}>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Grupo</label>
                  <select 
                    value={groupId} 
                    onChange={(e) => setGroupId(e.target.value)}
                    className="border border-gray-300 rounded-md p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Maternal A">Maternal A (1-2 años)</option>
                    <option value="Maternal B">Maternal B (2-3 años)</option>
                    <option value="Preescolar 1">Preescolar 1 (3-4 años)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Periodo</label>
                  <select 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)}
                    className="border border-gray-300 rounded-md p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Bloque 1 - Identidad">Bloque 1 - Identidad</option>
                    <option value="Septiembre - Explorando el mundo">Septiembre - Explorando el mundo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">¿Qué has observado en los niños esta semana?</label>
                <textarea 
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ej. Han estado muy curiosos por las hormigas que encontraron en el patio, hacen muchas preguntas sobre dónde viven..."
                  rows={4}
                  className="border border-gray-300 rounded-md p-4 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-gray-800"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  disabled={!observations.trim()}
                  className="px-8 shadow-md"
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
