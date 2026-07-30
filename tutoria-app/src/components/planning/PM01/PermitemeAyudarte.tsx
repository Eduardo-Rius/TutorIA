import React, { useEffect, useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { MockGenerativeAdapter, PlanningContext, ProposedPlanning } from '../../../application/planning/MockGenerativeAdapter';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  context: PlanningContext;
  onProposalReady: (proposal: ProposedPlanning) => void;
}

export const PermitemeAyudarte: React.FC<Props> = ({ context, onProposalReady }) => {
  const [message, setMessage] = useState('Iniciando...');
  const [activeCards, setActiveCards] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const adapter = new MockGenerativeAdapter();

    // Simulate cards appearing one by one
    const cardTimers = [
      setTimeout(() => mounted && setActiveCards(1), 1500),
      setTimeout(() => mounted && setActiveCards(2), 3000),
      setTimeout(() => mounted && setActiveCards(3), 4500),
      setTimeout(() => mounted && setActiveCards(4), 6000),
    ];

    adapter.generateProposal(context, (msg) => {
      if (mounted) setMessage(msg);
    }).then(proposal => {
      if (mounted) {
        setTimeout(() => {
          if (mounted) onProposalReady(proposal);
        }, 1000);
      }
    });

    return () => {
      mounted = false;
      cardTimers.forEach(clearTimeout);
    };
  }, [context, onProposalReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
      <Stack gap={10} className="items-center max-w-2xl w-full">

        <div className="text-center flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-brandPrimary/20 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-brandPrimary rounded-full h-20 w-20 flex items-center justify-center shadow-lg shadow-brandPrimary/30">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          <Heading as="h2" size="2xl" className="text-brandDark mb-3 tracking-tight font-poppins font-bold">
            Estoy integrando el contexto...
          </Heading>
          <Text size="lg" className="text-brandPrimary font-medium h-8 transition-all duration-300 font-inter">
            {message}
          </Text>
        </div>

        {/* Magic Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className={`flex items-center gap-4 p-5 rounded-[16px] bg-white border border-gray-100 shadow-soft transition-all duration-500 transform ${activeCards >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-brandPrimary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <Text size="base" className="font-semibold text-gray-800 font-inter">4 lineamientos encontrados</Text>
          </div>

          <div className={`flex items-center gap-4 p-5 rounded-[16px] bg-white border border-gray-100 shadow-soft transition-all duration-500 transform ${activeCards >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-brandPrimary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <Text size="base" className="font-semibold text-gray-800 font-inter">2 experiencias similares</Text>
          </div>

          <div className={`flex items-center gap-4 p-5 rounded-[16px] bg-white border border-gray-100 shadow-soft transition-all duration-500 transform ${activeCards >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-brandPrimary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <Text size="base" className="font-semibold text-gray-800 font-inter">Conocimiento integrado</Text>
          </div>

          <div className={`flex items-center gap-4 p-5 rounded-[16px] bg-white border border-gray-100 shadow-soft transition-all duration-500 transform ${activeCards >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-brandPrimary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <Text size="base" className="font-semibold text-gray-800 font-inter">Contexto construido</Text>
          </div>
        </div>

      </Stack>
    </div>
  );
};
