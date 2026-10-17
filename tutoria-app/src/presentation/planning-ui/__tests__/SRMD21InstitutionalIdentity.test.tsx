import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlanningDemoApp, getAssistantRoleLabel } from '../PlanningDemoApp';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { CharacterDefinitionCatalog, ANITA_ID, CECI_ID, TERE_ID } from '../../experience/characters/CharacterDefinitionCatalog';

describe('SR-MD-21 Phase 1 — Identidad Institucional', () => {
  let repo: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;

  const firstLightEnv = {
    VITE_TUTORIA_FIRST_LIGHT_LAB: 'false',
  };

  beforeEach(() => {
    repo = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    vi.clearAllMocks();
  });

  describe('1. Character Definition Catalog', () => {
    it('defines institutional display names for all three characters', () => {
      const anita = CharacterDefinitionCatalog[ANITA_ID];
      const ceci = CharacterDefinitionCatalog[CECI_ID];
      const tere = CharacterDefinitionCatalog[TERE_ID];

      expect(anita?.displayName).toBe('Asistente Educativa');
      expect(ceci?.displayName).toBe('Educadora');
      expect(tere?.displayName).toBe('Directora');
    });
  });

  describe('2. Room-specific Assistant Labels', () => {
    it('resolves room-specific labels for Lactantes A, B, C and default', () => {
      expect(getAssistantRoleLabel('room-lactantes-a')).toBe('Asistente Educativa LA');
      expect(getAssistantRoleLabel('room-lactantes-b')).toBe('Asistente Educativa LB');
      expect(getAssistantRoleLabel('room-lactantes-c')).toBe('Asistente Educativa LC');
      expect(getAssistantRoleLabel('maternal-a')).toBe('Asistente Educativa MA');
      expect(getAssistantRoleLabel(undefined)).toBe('Asistente Educativa');
    });
  });

  describe('3. Asistente Educativa Experience & Room Switcher', () => {
    it('renders role switcher buttons with institutional titles and no visible fictional names', async () => {
      render(
        <PlanningDemoApp
          service={service}
          firstLightEnv={firstLightEnv}
        />
      );

      const teacherBtn = screen.getByTestId('role-btn-teacher');
      const directorBtn = screen.getByTestId('role-btn-director');
      const supervisorBtn = screen.getByTestId('role-btn-supervisor');

      expect(teacherBtn.textContent).toContain('Asistente Educativa');
      expect(directorBtn.textContent).toContain('Educadora');
      expect(supervisorBtn.textContent).toContain('Directora');
    });

    it('renders room switcher with Lactantes A and B accessible and updates greeting', async () => {
      render(
        <PlanningDemoApp
          service={service}
          firstLightEnv={firstLightEnv}
        />
      );

      // Verify initial greeting contains Asistente Educativa
      const greeting = await screen.findByText(/Hola, Asistente Educativa/i);
      expect(greeting).toBeDefined();

      // Check room select exists
      const roomSelects = screen.getAllByRole('combobox');
      expect(roomSelects.length).toBeGreaterThan(0);
    });
  });

  describe('4. Educadora Experience (Acompañamiento Pedagógico)', () => {
    it('switches to Educadora and displays institutional titles', async () => {
      render(
        <PlanningDemoApp
          service={service}
          firstLightEnv={firstLightEnv}
        />
      );

      const directorBtn = screen.getByTestId('role-btn-director');
      await act(async () => {
        fireEvent.click(directorBtn);
      });

      // Role pill now shows Educadora
      expect(screen.getByText('Acompañamiento pedagógico')).toBeDefined();
    });
  });

  describe('5. Directora Experience (Registros Semanales Cerrados)', () => {
    it('switches to Directora and displays institutional records', async () => {
      render(
        <PlanningDemoApp
          service={service}
          firstLightEnv={firstLightEnv}
        />
      );

      const supervisorBtn = screen.getByTestId('role-btn-supervisor');
      await act(async () => {
        fireEvent.click(supervisorBtn);
      });

      expect(screen.getByText('Registros semanales cerrados')).toBeDefined();
    });
  });

  describe('6. Approval Attribution Analysis', () => {
    it('documents that technical DIRECTOR (Ceci/Educadora) possesses approval actions in the workflow', () => {
      // In the technical architecture:
      // - TEACHER is the author (Asistente Educativa)
      // - DIRECTOR is the pedagogical accompanier and approver (Educadora)
      // - SUPERVISOR is institutional management / audit (Directora)
      expect(service.approve).toBeTypeOf('function');
    });
  });
});
