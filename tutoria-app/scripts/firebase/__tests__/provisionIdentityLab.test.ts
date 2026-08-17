import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as script from '../provisionIdentityLab.mjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Provisioning Script Dry-Run Tests', () => {
  it('has deterministic fixture IDs', () => {
    expect(script.DAYCARES[0].id).toBe('00000000-0000-4000-8000-000000000001');
    expect(script.DAYCARES[1].id).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('has exactly 2 daycares', () => {
    expect(script.DAYCARES.length).toBe(2);
  });

  it('has exactly 4 Persons', () => {
    expect(script.PERSONS.length).toBe(4);
  });

  it('has exactly 4 Assignments', () => {
    expect(script.ASSIGNMENTS.length).toBe(4);
  });

  it('has exactly 4 AuthorizationContexts', () => {
    expect(script.AUTHORIZATION_CONTEXTS.length).toBe(4);
  });

  it('has exactly 4 Auth identities', () => {
    expect(script.AUTH_USERS.length).toBe(4);
  });

  it('Anita scope = North only', () => {
    const anitaContext = script.AUTHORIZATION_CONTEXTS.find(c => c.id === 'lab-teacher-anita');
    expect(anitaContext).toBeDefined();
    expect(anitaContext.data.institutionalRole).toBe('TEACHER');
    expect(anitaContext.data.authorizedDaycareIds).toEqual(['00000000-0000-4000-8000-000000000001']);
  });

  it('Laura scope = South only', () => {
    const lauraContext = script.AUTHORIZATION_CONTEXTS.find(c => c.id === 'lab-teacher-laura');
    expect(lauraContext).toBeDefined();
    expect(lauraContext.data.institutionalRole).toBe('TEACHER');
    expect(lauraContext.data.authorizedDaycareIds).toEqual(['00000000-0000-4000-8000-000000000002']);
  });

  it('Ceci scope = North only', () => {
    const ceciContext = script.AUTHORIZATION_CONTEXTS.find(c => c.id === 'lab-director-ceci');
    expect(ceciContext).toBeDefined();
    expect(ceciContext.data.institutionalRole).toBe('DIRECTOR');
    expect(ceciContext.data.authorizedDaycareIds).toEqual(['00000000-0000-4000-8000-000000000001']);
  });

  it('Tere scope = North + South', () => {
    const tereContext = script.AUTHORIZATION_CONTEXTS.find(c => c.id === 'lab-supervisor-tere');
    expect(tereContext).toBeDefined();
    expect(tereContext.data.institutionalRole).toBe('SUPERVISOR');
    expect(tereContext.data.authorizedDaycareIds).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002'
    ]);
  });

  it('canonical daycare UUID != daycareNumber', () => {
    expect(script.DAYCARES[0].id).not.toBe(script.DAYCARES[0].data.daycareNumber);
  });

  it('no weeklyPlanning fixture exists', () => {
    const contents = readFileSync(resolve(__dirname, '../provisionIdentityLab.mjs'), 'utf8');
    expect(contents).not.toContain('weeklyPlannings');
  });

  it('no legacy users authorization fixture exists', () => {
    const contents = readFileSync(resolve(__dirname, '../provisionIdentityLab.mjs'), 'utf8');
    // Ensure we are not populating the legacy collection
    expect(contents).not.toMatch(/db\.collection\('users'\)/);
  });

  it('no destructive wildcard/delete behavior exists', () => {
    const contents = readFileSync(resolve(__dirname, '../provisionIdentityLab.mjs'), 'utf8');
    expect(contents).not.toContain('.delete(');
  });

  it('fixture passwords are not embedded in tracked fixture source', () => {
    const contents = readFileSync(resolve(__dirname, '../provisionIdentityLab.mjs'), 'utf8');
    expect(contents).not.toContain('local-dry-run-password');
    // Basic test that we aren't embedding clear passwords in production array directly
    expect(script.AUTH_USERS.some(u => 'password' in u)).toBe(false);
  });
});

describe('Execution Guards', () => {
  let exitSpy;
  let consoleErrorSpy;
  let consoleLogSpy;
  let originalArgv;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('GCLOUD_PROJECT', 'tutoria-identity-lab');
    vi.stubEnv('FIREBASE_CONFIG', '');
    vi.stubEnv('FIXTURE_PASSWORD', '');
    originalArgv = process.argv;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.argv = originalArgv;
  });

  it('prod project explicitly rejected before Admin initialization', async () => {
    vi.stubEnv('GCLOUD_PROJECT', 'guarderiasimss-5cb09');
    await expect(script.provision()).rejects.toThrow('process.exit called');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('HIGH SEVERITY'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting'));
  });

  it('unknown project rejected before Admin initialization', async () => {
    vi.stubEnv('GCLOUD_PROJECT', 'some-random-project');
    await expect(script.provision()).rejects.toThrow('process.exit called');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Project ID must be exactly'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting'));
  });

  it('missing project rejected before Admin initialization', async () => {
    vi.stubEnv('GCLOUD_PROJECT', '');
    await expect(script.provision()).rejects.toThrow('process.exit called');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Project ID must be exactly'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting'));
  });

  it('lab project accepted in dry run and does not require FIXTURE_PASSWORD', async () => {
    vi.stubEnv('GCLOUD_PROJECT', 'tutoria-identity-lab');
    process.argv = [...originalArgv.filter(a => a !== '--execute')];
    vi.stubEnv('FIXTURE_PASSWORD', ''); // missing password
    await script.provision();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN — NO CLOUD MUTATIONS WILL OCCUR'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting'));
  });

  it('dry-run remains zero-mutation (does not initialize Firebase Admin)', async () => {
    vi.stubEnv('GCLOUD_PROJECT', 'tutoria-identity-lab');
    process.argv = [...originalArgv.filter(a => a !== '--execute')];
    await script.provision();
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting Auth Users'));
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Committing Firestore'));
  });

  it('--execute without FIXTURE_PASSWORD aborts before Admin initialization', async () => {
    vi.stubEnv('GCLOUD_PROJECT', 'tutoria-identity-lab');
    vi.stubEnv('FIXTURE_PASSWORD', '');
    process.argv = [...originalArgv, '--execute'];
    await expect(script.provision()).rejects.toThrow('process.exit called');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('--execute requires FIXTURE_PASSWORD'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    // Should abort before upserting
    expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Upserting'));
  });
});
