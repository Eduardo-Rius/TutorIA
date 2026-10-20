import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  TUTORIA_LOGIN_SCOPE_FLAG,
} from '../presentation/planning-ui/firstLightLabHarness';

vi.mock('../infrastructure/firebase/firebaseConfig', () => ({
  app: {},
  auth: { currentUser: null, onAuthStateChanged: vi.fn(() => () => {}) },
  db: {},
}));

describe('SR-MD-26I — Andrea G002 Pilot Routing & Netlify Access', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  describe('When configured for Andrea G002 Pilot', () => {
    const andreaEnv = {
      [FIRST_LIGHT_LAB_FLAG]: 'true',
      [TUTORIA_LOGIN_SCOPE_FLAG]: 'G002',
      VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
      VITE_DEV_ROLE_SWITCH: 'false',
    };

    it('1. Accessing root / mounts PlanningDashboard and FirstLightLabBanner directly without /login redirect', async () => {
      window.history.pushState({}, '', '/');
      render(<App env={andreaEnv} />);

      // FirstLightLabBanner is immediately visible
      expect(screen.getByTestId('first-light-banner')).toBeTruthy();

      // Selector shows only Guarderia 002
      const select = screen.getByTestId('first-light-identity-select') as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.textContent);
      expect(options).toEqual(['Asistente Educativa', 'Educadora', 'Directora']);

      // Never shows standard institutional login card
      expect(screen.queryByText('Bienvenida de nuevo')).toBeNull();
      expect(screen.queryByPlaceholderText('Correo institucional')).toBeNull();

      // SR-MD-26K: Modo Demo bar is visible with modality selector (Directa / Indirecta)
      expect(screen.getByText('Modo Demo')).toBeTruthy();
      expect(screen.getByTestId('modality-select')).toBeTruthy();
    });

    it('2. Accessing /login does not show institutional login form and routes safely to First Light Planning', async () => {
      window.history.pushState({}, '', '/login');
      render(<App env={andreaEnv} />);

      // Banner is visible, login page is not
      expect(screen.getByTestId('first-light-banner')).toBeTruthy();
      expect(screen.queryByText('Bienvenida de nuevo')).toBeNull();
    });

    it('3. Accessing /workspace does not show authorization error or institutional login', async () => {
      window.history.pushState({}, '', '/workspace');
      render(<App env={andreaEnv} />);

      expect(screen.getByTestId('first-light-banner')).toBeTruthy();
      expect(screen.queryByText('Bienvenida de nuevo')).toBeNull();
    });

    it('4. Accessing /workspace/planning renders PlanningDashboard directly', async () => {
      window.history.pushState({}, '', '/workspace/planning');
      render(<App env={andreaEnv} />);

      expect(screen.getByTestId('first-light-banner')).toBeTruthy();
      expect(screen.queryByText('Bienvenida de nuevo')).toBeNull();
    });
  });

  describe('When configured for Standard / Legacy Environment (PO or Production)', () => {
    it('1. Unauthenticated root / redirects to /login and shows institutional form', async () => {
      window.history.pushState({}, '', '/');
      render(<App env={{}} />);

      // Standard institutional form is rendered
      await waitFor(() => {
        expect(screen.getByText('Bienvenida de nuevo')).toBeTruthy();
        expect(screen.getByPlaceholderText('Correo institucional')).toBeTruthy();
      });

      // FirstLight banner is absent
      expect(screen.queryByTestId('first-light-banner')).toBeNull();
    });
  });
});
