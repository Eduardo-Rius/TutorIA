import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import {
  PlanningDemoApp,
  KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION,
} from '../PlanningDemoApp';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_G002_SUPERVISOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_G002_DAYCARE_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_G002_TEACHER_ID,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_G002_DIRECTOR_ID,
} from '../firstLightLabHarness';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { DIRECT_PDA_CATALOG } from '../../../domain/planning/DirectCurricularCatalog';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';

const EVIDENCE_DIR = '/Users/rius/.gemini/antigravity-ide/brain/f897c3ae-8297-422c-9de3-7f96251fab3d/visual_evidence';

function ensureEvidenceDir() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; background: #f4f5f7; }
    .evidence-container { max-width: 900px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; margin-bottom: 15px; }
    .badge-g001 { background: #e6f4ea; color: #137333; border: 1px solid #ceead6; }
    .badge-g002 { background: #e8f0fe; color: #1a73e8; border: 1px solid #d2e3fc; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 6px; font-size: 11px; }
    th { background: #eee; }
    .print\\:text-\\[9px\\] { font-size: 9px; }
    .whitespace-pre-wrap { white-space: pre-wrap; }
    .border { border: 1px solid #000; }
    .p-2 { padding: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .bg-gray-200 { background-color: #e5e7eb; }
    .font-bold { font-weight: 700; }
    .uppercase { text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="evidence-container">
    <h1>${title}</h1>
    <hr style="margin-bottom: 20px; border: 0; border-top: 1px solid #ddd;" />
    ${bodyContent}
  </div>
</body>
</html>`;
}

const createMockAuth = (uid: string | null): AuthenticationProvider => ({
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  restoreSession: vi.fn().mockResolvedValue(uid),
  getCurrentUser: vi.fn().mockReturnValue(uid ? { uid, email: `${uid}@lab.tutoria.invalid` } : null),
});

describe('Generación de Evidencia Visual Real SR-MD-27', () => {
  const source = new DeterministicPedagogicalRecommendationSource();

  it('1. Renderiza y extrae evidencia visual para Guardería 001 — Lactantes B (Prestación Directa e Indirecta)', async () => {
    ensureEvidenceDir();
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    const planIdG001 = 'f763e0a8-5e74-4ee9-95a2-e9cf1e7213ad';
    const planG001 = WeeklyPlanning.create(
      planIdG001,
      FIRST_LIGHT_DAYCARE_ID,
      'room-lactantes-b',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await source.generateRecommendation(null as any, 'Obs', 'Needs', 'Sit', 'Mat');
    planG001.days = recs;
    planG001.observations = 'Observación pedagógica general de Lactantes B.';
    planG001.identifiedNeeds = 'Atención a exploración y permanencia de objetos.';
    planG001.specialSituations = 'Sin situaciones especiales.';
    planG001.availableMaterials = 'Materiales sensoriales seguros.';

    // Traceability
    const pda1 = DIRECT_PDA_CATALOG[0]!;
    planG001.setActivityCurricularTraceability('MONDAY', planG001.days[0]!.activities[0]!.activityId, [
      { pdaId: pda1.id, catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1' },
    ]);

    // Monday: Legitimate approved V2
    const mondayEvalV2 =
      'Durante las actividades se observaron distintas respuestas de los bebés según su desarrollo y disposición para participar. Durante la lectura de *¿Dónde está Spot?*, algunos dirigieron la mirada hacia las ilustraciones, sonrieron, vocalizaron e intentaron tocar las páginas. Otros necesitaron que la Asistente Educativa acercara el libro, repitiera las palabras o les ofreciera más tiempo para responder.\n\nEn la exploración de objetos parcialmente ocultos, algunos bebés buscaron el material mediante la mirada y movimientos de las manos, mientras que otros requirieron acompañamiento verbal y una presentación más cercana del objeto. Se respetaron sus diferentes ritmos de participación, sin forzar movimientos ni posturas.\n\nComo ajustes pedagógicos, se redujo la duración de algunas experiencias ante señales de cansancio, se acercaron los materiales a una distancia cómoda y se ofrecieron oportunidades de repetición. Para dar continuidad, se propondrán nuevas experiencias de búsqueda de objetos, lectura compartida e interacción mediante gestos y vocalizaciones, respetando las necesidades individuales de cada bebé.';

    planG001.days[0].evaluation = mondayEvalV2;
    planG001.days[0].evaluationStatus = 'APPROVED';
    planG001.days[0].evaluationDirectorComment =
      'La evaluación describe adecuadamente las experiencias realizadas... Te solicito precisar qué conductas observables identificaste...';
    planG001.days[0].evaluationHistory = [
      {
        evaluation: 'V1 original devuelta',
        directorComment: planG001.days[0].evaluationDirectorComment,
        status: 'CHANGES_REQUESTED',
        submittedAt: new Date(1792613055000),
        submittedBy: FIRST_LIGHT_TEACHER_ID,
        reviewedAt: new Date(1792616381000),
        reviewedBy: FIRST_LIGHT_DIRECTOR_ID,
      },
    ];

    // Tuesday to Friday: Unpatched historical Firestore LAB text (Educadora instruction pasted as evaluation)
    for (let i = 1; i < 5; i++) {
      planG001.days[i].evaluation = KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION;
      planG001.days[i].evaluationStatus = 'APPROVED';
      planG001.days[i].evaluationDirectorComment = undefined;
      planG001.days[i].evaluationHistory = undefined;
    }

    planG001.status = 'CLOSED';
    planG001.closedBy = FIRST_LIGHT_SUPERVISOR_ID;
    planG001.closedAt = new Date(1792617563000);
    await repo.save(planG001);

    // DIRECT MODALITY
    window.history.replaceState({}, '', `/?planId=${planIdG001}`);
    const { container: containerDirect, unmount: unmountDirect } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_SUPERVISOR_ID)}
      />
    );

    // Click to view official IMSS
    const viewOfficialBtn = await screen.findByText('VER VERSIÓN OFICIAL IMSS');
    viewOfficialBtn.click();

    await waitFor(() => {
      expect(document.getElementById('printable-document-root')).toBeTruthy();
    });

    const printableViewDirect = document.getElementById('printable-document-root')!;

    // VERIFICATIONS:
    // 1. Monday prints approved pedagogical text
    expect(printableViewDirect.textContent).toContain('Durante las actividades se observaron distintas respuestas');
    // 2. Tuesday to Friday NEVER print the Educadora instruction
    expect(printableViewDirect.textContent).not.toContain('Se solicita precisar qué indicadores observables');
    // 3. Official placeholder displayed for days with anomalous/non-pedagogical content
    expect(printableViewDirect.textContent).toContain('Espacio para la evaluación posterior a la implementación.');

    const htmlDirectG001 = wrapHtml(
      'Evidencia Visual — Guardería 001 | Lactantes B (Prestación Directa)',
      containerDirect.innerHTML
    );
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'G001_Lactantes_B_Directa.html'), htmlDirectG001, 'utf-8');

    unmountDirect();
    window.history.replaceState({}, '', '/');
  });

  it('2. Renderiza y extrae evidencia visual para Guardería 002 (Piloto Andrea) — Lactantes B', async () => {
    ensureEvidenceDir();
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    const planIdG002 = '3a705e9b-6f0c-424a-90eb-07ca3c451501';
    const planG002 = WeeklyPlanning.create(
      planIdG002,
      FIRST_LIGHT_G002_DAYCARE_ID,
      'room-lactantes-b',
      FIRST_LIGHT_G002_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    const recs = await source.generateRecommendation(null as any, 'Obs G002', 'Needs G002', 'Sit G002', 'Mat G002');
    planG002.days = recs;
    planG002.observations = 'Observación pedagógica soberana de Guardería 002 (Piloto Andrea).';
    planG002.identifiedNeeds = 'Coordinación visomotriz y lenguaje afectivo.';
    planG002.specialSituations = 'Sin situaciones especiales.';
    planG002.availableMaterials = 'Materiales sensoriales blandos.';

    const mondayEvalV2 =
      'Durante las actividades se observaron distintas respuestas de los bebés según su desarrollo y disposición para participar. Durante la lectura de *¿Dónde está Spot?*, algunos dirigieron la mirada hacia las ilustraciones, sonrieron, vocalizaron e intentaron tocar las páginas. Otros necesitaron que la Asistente Educativa acercara el libro, repitiera las palabras o les ofreciera más tiempo para responder.\n\nEn la exploración de objetos parcialmente ocultos, algunos bebés buscaron el material mediante la mirada y movimientos de las manos, mientras que otros requirieron acompañamiento verbal y una presentación más cercana del objeto. Se respetaron sus diferentes ritmos de participación, sin forzar movimientos ni posturas.\n\nComo ajustes pedagógicos, se redujo la duración de algunas experiencias ante señales de cansancio, se acercaron los materiales a una distancia cómoda y se ofrecieron oportunidades de repetición. Para dar continuidad, se propondrán nuevas experiencias de búsqueda de objetos, lectura compartida e interacción mediante gestos y vocalizaciones, respetando las necesidades individuales de cada bebé.';

    planG002.days[0].evaluation = mondayEvalV2;
    planG002.days[0].evaluationStatus = 'APPROVED';
    planG002.days[0].evaluationDirectorComment =
      'La evaluación describe adecuadamente las experiencias realizadas... Te solicito precisar qué conductas observables identificaste...';
    planG002.days[0].evaluationHistory = [
      {
        evaluation: 'V1 original devuelta en G002',
        directorComment: planG002.days[0].evaluationDirectorComment,
        status: 'CHANGES_REQUESTED',
        submittedAt: new Date(1792613814000),
        submittedBy: FIRST_LIGHT_G002_TEACHER_ID,
        reviewedAt: new Date(1792616492000),
        reviewedBy: FIRST_LIGHT_G002_DIRECTOR_ID,
      },
    ];

    for (let i = 1; i < 5; i++) {
      planG002.days[i].evaluation = KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION;
      planG002.days[i].evaluationStatus = 'APPROVED';
      planG002.days[i].evaluationDirectorComment = undefined;
      planG002.days[i].evaluationHistory = undefined;
    }

    planG002.status = 'CLOSED';
    planG002.closedBy = FIRST_LIGHT_G002_SUPERVISOR_ID;
    planG002.closedAt = new Date(1792617563000);
    await repo.save(planG002);

    window.history.replaceState({}, '', `/?planId=${planIdG002}`);
    const { container: containerG002, unmount: unmountG002 } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_SUPERVISOR_ID)}
      />
    );

    const viewOfficialBtn = await screen.findByText('VER VERSIÓN OFICIAL IMSS');
    viewOfficialBtn.click();

    await waitFor(() => {
      expect(document.getElementById('printable-document-root')).toBeTruthy();
    });

    const printableViewG002 = document.getElementById('printable-document-root')!;

    // 1. Guardería 002 header isolation
    expect(printableViewG002.textContent).toContain('Guardería 002');
    expect(printableViewG002.textContent).not.toContain('Guardería IMSS Demo (001)');

    // 2. Monday approved text present
    expect(printableViewG002.textContent).toContain('Durante las actividades se observaron distintas respuestas');

    // 3. Tuesday to Friday instruction NOT present
    expect(printableViewG002.textContent).not.toContain('Se solicita precisar qué indicadores observables');

    const htmlG002 = wrapHtml(
      'Evidencia Visual — Guardería 002 (Piloto Andrea) | Lactantes B',
      containerG002.innerHTML
    );
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'G002_Lactantes_B_Directa.html'), htmlG002, 'utf-8');

    unmountG002();
    window.history.replaceState({}, '', '/');
  });

  it('3. Renderiza y extrae evidencia de regresión para Lactantes A y Lactantes C (Guardería 001)', async () => {
    ensureEvidenceDir();
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    // Lactantes A
    const planIdLA = 'plan-lactantes-a-g001';
    const planLA = WeeklyPlanning.create(
      planIdLA,
      FIRST_LIGHT_DAYCARE_ID,
      'room-lactantes-a',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    planLA.days = await source.generateRecommendation(null as any, 'Obs LA', 'Needs LA', 'Sit LA', 'Mat LA');
    for (const d of planLA.days) {
      d.evaluation = `Evaluación legítima aprobada de ${d.dayOfWeek} en Lactantes A (estimulación temprana y seguimiento visual).`;
      d.evaluationStatus = 'APPROVED';
    }
    planLA.status = 'CLOSED';
    planLA.closedBy = FIRST_LIGHT_SUPERVISOR_ID;
    planLA.closedAt = new Date();
    await repo.save(planLA);

    window.history.replaceState({}, '', `/?planId=${planIdLA}`);
    const { container: containerLA, unmount: unmountLA } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_SUPERVISOR_ID)}
      />
    );

    const btnLA = await screen.findByText('VER VERSIÓN OFICIAL IMSS');
    btnLA.click();

    await waitFor(() => {
      expect(document.getElementById('printable-document-root')).toBeTruthy();
    });

    const printLA = document.getElementById('printable-document-root')!;
    expect(printLA.textContent).toContain('Lactantes A');
    expect(printLA.textContent).toContain('Evaluación legítima aprobada de MONDAY en Lactantes A');
    expect(printLA.textContent).toContain('Evaluación legítima aprobada de FRIDAY en Lactantes A');

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'G001_Lactantes_A_Directa.html'),
      wrapHtml('Evidencia Visual — Guardería 001 | Lactantes A (Regresión)', containerLA.innerHTML),
      'utf-8'
    );
    unmountLA();
    window.history.replaceState({}, '', '/');

    // Lactantes C
    const planIdLC = 'plan-lactantes-c-g001';
    const planLC = WeeklyPlanning.create(
      planIdLC,
      FIRST_LIGHT_DAYCARE_ID,
      'room-lactantes-c',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    planLC.days = await source.generateRecommendation(null as any, 'Obs LC', 'Needs LC', 'Sit LC', 'Mat LC');
    for (const d of planLC.days) {
      d.evaluation = `Evaluación legítima aprobada de ${d.dayOfWeek} en Lactantes C (desplazamiento autónomo y exploración motriz).`;
      d.evaluationStatus = 'APPROVED';
    }
    planLC.status = 'CLOSED';
    planLC.closedBy = FIRST_LIGHT_SUPERVISOR_ID;
    planLC.closedAt = new Date();
    await repo.save(planLC);

    window.history.replaceState({}, '', `/?planId=${planIdLC}`);
    const { container: containerLC, unmount: unmountLC } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_SUPERVISOR_ID)}
      />
    );

    const btnLC = await screen.findByText('VER VERSIÓN OFICIAL IMSS');
    btnLC.click();

    await waitFor(() => {
      expect(document.getElementById('printable-document-root')).toBeTruthy();
    });

    const printLC = document.getElementById('printable-document-root')!;
    expect(printLC.textContent).toContain('Lactantes C');
    expect(printLC.textContent).toContain('Evaluación legítima aprobada de MONDAY en Lactantes C');
    expect(printLC.textContent).toContain('Evaluación legítima aprobada de FRIDAY en Lactantes C');

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'G001_Lactantes_C_Directa.html'),
      wrapHtml('Evidencia Visual — Guardería 001 | Lactantes C (Regresión)', containerLC.innerHTML),
      'utf-8'
    );
    unmountLC();
    window.history.replaceState({}, '', '/');
  });

  it('4. Renderiza y extrae evidencia visual para Modalidad Indirecta (Guardería 001 — Lactantes B)', async () => {
    ensureEvidenceDir();
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);

    const planIdIndirect = 'plan-indirect-lactantes-b';
    const planIndirect = WeeklyPlanning.create(
      planIdIndirect,
      FIRST_LIGHT_DAYCARE_ID,
      'room-lactantes-b',
      FIRST_LIGHT_TEACHER_ID,
      '2026-08-24',
      '2026-08-28'
    );
    planIndirect.days = await source.generateRecommendation(null as any, 'Obs Ind', 'Needs Ind', 'Sit Ind', 'Mat Ind');

    const mondayEvalV2 =
      'Durante las actividades se observaron distintas respuestas de los bebés según su desarrollo y disposición para participar (Modalidad Indirecta).';
    planIndirect.days[0].evaluation = mondayEvalV2;
    planIndirect.days[0].evaluationStatus = 'APPROVED';

    for (let i = 1; i < 5; i++) {
      planIndirect.days[i].evaluation = KNOWN_HISTORICAL_SUPERVISORY_INSTRUCTION;
      planIndirect.days[i].evaluationStatus = 'APPROVED';
    }

    planIndirect.status = 'CLOSED';
    planIndirect.closedBy = FIRST_LIGHT_SUPERVISOR_ID;
    planIndirect.closedAt = new Date();
    await repo.save(planIndirect);

    window.history.replaceState({}, '', `/?planId=${planIdIndirect}`);
    const { container: containerInd, unmount: unmountInd } = render(
      <PlanningDemoApp
        service={service}
        source={source}
        initialRole="SUPERVISOR"
        firstLightEnv={{
          [FIRST_LIGHT_LAB_FLAG]: 'true',
          VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
        }}
        firstLightAuth={createMockAuth(FIRST_LIGHT_SUPERVISOR_ID)}
      />
    );

    // Switch modality to INDIRECT
    const modalitySelect = screen.getByTestId('modality-select');
    modalitySelect.focus();
    // Simulate changing to INDIRECT
    const changeEvent = { target: { value: 'INDIRECT' } };
    // fireEvent.change
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(modalitySelect, changeEvent);

    const btnInd = await screen.findByText('VER VERSIÓN OFICIAL IMSS');
    btnInd.click();

    await waitFor(() => {
      expect(document.getElementById('printable-document-root')).toBeTruthy();
    });

    const printInd = document.getElementById('printable-document-root')!;
    // Monday evaluation in indirect reverso section
    expect(printInd.textContent).toContain('Durante las actividades se observaron distintas respuestas');
    // Tuesday to Friday instruction NOT in indirect
    expect(printInd.textContent).not.toContain('Se solicita precisar qué indicadores observables');
    expect(printInd.textContent).toContain('Espacio para la evaluación posterior a la implementación.');

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'G001_Lactantes_B_Indirecta.html'),
      wrapHtml('Evidencia Visual — Guardería 001 | Lactantes B (Prestación Indirecta)', containerInd.innerHTML),
      'utf-8'
    );
    unmountInd();
    window.history.replaceState({}, '', '/');
  });
});
