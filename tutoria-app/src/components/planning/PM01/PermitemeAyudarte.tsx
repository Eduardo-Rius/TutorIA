import React, { useEffect, useState } from 'react';
import { Stack } from '../../foundations/Stack';
import { Heading } from '../../primitives/Heading';
import { Text } from '../../primitives/Text';
import { MockGenerativeAdapter, PlanningContext, ProposedPlanning } from '../../../application/planning/MockGenerativeAdapter';

interface Props {
  context: PlanningContext;
  onProposalReady: (proposal: ProposedPlanning) => void;
}

export const PermitemeAyudarte: React.FC<Props> = ({ context, onProposalReady }) => {
  const [message, setMessage] = useState('Iniciando...');
  
  useEffect(() => {
    let mounted = true;
    const adapter = new MockGenerativeAdapter();
    
    adapter.generateProposal(context, (msg) => {
      if (mounted) setMessage(msg);
    }).then(proposal => {
      if (mounted) {
        // Small delay at the end before transitioning
        setTimeout(() => {
          if (mounted) onProposalReady(proposal);
        }, 1000);
      }
    });

    return () => { mounted = false; };
  }, [context, onProposalReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-12 px-4">
      <Stack gap={8} className="items-center text-center max-w-md">
        
        {/* Animated pulse ring */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-blue-500 rounded-full h-16 w-16 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <div>
          <Heading as="h2" size="xl" className="text-gray-900 mb-3 tracking-tight">
            Permíteme ayudarte
          </Heading>
          <Text size="lg" className="text-blue-600 font-medium h-8 transition-all duration-300">
            {message}
          </Text>
        </div>
        
      </Stack>
    </div>
  );
};
