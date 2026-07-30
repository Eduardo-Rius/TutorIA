import React, { useState } from 'react';
import { AppShell, ContentArea } from '../../../components/layouts';
import { ComprendamosTuContexto } from '../../../components/planning/PM01/ComprendamosTuContexto';
import { ConstruyamosElContexto } from '../../../components/planning/PM01/ConstruyamosElContexto';
import { PermitemeAyudarte } from '../../../components/planning/PM01/PermitemeAyudarte';
import { HagamoslaTuya } from '../../../components/planning/PM01/HagamoslaTuya';
import { MomentoWow } from '../../../components/planning/PM01/MomentoWow';
import { PlanningContext, ProposedPlanning } from '../../../application/planning/MockGenerativeAdapter';

type ExperienceStep =
  | 'COMPRENDER_CONTEXTO'
  | 'CONSTRUIR_CONTEXTO'
  | 'GENERANDO_PROPUESTA'
  | 'REVISION_HUMANA'
  | 'APRENDIZAJE_INSTITUCIONAL';

export const FirstInstitutionalExperience: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ExperienceStep>('COMPRENDER_CONTEXTO');

  // State to pass between steps
  const [context, setContext] = useState<PlanningContext | null>(null);
  const [proposal, setProposal] = useState<ProposedPlanning | null>(null);

  const renderStep = () => {
    switch (currentStep) {
      case 'COMPRENDER_CONTEXTO':
        return (
          <ComprendamosTuContexto
            onNext={(ctx) => {
              setContext(ctx);
              setCurrentStep('CONSTRUIR_CONTEXTO');
            }}
          />
        );
      case 'CONSTRUIR_CONTEXTO':
        if (!context) return null;
        return (
          <ConstruyamosElContexto
            context={context}
            onNext={() => setCurrentStep('GENERANDO_PROPUESTA')}
            onBack={() => setCurrentStep('COMPRENDER_CONTEXTO')}
          />
        );
      case 'GENERANDO_PROPUESTA':
        if (!context) return null;
        return (
          <PermitemeAyudarte
            context={context}
            onProposalReady={(prop) => {
              setProposal(prop);
              setCurrentStep('REVISION_HUMANA');
            }}
          />
        );
      case 'REVISION_HUMANA':
        if (!proposal) return null;
        return (
          <HagamoslaTuya
            proposal={proposal}
            onApprove={(finalProposal) => {
              // Here we would typically save the final proposal to the backend
              console.log('Planeación final:', finalProposal);
              setCurrentStep('APRENDIZAJE_INSTITUCIONAL');
            }}
            onBack={() => setCurrentStep('GENERANDO_PROPUESTA')}
          />
        );
      case 'APRENDIZAJE_INSTITUCIONAL':
        return <MomentoWow />;
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <ContentArea>
        <div className="min-h-screen bg-gray-50/50 relative">
          {/* Subtle progress indicator */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all duration-700 ease-in-out"
              style={{
                width:
                  currentStep === 'COMPRENDER_CONTEXTO' ? '20%' :
                  currentStep === 'CONSTRUIR_CONTEXTO' ? '40%' :
                  currentStep === 'GENERANDO_PROPUESTA' ? '60%' :
                  currentStep === 'REVISION_HUMANA' ? '80%' : '100%'
              }}
            ></div>
          </div>

          <div className="px-4 py-8">
            {renderStep()}
          </div>
        </div>
      </ContentArea>
    </AppShell>
  );
};
