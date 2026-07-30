import React, { useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Surface } from '../../foundations/Surface';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { Button } from '../../primitives/Button';
import { ProposedPlanning } from '../../../application/planning/MockGenerativeAdapter';
import { CheckCircle2, ChevronRight, PenTool } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto py-12">
      <Stack gap={8}>
        <div className="text-center max-w-2xl mx-auto">
          <Heading as="h1" size="3xl" className="text-brandDark mb-4 tracking-tight font-poppins font-bold">
            Hagámosla tuya
          </Heading>
          <Text size="lg" className="text-gray-600 font-inter">
            Esta es una propuesta basada en tu contexto y en la memoria de la institución.
            Revísala, modifícala y ajústala a tu criterio profesional.
          </Text>
        </div>

        <Surface className="p-10 shadow-soft bg-white border-0 rounded-[24px]">
          <Stack gap={10}>

            {/* Trust Building Context */}
            <div className="bg-brandSecondary/5 border border-brandSecondary/20 rounded-[16px] p-6">
              <Heading as="h4" size="md" className="text-brandDark mb-4 font-poppins font-semibold">
                Esta propuesta fue construida considerando:
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 font-inter">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-brandSecondary w-5 h-5 shrink-0" /> Lo que observaste.
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-brandSecondary w-5 h-5 shrink-0" /> La experiencia previa del centro.
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-brandSecondary w-5 h-5 shrink-0" /> Los lineamientos institucionales.
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-brandSecondary w-5 h-5 shrink-0" /> El contexto de tu grupo.
                </div>
              </div>
            </div>

            {/* General Purpose Section */}
            <div className="flex flex-col gap-4">
              <Heading as="h3" size="lg" className="text-brandDark border-b pb-3 border-gray-100 font-poppins font-bold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-brandPrimary" /> Propósito General
              </Heading>
              <textarea
                value={editedProposal.generalPurpose}
                onChange={handlePurposeChange}
                rows={4}
                className="w-full border border-transparent rounded-[16px] p-5 bg-surfaceLight hover:bg-gray-100 focus:bg-white focus:ring-1 focus:ring-brandPrimary focus:border-brandPrimary outline-none text-gray-700 font-inter leading-relaxed resize-none transition-all"
              />
            </div>

            {/* Activities Section */}
            <div className="flex flex-col gap-5">
              <Heading as="h3" size="lg" className="text-brandDark border-b pb-3 border-gray-100 font-poppins font-bold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-brandPrimary" /> Propuesta de experiencias
              </Heading>

              <Stack gap={5}>
                {editedProposal.activities.map((activity, index) => (
                  <div key={index} className="p-6 border border-borderDefault rounded-[16px] bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group relative overflow-hidden">
                    {/* Indicador visual izquierdo */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brandSecondary opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                         <input
                          type="text"
                          value={activity.title}
                          onChange={(e) => handleActivityChange(index, 'title', e.target.value)}
                          className="font-semibold text-lg text-brandDark font-poppins bg-transparent border-b border-transparent focus:border-brandPrimary outline-none w-full pb-1 transition-colors"
                        />
                      </div>
                      <div className="shrink-0">
                         <input
                          type="text"
                          value={activity.duration}
                          onChange={(e) => handleActivityChange(index, 'duration', e.target.value)}
                          className="text-sm font-medium text-brandPrimary bg-brandPrimary/10 px-3 py-1.5 rounded-[8px] w-24 text-center outline-none focus:ring-1 focus:ring-brandPrimary font-inter"
                        />
                      </div>
                    </div>
                    <textarea
                      value={activity.description}
                      onChange={(e) => handleActivityChange(index, 'description', e.target.value)}
                      rows={3}
                      className="w-full border border-transparent text-base p-4 bg-surfaceLight rounded-[12px] text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-brandPrimary focus:border-brandPrimary font-inter resize-none transition-all"
                    />
                  </div>
                ))}
              </Stack>
            </div>

            <div className="pt-8 mt-4 border-t border-gray-100 flex items-center justify-between">
              <Button variant="ghost" onClick={onBack} className="text-gray-500 font-poppins font-medium hover:bg-gray-50 rounded-[50px] px-6 h-12">
                Volver a generar
              </Button>
              <Button variant="primary" onClick={() => onApprove(editedProposal)} className="px-8 h-14 rounded-[50px] font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] shadow-sm transition-all duration-300 flex items-center gap-3">
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] text-white/80 font-inter uppercase tracking-wider leading-none mb-1">Incorporar al conocimiento</span>
                  <span className="font-semibold leading-none text-base">Aprobar planeación</span>
                </div>
                <ChevronRight className="w-5 h-5 text-white/80" />
              </Button>
            </div>
          </Stack>
        </Surface>
      </Stack>
    </div>
  );
};
