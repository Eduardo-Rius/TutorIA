import React, { useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';
import { ProposedPlanning } from '../../../application/planning/MockGenerativeAdapter';

interface Props {
  proposal: ProposedPlanning;
  onApprove: (finalProposal: ProposedPlanning) => void;
  onBack: () => void;
}

export const HagamoslaTuya: React.FC<Props> = ({ proposal, onApprove, onBack }) => {
  const [editedProposal, setEditedProposal] = useState<ProposedPlanning>(proposal);

  const handlePurposeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedProposal(prev => ({ ...prev, generalPurpose: e.target.value }));
  };

  const handleActivityChange = (index: number, field: string, value: string) => {
    setEditedProposal(prev => {
      const newActivities = [...prev.activities];
      newActivities[index] = { ...newActivities[index], [field]: value };
      return { ...prev, activities: newActivities };
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <Stack gap={8}>
        <div className="text-center">
          <Heading as="h1" size="2xl" className="text-gray-900 mb-4 tracking-tight">
            Hagámosla tuya
          </Heading>
          <Text size="lg" className="text-gray-600">
            Esta es una propuesta basada en tu contexto y en la memoria de la institución. 
            Revísala, modifícala y ajústala a tu criterio profesional.
          </Text>
        </div>

        <Surface withBorder radius="lg" className="p-8 shadow-sm bg-white">
          <Stack gap={8}>
            
            {/* General Purpose Section */}
            <div className="flex flex-col gap-3">
              <Heading as="h3" size="lg" className="text-gray-800 border-b pb-2 border-gray-100">
                Propósito General
              </Heading>
              <textarea 
                value={editedProposal.generalPurpose}
                onChange={handlePurposeChange}
                rows={4}
                className="w-full border-0 rounded-md p-4 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 leading-relaxed resize-none"
              />
            </div>

            {/* Activities Section */}
            <div className="flex flex-col gap-4">
              <Heading as="h3" size="lg" className="text-gray-800 border-b pb-2 border-gray-100">
                Secuencia Didáctica
              </Heading>
              
              <Stack gap={4}>
                {editedProposal.activities.map((activity, index) => (
                  <div key={index} className="p-5 border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <input 
                        type="text" 
                        value={activity.title}
                        onChange={(e) => handleActivityChange(index, 'title', e.target.value)}
                        className="font-semibold text-lg text-gray-900 bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-2/3"
                      />
                      <input 
                        type="text" 
                        value={activity.duration}
                        onChange={(e) => handleActivityChange(index, 'duration', e.target.value)}
                        className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded w-20 text-center outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>
                    <textarea 
                      value={activity.description}
                      onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                      rows={3}
                      className="w-full border-0 text-sm p-3 bg-gray-50 rounded text-gray-700 outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                    />
                  </div>
                ))}
              </Stack>
            </div>
            
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <Button variant="ghost" onClick={onBack}>Volver a generar</Button>
              <Button variant="primary" size="lg" onClick={() => onApprove(editedProposal)} className="px-8 shadow-md">
                Aprobar Planeación
              </Button>
            </div>
          </Stack>
        </Surface>
      </Stack>
    </div>
  );
};
