# PER-5 PROVIDER ORCHESTRATION LAYER

## 1. Baseline and Upstream Dependency
PER-5 consumes strictly the sealed upstream input boundary defined in PER-4 Prompt Compilation Engine. No PER-5 component may regenerate prompts, import PER-1.1/PER-2/PER-3 domain structures, or alter the pedagogical integrity of the PromptCompilationResolution.

## 2. Exact Responsibility and Invariants
- **Invariant 1:** The adapter observes facts and translates mechanically; the orchestrator retains all authority.
- **Invariant 2:** No implicit failover or fallback provider/model/profile is permitted.
- **Invariant 3:** Raw SDK exceptions never escape the infrastructure adapter.
- **Invariant 4:** Terminal resolution is strictly atomic and run-once via the TerminalStateLatch.
- **Invariant 5:** Every acquired permit/lease is deterministically released or finalized.
- **Invariant 6:** Late callbacks on expired AttemptTokens are rejected and discarded.

## 3. Authority Ownership Table
| Responsibility | Owner | Component Boundary |
| --- | --- | --- |
| Provider Selection Validation | Orchestrator | ProviderRegistry |
| Execution Lifecycle | Orchestrator | ExecutionPipeline |
| Caller cancellation fact | Caller | caller provides fact |
| Orchestrator timeout fact | Orchestrator | orchestrator owns timeout |
| Abort synthesis / precedence | Orchestrator | ExecutionAbortCoordinator |
| Retry Classification | Orchestrator | RetryManager |
| Single terminal winner | Orchestrator | TerminalStateLatch |
| Idempotency ownership | Orchestrator | IdempotencyStore + orchestrator-held lease token |
| Circuit health state | Orchestrator | CircuitBreaker |
| Circuit permit validity | Orchestrator | CircuitBreaker / orchestrator admission gate |
| AttemptToken lifecycle | Orchestrator | AttemptExecutionAuthority |
| Normalization | Orchestrator | Pipeline normalizers |
| Telemetry | Orchestrator | TelemetrySink receives only normalized event |
| Provider adapter | Adapter | no authority to renew, extend, replace or reinterpret permits |
| Secure Diagnostics | Infrastructure | SecureProviderDiagnosticSink |

## 4. Contract Availability Matrix
| Required orchestration fact | Source contract | Validation owner | Consumer | Failure code if absent |
| --- | --- | --- | --- | --- |
| providerId | ProviderSelection | Orchestrator | Registry/Circuit | MISSING_EXECUTION_PROFILE |
| modelId | ProviderSelection | Orchestrator | Registry/Adapter | MISSING_EXECUTION_PROFILE |
| timeoutPolicy | ProviderExecutionInput | Orchestrator | AbortCoordinator | INVALID_PROVIDER_CONFIGURATION |
| retryPolicy | ProviderExecutionInput | Orchestrator | RetryManager | INVALID_PROVIDER_CONFIGURATION |
| callerAbortSignal | ProviderExecutionInput | Orchestrator | AbortCoordinator | INVALID_PROVIDER_CONFIGURATION |
| sampling configuration | ProviderExecutionProfile | Orchestrator | Adapter | PROFILE_PROVIDER_INCOMPATIBLE |

## 5. Core Contracts

```typescript
export interface ProviderExecutionInput {
  readonly compilationResolution: PromptCompilationResolution;
  readonly executionId: ExecutionId;
  readonly correlationId: CorrelationId;
  readonly providerSelection: ProviderSelection;
  readonly executionProfile: ProviderExecutionProfile;
  readonly timeoutPolicy: ProviderTimeoutPolicy;
  readonly retryPolicy: ProviderRetryPolicy;
  readonly responseValidationPolicy: ProviderResponseValidationPolicy;
  readonly requestFingerprint: RequestFingerprint;
  readonly requestedAt: string;
  readonly callerAbortSignal: AbortSignal;
}

export interface ProviderSelection {
  readonly providerId: ProviderId;
  readonly modelId: ProviderModelId;
  readonly executionProfileId: ExecutionProfileId;
  readonly tenantScopeId: TenantScopeId;
  readonly environmentScope: EnvironmentScope;
}

export type ProviderSamplingConfiguration =
  | {
      readonly mode: 'fixed_parameters';
      readonly temperature: number;
      readonly topP: number;
      readonly seedPolicy: ProviderSeedPolicy;
    }
  | {
      readonly mode: 'sampling_prohibited';
      readonly temperature: 0;
      readonly topP: 1;
      readonly seedPolicy: 'fixed_seed_required';
      readonly seed: number;
    };

export interface ProviderExecutionProfile {
  readonly samplingConfiguration: ProviderSamplingConfiguration;
  readonly maximumOutputUnits: number;
  readonly responseModality: 'json_object' | 'text';
  readonly streamingMode: 'disabled';
  readonly toolUsePolicy: 'disabled';
  readonly stopSequencePolicy: 'disabled';
  readonly reasoningEffortPolicy: 'disabled';
}

export interface ProviderAdapterRequest {
  readonly executionId: ExecutionId;
  readonly correlationId: CorrelationId;
  readonly attemptToken: AttemptToken;
  readonly providerId: ProviderId;
  readonly modelId: ProviderModelId;
  readonly compilationResolution: PromptCompilationResolution;
  readonly executionProfile: ProviderExecutionProfile;
  readonly effectiveAbortSignal: AbortSignal;
}

export interface ProviderAdapterResult {
  readonly generatedText: string;
  readonly usage: ProviderUsage;
  readonly safetyOutcome: ProviderSafetyOutcome;
}

export type ProviderExecutionResolution = ProviderExecutionSuccess | ProviderExecutionDeferred | ProviderExecutionFailure;

export interface ProviderExecutionDeferred {
  readonly status: 'deferred';
  readonly executionId: ExecutionId;
  readonly correlationId: CorrelationId;
  readonly reasonCode: 'IDENTICAL_EXECUTION_IN_PROGRESS';
  readonly retryableAfterLeaseExpiry: true;
  readonly requestedAt: string;
  readonly observedLeaseExpiry: string;
}

export interface ProviderExecutionSuccess {
  readonly success: true;
  readonly result: ProviderAdapterResult;
  readonly telemetry: ProviderExecutionTelemetry;
}

export interface ProviderExecutionFailure {
  readonly success: false;
  readonly errorCode: ProviderExecutionErrorCode;
  readonly telemetry: ProviderExecutionTelemetry;
}

export type ProviderExecutionErrorCode =
  | 'PROMPT_COMPILATION_NOT_READY'
  | 'INVALID_EXECUTION_INPUT'
  | 'INTERNAL_ORCHESTRATION_FAILURE'
  | 'MISSING_EXECUTION_PROFILE'
  | 'INVALID_PROVIDER_CONFIGURATION'
  | 'PROFILE_PROVIDER_INCOMPATIBLE'
  | 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
  | 'IDEMPOTENCY_LEASE_LOST'
  | 'FINGERPRINT_VERSION_MISMATCH'
  | 'PROVIDER_EXECUTED_IDEMPOTENCY_UNCONFIRMED'
  | 'IDEMPOTENCY_COMPLETION_FAILED'
  | 'CIRCUIT_OPEN'
  | 'CIRCUIT_PERMIT_EXPIRED'
  | 'EXECUTION_CANCELLED'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_UNSUPPORTED'
  | 'PROVIDER_TIMEOUT'
  | 'INTERNAL_ADAPTER_FAILURE'
  | 'RETRY_BUDGET_EXHAUSTED'
  | 'IDEMPOTENCY_STORAGE_UNAVAILABLE';
```

## 6. Terminal State Latch Contract
The Latch determines exclusively which terminal event wins the execution atomicity race. It does not construct the telemetry or resolution.

```typescript
export type ExecutionTerminalCause =
  | 'provider_success'
  | 'provider_failure'
  | 'caller_cancelled'
  | 'attempt_timeout'
  | 'overall_timeout'
  | 'idempotency_lease_lost'
  | 'circuit_rejected'
  | 'internal_orchestration_failure';

export interface TerminalCandidate {
  readonly cause: ExecutionTerminalCause;
  readonly occurredAt: string;
  readonly attemptNumber?: number;
  readonly normalizedErrorCode?: ProviderExecutionErrorCode;
}

export type TerminalAcquisitionResult =
  | { readonly status: 'acquired'; readonly winningCandidate: TerminalCandidate; }
  | { readonly status: 'already_terminal'; readonly winningCandidate: TerminalCandidate; };

export interface TerminalStateLatch {
  tryAcquire(executionId: ExecutionId, candidate: TerminalCandidate): TerminalAcquisitionResult;
  getWinner(executionId: ExecutionId): TerminalCandidate | undefined;
}
```
**Race Matrix:**
- **provider_success vs caller_cancelled:** First to call `tryAcquire` wins. Loser receives `already_terminal` and drops context.
- **provider_success vs attempt_timeout:** First to call `tryAcquire` wins.
- **provider_success vs overall_timeout:** First to call `tryAcquire` wins.
- **provider_failure vs caller_cancelled:** First to call wins. Cancellation ignores the failure.
- **provider_failure vs overall_timeout:** Timeout ignores the failure if timeout wins.
- **idempotency_lease_lost vs provider_success:** Lease renewal failure acquires latch with `idempotency_lease_lost`. Success is discarded.
- **duplicate success:** Second adapter success receives `already_terminal` and drops.
- **duplicate timeout:** Second timeout receives `already_terminal` and drops.
- **late response:** After terminal state, adapter callback receives `already_terminal` and safely discards payload.

**Mandatory Invariant (Winner Immutability):**
If `TerminalStateLatch` has already acquired `overall_timeout` or `attempt_timeout`, a later `caller_cancelled` loses and final resolution remains the timeout resolution.
If `TerminalStateLatch` has already acquired `caller_cancelled`, a later `overall_timeout` or `attempt_timeout` loses and final resolution remains EXECUTION_CANCELLED.
If `provider_success` or another valid terminal candidate already owns the latch, later cancellation or timeout cannot replace it. The winning terminal state is immutable.

## 7. Idempotency State Machine and TTL
Prevents duplicate execution and deadlocks using a branded lease.

```typescript
export type IdempotencyLeaseToken = string & { readonly __brand: 'IdempotencyLeaseToken' };
export type IdempotencyLeaseVersion = string & { readonly __brand: 'IdempotencyLeaseVersion' };

export interface AcquiredIdempotencyReservation {
  readonly status: 'acquired';
  readonly executionId: ExecutionId;
  readonly requestFingerprint: RequestFingerprint;
  readonly leaseToken: IdempotencyLeaseToken;
  readonly leaseVersion: IdempotencyLeaseVersion;
  readonly leasedAt: string;
  readonly leasedUntil: string;
}

export type IdempotencyReservation =
  | AcquiredIdempotencyReservation
  | { readonly status: 'already_completed'; readonly result: ProviderExecutionResolution; }
  | { readonly status: 'idempotency_conflict'; }
  | { readonly status: 'fingerprint_version_mismatch'; }
  | { readonly status: 'already_in_progress'; };

export type IdempotencyLeaseRenewalResult =
  | { readonly status: 'renewed'; readonly newLeasedUntil: string; }
  | { readonly status: 'lease_lost'; };

export type IdempotencyCompletionResult =
  | { readonly status: 'completed'; }
  | { readonly status: 'lease_lost_unconfirmed'; };

export type IdempotencyReleaseReason = 'execution_cancelled' | 'circuit_rejected' | 'timeout';

export type IdempotencyReleaseResult =
  | { readonly status: 'released'; }
  | { readonly status: 'lease_lost'; };

export interface IdempotencyStore {
  reserve(executionId: ExecutionId, fingerprint: RequestFingerprint, ttlMs: number): Promise<IdempotencyReservation>;
  renew(executionId: ExecutionId, leaseToken: IdempotencyLeaseToken, leaseVersion: IdempotencyLeaseVersion, renewedAt: string, newLeasedUntil: string): Promise<IdempotencyLeaseRenewalResult>;
  complete(executionId: ExecutionId, requestFingerprint: RequestFingerprint, leaseToken: IdempotencyLeaseToken, leaseVersion: IdempotencyLeaseVersion, resolution: ProviderExecutionResolution): Promise<IdempotencyCompletionResult>;
  release(executionId: ExecutionId, leaseToken: IdempotencyLeaseToken, leaseVersion: IdempotencyLeaseVersion, reasonCode: IdempotencyReleaseReason): Promise<IdempotencyReleaseResult>;
}
```
**Exact Policies:**
1. Reservation TTL is explicit and supplied by configuration.
2. Heartbeat interval explicitly attempts `renew`.
3. Worker renews only while it owns the lease.
4. Stale owner cannot renew, complete, or release.
5. Expired leases are atomically reclaimed (version incremented).
6. If provider executed but lease was lost (e.g. timeout), `complete` returns `lease_lost_unconfirmed`, and domain yields `PROVIDER_EXECUTED_IDEMPOTENCY_UNCONFIRMED`.
7. No automatic reinvocation if unconfirmed.

## 8. Circuit Breaker Probe TTL and Recovery
Isolates failures precisely and safely recovers without deadlocks.

```typescript
export interface CircuitKey {
  readonly providerId: ProviderId;
  readonly modelId: ProviderModelId;
  readonly executionProfileId?: ExecutionProfileId;
}

export type CircuitPermitId = string & { readonly __brand: 'CircuitPermitId' };
export type CircuitPermitLeaseToken = string & { readonly __brand: 'CircuitPermitLeaseToken' };

export interface CircuitExecutionPermit {
  readonly permitId: CircuitPermitId;
  readonly leaseToken: CircuitPermitLeaseToken;
  readonly circuitKey: CircuitKey;
  readonly admissionType: 'normal' | 'probe';
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export type CircuitAcquisitionResult =
  | { readonly status: 'acquired'; readonly permit: CircuitExecutionPermit; }
  | { readonly status: 'rejected_circuit_open'; }
  | { readonly status: 'rejected_probe_in_progress'; };

export interface CircuitBreaker {
  acquirePermit(key: CircuitKey): Promise<CircuitAcquisitionResult>;
  recordSuccess(key: CircuitKey, permit: CircuitExecutionPermit): Promise<void>;
  recordFailure(key: CircuitKey, permit: CircuitExecutionPermit, errorCode: ProviderExecutionErrorCode): Promise<void>;
  releasePermit(key: CircuitKey, permit: CircuitExecutionPermit): Promise<void>;
}
```
**Exact Policies:**
1. Key granularity is strict: `providerId` + `modelId`.
2. A half-open probe has a finite permit TTL.
3. Only one active probe is admitted per `CircuitKey`.
4. Crashed, cancelled, or timed-out valid probes return circuit to open.
5. Successful probe closes circuit.
6. Every transition is persisted deterministically.

**CIRCUIT_PERMIT_EXPIRED Contract:**
- **Semantic meaning:** A `CircuitExecutionPermit` that was legitimately issued to an execution has exceeded its validity window and can no longer authorize provider dispatch or circuit mutation.
- **Mandatory Invariants:**
  1. Expired `CircuitExecutionPermit` never authorizes dispatch.
  2. Permit expiration does not mutate CircuitState. (It DOES NOT imply `closed -> open`, `half_open -> open`, or `open -> open`). Circuit health and permit validity are separate authorities.
  3. Permit expiration is not a provider-health failure.
  4. Adapter cannot renew or replace a permit.
- **Authority Constraints:** An expired permit authorizes zero future dispatches, cannot call `recordSuccess()`, cannot call `recordFailure()`, cannot release/finalize a newer permit, cannot renew itself, cannot extend itself, cannot transfer ownership, cannot be replaced silently, cannot be interpreted as a provider failure, and cannot itself open the circuit.
- **Resolution:** Yields `ProviderExecutionFailure` with errorCode `CIRCUIT_PERMIT_EXPIRED`. TerminalStateLatch is not invoked merely to validate the expired permit unless existing contracts assign ownership. Provider invocation is 0. Circuit mutation is 0. Idempotency cleanup follows existing pre-dispatch failure semantics. AttemptToken creation is 0 if validation occurs before creation.

## 9. Cancellation and Timeout Synthesis
The orchestrator owns all abort logic and merges it into a single signal.

```typescript
export type ExecutionAbortCause = 'caller_cancelled' | 'orchestrator_timeout';

export interface ExecutionAbortCoordinator {
  createExecutionAbortContext(callerAbortSignal: AbortSignal, attemptDeadline: string, overallDeadline: string): ExecutionAbortContext;
}

export interface ExecutionAbortContext {
  readonly effectiveAbortSignal: AbortSignal;
  readonly dispose: () => void;
  readonly getAbortCause: () => ExecutionAbortCause | 'not_aborted';
}
```
**Policies & Arbitration:**
1. Caller signal is NEVER passed directly to the adapter.
2. The composed `effectiveAbortSignal` drops the network socket locally.
3. Timers and listeners are disposed deterministically via `dispose()`.
4. Late responses after abort are neutralized by the `AttemptToken`. AttemptToken must lose authority before late provider callbacks can mutate terminal state.
5. **Deterministic Truth Table (Before Latch Acquisition):**
   - `callerCancelled=false`, `orchestratorTimedOut=false` → no abort candidate
   - `callerCancelled=true`, `orchestratorTimedOut=false` → `caller_cancelled`
   - `callerCancelled=false`, `orchestratorTimedOut=true` → `orchestrator_timeout`
   - `callerCancelled=true`, `orchestratorTimedOut=true` AND `TerminalStateLatch` has no winner → `caller_cancelled` (Caller cancellation is explicit revocation and takes precedence over operational timeouts when both are active before terminal ownership exists).
6. **Terminal Cause Mapping:** `caller_cancelled` abort cause maps exactly to `caller_cancelled` ExecutionTerminalCause. `orchestrator_timeout` abort cause maps exactly to `attempt_timeout` or `overall_timeout` ExecutionTerminalCause.
7. **No Scheduler-Timing Authority:** Abort precedence is semantic, not timing-based. The tie-break policy must NOT depend on `Date.now()`, event-loop order, promise resolution, or network timing.
## 10. Execution Pipeline and Fail-Fast Order
1. Validate complete `ProviderExecutionInput` properties.
2. Evaluate `ProviderRegistry` compatibility (checks models, profiles, safety).
3. Compute `RequestFingerprint`.
4. Acquire Idempotency Reservation via `reserve()` with explicit TTL.
5. Enter Retry Loop, checking remaining budget.
6. Acquire CircuitBreaker Permit using `CircuitKey`.
7. Generate active `AttemptToken`.
8. Create `ExecutionAbortContext` (merging caller, attempt, overall deadlines).
9. Dispatch `ProviderAdapterRequest` to Adapter.
10. `TerminalStateLatch.tryAcquire` receives first terminal callback.
11. Perform Outcome-Specific Token-Protected Cleanup.

**Outcome-Specific Cleanup Semantics:**
Cleanup varies by outcome; no universal cleanup sequence exists.
- **A. SUCCESS:** Terminal winner acquired; `AttemptToken` invalidated; `ExecutionAbortContext` disposed; circuit success recorded/finalized using the owned permit; `IdempotencyStore.complete()` using the valid lease token; success telemetry emitted. Success uses `complete()`, not generic release.
- **B. FAILURE AFTER OWNED PROVIDER ATTEMPT:** `AttemptToken` invalidated; `ExecutionAbortContext` disposed; circuit failure recorded only if this provider failure is circuit-recordable; idempotency release/finalization follows existing failure semantics; failure telemetry emitted; secure diagnostic only if contractually owned.
- **C. CALLER CANCELLATION / ORCHESTRATOR TIMEOUT:** Terminal winner acquired exactly once; `AttemptToken` invalidated if it exists; `ExecutionAbortContext` disposed; circuit permit cleanup must NOT fabricate provider success/failure; IdempotencyStore release/finalization follows existing cancellation/timeout ownership semantics; exact terminal telemetry emitted.
- **D. PRE-DISPATCH PERMIT EXPIRATION:** No provider invocation; no provider-health circuit mutation; no success/failure circuit recording; idempotency ownership cleanup follows existing pre-dispatch failure semantics; no `AttemptToken` cleanup if none was created.

## 11. Retry Classification Matrix
Mapping of `ProviderExecutionErrorCode` to exact retry disposition:
- `PROMPT_COMPILATION_NOT_READY`: `never_retry`
- `INVALID_EXECUTION_INPUT`: `never_retry`
- `INTERNAL_ORCHESTRATION_FAILURE`: `never_retry`
- `MISSING_EXECUTION_PROFILE`: `never_retry`
- `INVALID_PROVIDER_CONFIGURATION`: `never_retry`
- `PROFILE_PROVIDER_INCOMPATIBLE`: `never_retry`
- `IDEMPOTENCY_FINGERPRINT_CONFLICT`: `never_retry`
- `IDEMPOTENCY_LEASE_LOST`: `terminal_immediately`
- `FINGERPRINT_VERSION_MISMATCH`: `never_retry`
- `PROVIDER_EXECUTED_IDEMPOTENCY_UNCONFIRMED`: `terminal_immediately`
- `IDEMPOTENCY_COMPLETION_FAILED`: `terminal_immediately`
- `CIRCUIT_OPEN`: `never_retry`
- `CIRCUIT_PERMIT_EXPIRED`: `never_retry`
- `EXECUTION_CANCELLED`: `terminal_immediately`
- `AUTHENTICATION_FAILED`: `never_retry`
- `INVALID_PROVIDER_RESPONSE`: `never_retry`
- `RATE_LIMITED`: `retry_after_hint_if_within_budget`
- `PROVIDER_UNAVAILABLE`: `retry_if_budget_allows`
- `PROVIDER_UNSUPPORTED`: `never_retry`
- `PROVIDER_TIMEOUT`: `retry_if_budget_allows`
- `INTERNAL_ADAPTER_FAILURE`: `never_retry`
- `RETRY_BUDGET_EXHAUSTED`: `terminal_immediately`

## 12. Security and Diagnostic Redaction
Raw SDK exceptions never enter domain resolutions, ordinary logs, telemetry or persistence. Operational diagnosis operates over a secure private channel.

```typescript
export interface SecureProviderDiagnosticSink {
  record(diagnostic: RedactedProviderDiagnostic): Promise<SecureDiagnosticRecordResult>;
}

export interface RedactedProviderDiagnostic {
  readonly providerId: ProviderId;
  readonly modelId: ProviderModelId;
  readonly adapterVersion: string;
  readonly normalizedErrorCode: ProviderExecutionErrorCode;
  readonly providerStatusCode?: number;
  readonly providerRequestId?: string;
  readonly redactionVersion: string;
  readonly safeErrorFingerprint: string;
  readonly occurredAt: string;
}
```
**Policies:**
1. A deterministic redactor removes all prohibited content (keys, tokens, prompt text).
2. Domain logic only sees `ProviderExecutionErrorCode`.
3. Diagnostic sink failures are silent and do not mutate execution outcome.
4. Raw exceptions are absolutely destroyed locally.

## 13. Telemetry Event Taxonomies
Telemetry is purely informational and its failure does not impact execution outcome.

```typescript
export type TelemetryEventName =
  | 'PROVIDER_EXECUTION_DEFERRED'
  | 'PROVIDER_EXECUTION_IDEMPOTENCY_HIT'
  | 'PROVIDER_EXECUTION_CANCELLED'
  | 'PROVIDER_EXECUTION_FAILED'
  | 'PROVIDER_EXECUTION_SUCCEEDED';

export interface ProviderExecutionTelemetry {
  readonly executionId: ExecutionId;
  readonly correlationId: CorrelationId;
  readonly providerId: ProviderId;
  readonly modelId: ProviderModelId;
  readonly eventName: TelemetryEventName;
  readonly occurredAt: string;
  readonly attemptNumber: number | null;
}

export interface TelemetrySink {
  record(event: ProviderExecutionTelemetry): void | Promise<void>;
}
```

## 14. Late Adapter Callback Invalidation
Every adapter invocation owns an explicit attempt token.

```typescript
export type AttemptToken = string & { readonly __brand: 'AttemptToken' };
```
**Policies:**
1. Before any callback mutates circuit, idempotency, or terminal state, the `AttemptToken` is verified active.
2. After timeout, cancellation, or latch acquisition, the `AttemptToken` becomes permanently inactive.
3. Late successes and failures are neutrally discarded without side effects.

## 15. Audit Trail Persistence Matrix
| Field/Data | Domain Resolution | Persistence | Telemetry | Secure Diagnostics | Prohibited |
| --- | --- | --- | --- | --- | --- |
| ExecutionId | allowed | allowed | allowed | allowed | none |
| ProviderId/ModelId | allowed | allowed | allowed | allowed | none |
| Prompt Compilation Plan | allowed | allowed | prohibited | prohibited | Telemetry/Logs/Diags |
| Generated Text | allowed | allowed | prohibited | prohibited | Telemetry/Logs/Diags |
| Request Fingerprint | allowed | allowed | allowed | prohibited | none |
| IdempotencyLeaseToken | prohibited | Operational DB | prohibited | prohibited | All domain |
| CircuitPermitLeaseToken| prohibited | Operational DB | prohibited | prohibited | All domain |
| Contention / Lease Lost | prohibited | Operational DB | allowed | allowed | none |
| Raw Provider Errors | prohibited | prohibited | prohibited | prohibited | ALL BOUNDARIES |
| Sanitized ErrorCode | allowed | allowed | allowed | allowed | none |
| Reconciliation Req. | allowed | allowed | allowed | allowed | none |

## 16. Prohibited Dependencies and Constructs
- NO references to PER-1.1, PER-2, or PER-3 inside PER-5 logic.
- NO automatic prompt rewriting.
- NO semantic guessing or SDK magic defaulting in Adapters.

## 17. Proposed File Inventory
- `src/domain/orchestration/ProviderExecutionInput.ts`
- `src/domain/orchestration/ProviderExecutionProfile.ts`
- `src/domain/orchestration/TerminalStateLatch.ts`
- `src/domain/orchestration/ExecutionAbortCoordinator.ts`
- `src/infrastructure/adapters/AIProviderAdapter.ts`
- `src/infrastructure/circuit/CircuitBreaker.ts`
- `src/infrastructure/idempotency/IdempotencyStore.ts`
- `src/infrastructure/registry/ProviderRegistry.ts`
- `src/infrastructure/telemetry/TelemetrySink.ts`
- `src/infrastructure/diagnostics/SecureProviderDiagnosticSink.ts`

## 18. Test Strategy
The test matrix comprises exactly 120 unique, manually defined scenarios exercising the deterministic state machines.

### Test 001
- Nombre del escenario (único y descriptivo): Registry ready allows clean Latch success execution.
- Categoría arquitectónica: Execution Pipeline.
- Hechos de entrada exactos: Complete ProviderExecutionInput; Registry confirms ready.
- Estado previo de idempotencia: unreserved.
- Estado previo de circuito: closed.
- Estado de callerAbortSignal: not_aborted.
- Invocaciones al proveedor: 1.
- Conteo de intentos: 1.
- Resolución terminal: SUCCESS.
- Error code exacto: SUCCESS.
- Operación idempotencia: reserve (TTL active) -> complete.
- Operación circuito: acquirePermit -> recordSuccess.
- Resultado latch: tryAcquire(provider_success) -> acquired.
- Orden limpieza: Abort dispose -> Circuit release -> Idempotency complete.
- Comportamiento telemetría: 1 terminal ProviderExecutionEvent (SUCCESS).
- Comportamiento secure diagnostic: none.
- Comportamiento late-response: ninguna.
- Invariante probada: The adapter observes facts and translates mechanically.

### Test 002
- Nombre del escenario (único y descriptivo): Missing execution profile in ProviderExecutionInput blocks dispatch.
- Categoría arquitectónica: Input validation.
- Hechos de entrada exactos: ProviderExecutionInput passed without executionProfile.
- Estado previo de idempotencia: unreserved.
- Estado previo de circuito: closed.
- Estado de callerAbortSignal: not_aborted.
- Invocaciones al proveedor: 0.
- Conteo de intentos: 0.
- Resolución terminal: ProviderExecutionFailure.
- Error code exacto: MISSING_EXECUTION_PROFILE.
- Operación idempotencia: none.

## 20. Test Matrix Schema
Every Test 001–020 must contain all fields below in this exact order:
- Architectural category:
- Exact invariant under test:
- Exact initial ProviderExecutionInput:
- Exact request-fingerprint material:
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection:
- Exact initial idempotency state:
- Exact initial circuit state:
- Exact callerAbortSignal state:
- Exact Registry result:
- Exact adapter fact:
- Exact provider invocation count:
- Exact attempt count:
- Exact TerminalCandidate:
- Exact TerminalStateLatch result:
- Exact ProviderExecutionResolution:
- Exact ProviderExecutionErrorCode or SUCCESS:
- Exact idempotency calls and closed results:
- Exact circuit calls and closed results:
- Exact AttemptExecutionAuthority operations:
- Exact ExecutionAbortContext operations:
- Exact ordered cleanup sequence:
- Exact telemetry events in order:
- Exact secure diagnostic result:
- Exact late-callback behavior:
- Exact state mutation permitted:
- Exact state mutation prohibited:
- Exact assertions proving the invariant:
- Exact contracts exercised:

## 21. 120 Test Cases

### Tests 001–008 — Input and upstream boundary

### Test 001 — PER-4 compilation resolution is not ready.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Upstream resolution status prevents execution
- Exact initial ProviderExecutionInput: { compilationResolution: missing_compilation }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'PROMPT_COMPILATION_NOT_READY' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: PROMPT_COMPILATION_NOT_READY
- Exact idempotency calls and closed results: No idempotency call occurs because PROMPT_COMPILATION_NOT_READY terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because PROMPT_COMPILATION_NOT_READY terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because PROMPT_COMPILATION_NOT_READY terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because PROMPT_COMPILATION_NOT_READY terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'PROMPT_COMPILATION_NOT_READY'
- Exact contracts exercised: ProviderExecutionInput validation, TerminalStateLatch, TelemetrySink

### Test 002 — Execution profile is missing.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Execution profile existence prevents execution
- Exact initial ProviderExecutionInput: { executionProfile: missing_executionProfile }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'MISSING_EXECUTION_PROFILE' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: MISSING_EXECUTION_PROFILE
- Exact idempotency calls and closed results: No idempotency call occurs because MISSING_EXECUTION_PROFILE terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because MISSING_EXECUTION_PROFILE terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because MISSING_EXECUTION_PROFILE terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because MISSING_EXECUTION_PROFILE terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'MISSING_EXECUTION_PROFILE'
- Exact contracts exercised: ProviderExecutionInput validation, TerminalStateLatch, TelemetrySink

### Test 003 — requestedAt is malformed.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Input validation rejects malformed timestamp
- Exact initial ProviderExecutionInput: { requestedAt: '2026-15-99T99:99:99Z' }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INVALID_EXECUTION_INPUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INVALID_EXECUTION_INPUT
- Exact idempotency calls and closed results: No idempotency call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT'
- Exact contracts exercised: ProviderExecutionInput validation, TerminalStateLatch, TelemetrySink

### Test 004 — executionId fails branded-identifier validation.
- Architectural category: Input and upstream boundary
- Exact invariant under test: executionId requires valid branded type construction
- Exact initial ProviderExecutionInput: { executionId: '   ' }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INVALID_EXECUTION_INPUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INVALID_EXECUTION_INPUT
- Exact idempotency calls and closed results: No idempotency call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT'
- Exact contracts exercised: ProviderExecutionInput validation, ExecutionId construction, TerminalStateLatch, TelemetrySink

### Test 005 — correlationId fails branded-identifier validation.
- Architectural category: Input and upstream boundary
- Exact invariant under test: correlationId requires valid branded type construction
- Exact initial ProviderExecutionInput: { correlationId: '   ', executionId: 'exec-per5-005' }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INVALID_EXECUTION_INPUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INVALID_EXECUTION_INPUT
- Exact idempotency calls and closed results: No idempotency call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT'
- Exact contracts exercised: ProviderExecutionInput validation, CorrelationId construction, TerminalStateLatch, TelemetrySink

### Test 006 — timeout policy is absent or invalid.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Runtime boundary rejects invalid timeout policy (attemptTimeoutMs > overallTimeoutMs)
- Exact initial ProviderExecutionInput: { timeoutPolicy: { attemptTimeoutMs: 10000, overallTimeoutMs: 5000 } }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INVALID_EXECUTION_INPUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INVALID_EXECUTION_INPUT
- Exact idempotency calls and closed results: No idempotency call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT'
- Exact contracts exercised: ProviderTimeoutPolicy invariant validation, TerminalStateLatch, TelemetrySink

### Test 007 — retry policy is absent or invalid.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Runtime boundary rejects invalid retry policy (maximumAttempts = 0)
- Exact initial ProviderExecutionInput: { retryPolicy: { maximumAttempts: 0 } }
- Exact request-fingerprint material: Request fingerprint construction is rejected at input validation
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INVALID_EXECUTION_INPUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INVALID_EXECUTION_INPUT
- Exact idempotency calls and closed results: No idempotency call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate before RequestFingerprintBuilder.build()
- Exact circuit calls and closed results: No circuit call occurs because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact AttemptExecutionAuthority operations: No attempt is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INVALID_EXECUTION_INPUT terminates at the input-validation gate
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT'
- Exact contracts exercised: ProviderRetryPolicy invariant validation, TerminalStateLatch, TelemetrySink

### Test 008 — callerAbortSignal is already aborted before orchestration.
- Architectural category: Input and upstream boundary
- Exact invariant under test: Caller abort signal validation before fingerprint and reservation
- Exact initial ProviderExecutionInput: { callerAbortSignal: aborted_with_cause }
- Exact request-fingerprint material: Request fingerprint construction is rejected at fail-fast cancellation gate
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected before RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: aborted (cause: 'caller_cancelled')
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'caller_cancelled', errorCode: 'EXECUTION_CANCELLED' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: EXECUTION_CANCELLED
- Exact idempotency calls and closed results: No idempotency call occurs because EXECUTION_CANCELLED terminates before reserve()
- Exact circuit calls and closed results: No circuit call occurs because EXECUTION_CANCELLED terminates before acquirePermit()
- Exact AttemptExecutionAuthority operations: No attempt is created because EXECUTION_CANCELLED terminates before createAttempt()
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because callerAbortSignal is already aborted
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(caller_cancelled) 2. TelemetrySink.record(PROVIDER_EXECUTION_CANCELLED)
- Exact telemetry events in order: PROVIDER_EXECUTION_CANCELLED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'EXECUTION_CANCELLED'
- Exact contracts exercised: Caller abort fast-fail gate, TerminalStateLatch, TelemetrySink

### Tests 009–018 — Request fingerprint

### Test 009 — Canonically identical semantic inputs create the same fingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint determinism regardless of property insertion order
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-009', providerId: 'provider-approved-a', modelId: 'model-approved-a1', executionProfileId: 'profile-fixed-v1' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial (properties A, B) vs CanonicalRequestFingerprintMaterial (properties B, A)
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-009-v1 (exactly identical for both inputs)
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA === fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder determinism

### Test 010 — Changing providerId changes the fingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of providerId
- Exact initial ProviderExecutionInput: exec-per5-010 (input A with provider-approved-a, input B with provider-approved-b)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-010-v1-A !== fp-per5-010-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to ProviderId

### Test 011 — Changing modelId changes the fingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of modelId
- Exact initial ProviderExecutionInput: exec-per5-011 (input A with model-approved-a1, input B with model-approved-a2)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-011-v1-A !== fp-per5-011-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to ProviderModelId

### Test 012 — Changing executionProfile changes the fingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of ExecutionProfileId and parameters (e.g., maximumOutputUnits)
- Exact initial ProviderExecutionInput: exec-per5-012 (input A with profile-fixed-v1 maximumOutputUnits=1000, input B with maximumOutputUnits=2000)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-012-v1-A !== fp-per5-012-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to ExecutionProfileId and material

### Test 013 — Changing PromptCompilationFingerprint changes RequestFingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of PromptCompilationFingerprint
- Exact initial ProviderExecutionInput: exec-per5-013 (input A with compilation fp-comp-a, input B with compilation fp-comp-b)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-013-v1-A !== fp-per5-013-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to PromptCompilationFingerprint

### Test 014 — Changing timeout policy changes RequestFingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of ProviderTimeoutPolicyId
- Exact initial ProviderExecutionInput: exec-per5-014 (input A with timeout-policy-v1, input B with timeout-policy-v2)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-014-v1-A !== fp-per5-014-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to ProviderTimeoutPolicyId

### Test 015 — Changing retry policy changes RequestFingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of ProviderRetryPolicyId
- Exact initial ProviderExecutionInput: exec-per5-015 (input A with retry-policy-v1, input B with retry-policy-v2)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-015-v1-A !== fp-per5-015-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to ProviderRetryPolicyId

### Test 016 — Changing SafetyPolicyId changes RequestFingerprint.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint inclusion of SafetyPolicyId
- Exact initial ProviderExecutionInput: exec-per5-016 (input A with safety-policy-v1, input B with safety-policy-v2)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial A vs B
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-016-v1-A !== fp-per5-016-v1-B
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA !== fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder sensitivity to SafetyPolicyId

### Test 017 — Property-order independence.
- Architectural category: Request fingerprint
- Exact invariant under test: Fingerprint deterministic sorting of properties
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-017' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial (properties A, B) vs CanonicalRequestFingerprintMaterial (properties B, A)
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-017-v1 (exactly identical for both inputs)
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: fingerprintA === fingerprintB
- Exact contracts exercised: RequestFingerprintBuilder determinism

### Test 018 — Fingerprint schema-version mismatch.
- Architectural category: Request fingerprint
- Exact invariant under test: Invalid RequestFingerprintVersion throws internal orchestration failure
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-018' }
- Exact request-fingerprint material: Version mismatch detected in Builder
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: Rejected during RequestFingerprintBuilder.build()
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INTERNAL_ORCHESTRATION_FAILURE' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INTERNAL_ORCHESTRATION_FAILURE
- Exact idempotency calls and closed results: No idempotency call occurs because INTERNAL_ORCHESTRATION_FAILURE terminates at the fingerprint building gate
- Exact circuit calls and closed results: No circuit call occurs because INTERNAL_ORCHESTRATION_FAILURE terminates before circuit
- Exact AttemptExecutionAuthority operations: No attempt is created because INTERNAL_ORCHESTRATION_FAILURE terminates before attempt
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because INTERNAL_ORCHESTRATION_FAILURE terminates early
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: IdempotencyStore.reserve, CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'INTERNAL_ORCHESTRATION_FAILURE'
- Exact contracts exercised: RequestFingerprintVersion validation, TerminalStateLatch, TelemetrySink

### Tests 019–020 — Initial idempotency behavior

### Test 019 — New reservation is acquired.
- Architectural category: Idempotency reservation
- Exact invariant under test: IdempotencyStore.reserve() returns acquired
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-019' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-019-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked (test stops after reserve)
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'INTERNAL_ORCHESTRATION_FAILURE' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: INTERNAL_ORCHESTRATION_FAILURE
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-019, fp-per5-019-v1, duration) -> { status: 'acquired', executionId: 'exec-per5-019', requestFingerprint: 'fp-per5-019-v1', leaseToken: 'lease-per5-019', leasedUntil: '2026-08-06T23:00:00Z' }; IdempotencyStore.release(exec-per5-019, fp-per5-019-v1, lease-per5-019, 'execution_failed') -> released
- Exact circuit calls and closed results: No circuit call occurs because the test stops after reservation
- Exact AttemptExecutionAuthority operations: No attempt is created
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. IdempotencyStore.release(execution_failed) 3. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible
- Exact state mutation permitted: IdempotencyStore.reserve, IdempotencyStore.release, TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: reservationResult.status === 'acquired'
- Exact contracts exercised: IdempotencyStore.reserve() returning acquired, IdempotencyStore.release()

### Test 020 — Completed identical execution is replayed.
- Architectural category: Idempotency reservation
- Exact invariant under test: IdempotencyStore.reserve() returns already_completed
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-020' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-020-v1
- Exact initial idempotency state: { status: 'already_completed', executionId: 'exec-per5-020', requestFingerprint: 'fp-per5-020-v1', resolution: ProviderExecutionSuccess }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-020, fp-per5-020-v1, duration) -> { status: 'already_completed', executionId: 'exec-per5-020', requestFingerprint: 'fp-per5-020-v1', resolution: ProviderExecutionSuccess }
- Exact circuit calls and closed results: No circuit call occurs because already_completed terminates orchestration early
- Exact AttemptExecutionAuthority operations: No attempt is created because already_completed terminates orchestration early
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because already_completed terminates orchestration early
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. TelemetrySink.record(PROVIDER_EXECUTION_IDEMPOTENCY_HIT)
- Exact telemetry events in order: PROVIDER_EXECUTION_IDEMPOTENCY_HIT
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext, adapter dispatch
- Exact assertions proving the invariant: reservationResult.status === 'already_completed'
- Exact contracts exercised: IdempotencyStore.reserve() returning already_completed

### Test 021 — Identical execution already in progress.
- Architectural category: Idempotency concurrency
- Exact invariant under test: Simultaneous dispatches for the same execution yield deferred result without invoking provider or terminal error
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-021' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-021-v1
- Exact initial idempotency state: already_in_progress
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: None
- Exact TerminalStateLatch result: Not invoked
- Exact ProviderExecutionResolution: ProviderExecutionDeferred
- Exact ProviderExecutionErrorCode or SUCCESS: N/A
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> already_in_progress
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> not invoked
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt() -> not invoked
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext() -> not invoked
- Exact ordered cleanup sequence: 1. TelemetrySink.record(PROVIDER_EXECUTION_DEFERRED)
- Exact telemetry events in order: PROVIDER_EXECUTION_DEFERRED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Not applicable
- Exact state mutation permitted: None
- Exact state mutation prohibited: IdempotencyStore.release, IdempotencyStore.complete
- Exact assertions proving the invariant: resolution.status === 'deferred' && resolution.reasonCode === 'IDENTICAL_EXECUTION_IN_PROGRESS'
- Exact contracts exercised: IdempotencyStore preventing concurrent execution

### Test 022 — Same executionId with different provider.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched provider fingerprint rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-022', providerId: 'provider-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-022-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-022, fp-per5-022-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-022-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 023 — Same executionId with different model.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched model fingerprint rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-023', modelId: 'model-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-023-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-023, fp-per5-023-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-023-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 024 — Same executionId with different profile.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched executionProfileId fingerprint rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-024', executionProfileId: 'profile-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-024-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-024, fp-per5-024-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-024-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 025 — Same executionId with different prompt fingerprint.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched PromptCompilationFingerprint rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-025', promptCompilationFingerprint: 'fp-comp-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-025-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-025, fp-per5-025-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-025-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 026 — Same executionId with different timeout policy.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched timeout policy rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-026', timeoutPolicy: 'timeout-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-026-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-026, fp-per5-026-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-026-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 027 — Same executionId with different retry policy.
- Architectural category: Idempotency reservation
- Exact invariant under test: executionId conflict with mismatched retry policy rejects execution
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-027', retryPolicy: 'retry-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-027-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-027, fp-per5-027-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-027-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT'
- Exact contracts exercised: IdempotencyStore.reserve() returning fingerprint_conflict

### Test 028 — Fingerprint conflict hides both fingerprints from telemetry.
- Architectural category: Idempotency reservation
- Exact invariant under test: Fingerprint conflict telemetry must omit cryptographic fingerprints to prevent data leak
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-028', safetyPolicyId: 'safety-different' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-028-v1
- Exact initial idempotency state: { status: 'acquired', requestFingerprint: 'fp-different' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_FINGERPRINT_CONFLICT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_FINGERPRINT_CONFLICT
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-028, fp-per5-028-v1, duration) -> { status: 'fingerprint_conflict', expectedFingerprint: 'fp-different', receivedFingerprint: 'fp-per5-028-v1' }
- Exact circuit calls and closed results: No circuit call occurs because fingerprint_conflict terminates orchestration
- Exact AttemptExecutionAuthority operations: No attempt is created because fingerprint_conflict terminates orchestration
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because fingerprint_conflict terminates orchestration
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. TelemetrySink.record(PROVIDER_EXECUTION_FAILED)
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED (payload explicitly excludes expectedFingerprint and receivedFingerprint)
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible because AttemptToken was never created
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext
- Exact assertions proving the invariant: telemetryEvents[0] does not contain expectedFingerprint or receivedFingerprint
- Exact contracts exercised: TelemetrySink security filtering for IDEMPOTENCY_FINGERPRINT_CONFLICT

### Test 029 — Reservation storage failure.
- Architectural category: Resilience boundaries
- Exact invariant under test: Idempotency backend failure aborts flow immediately with IDEMPOTENCY_STORAGE_UNAVAILABLE
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-029' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-029-v1
- Exact initial idempotency state: unreserved (backend unavailable)
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: None
- Exact TerminalStateLatch result: Not invoked
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_STORAGE_UNAVAILABLE
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> throws storage error
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> not invoked
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt() -> not invoked
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext() -> not invoked
- Exact ordered cleanup sequence: 1. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 2. SecureProviderDiagnosticSink: emits redacted operational diagnostic
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: emits redacted operational diagnostic
- Exact late-callback behavior: Not applicable
- Exact state mutation permitted: None
- Exact state mutation prohibited: IdempotencyStore.release, IdempotencyStore.complete
- Exact assertions proving the invariant: terminalLatchInvocationCount === 0 && resolution.errorCode === 'IDEMPOTENCY_STORAGE_UNAVAILABLE'
- Exact contracts exercised: IdempotencyStore exception translation

### Test 030 — Expired reservation atomically reclaimed.
- Architectural category: Idempotency reservation
- Exact invariant under test: Expired previous reservations are overwritten securely by new reservations
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-030' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-030-v1
- Exact initial idempotency state: { status: 'already_in_progress', leasedUntil: '2020-01-01T00:00:00Z' }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-030, fp-per5-030-v1, duration) -> { status: 'acquired', leaseToken: 'new-lease-030' }; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, new-lease-030, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: Deep-freeze ProviderExecutionSuccess.
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'SUCCESS'
- Exact contracts exercised: IdempotencyStore expiration reclamation

### Test 031 — Two simultaneous reserve calls.
- Architectural category: Idempotency concurrency
- Exact invariant under test: Concurrent dispatch yields exactly one winner and one deferred result
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-031' } (called twice concurrently)
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-031-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Winner invokes provider, loser does not
- Exact provider invocation count: Winner: 1, Loser: 0
- Exact attempt count: Winner: 1, Loser: 0
- Exact TerminalCandidate: Winner: { cause: 'success', errorCode: 'SUCCESS' }, Loser: None
- Exact TerminalStateLatch result: Winner: { status: 'acquired', winner: candidate }, Loser: Not invoked
- Exact ProviderExecutionResolution: Winner: ProviderExecutionSuccess, Loser: ProviderExecutionDeferred
- Exact ProviderExecutionErrorCode or SUCCESS: Winner: SUCCESS, Loser: N/A
- Exact idempotency calls and closed results: Winner: reserve() -> acquired, Loser: reserve() -> already_in_progress
- Exact circuit calls and closed results: Winner: acquirePermit() -> admitted_normal, Loser: not invoked
- Exact AttemptExecutionAuthority operations: Winner: createAttempt(), Loser: not invoked
- Exact ExecutionAbortContext operations: Winner: createExecutionAbortContext(), Loser: not invoked
- Exact ordered cleanup sequence: Winner: normal success cleanup, Loser: 1. TelemetrySink.record(PROVIDER_EXECUTION_DEFERRED)
- Exact telemetry events in order: Winner: PROVIDER_EXECUTION_SUCCEEDED, Loser: PROVIDER_EXECUTION_DEFERRED
- Exact secure diagnostic result: Winner: no diagnostic emitted, Loser: no diagnostic emitted
- Exact late-callback behavior: Not applicable
- Exact state mutation permitted: Winner: IdempotencyStore.complete
- Exact state mutation prohibited: Loser: IdempotencyStore.release, IdempotencyStore.complete
- Exact assertions proving the invariant: winner gets SUCCESS, loser gets ProviderExecutionDeferred
- Exact contracts exercised: IdempotencyStore strict linearizability

### Test 032 — Completed result with matching fingerprint returned without dispatch.
- Architectural category: Idempotency reservation
- Exact invariant under test: Replay of completed request bypasses provider and returns previous deep-frozen success
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-032' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-032-v1
- Exact initial idempotency state: { status: 'already_completed', executionId: 'exec-per5-032', requestFingerprint: 'fp-per5-032-v1', resolution: ProviderExecutionSuccess }
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: adapter is not invoked
- Exact provider invocation count: 0
- Exact attempt count: 0
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve(exec-per5-032, fp-per5-032-v1, duration) -> { status: 'already_completed', resolution: ProviderExecutionSuccess }
- Exact circuit calls and closed results: No circuit call occurs because already_completed terminates orchestration early
- Exact AttemptExecutionAuthority operations: No attempt is created because already_completed terminates orchestration early
- Exact ExecutionAbortContext operations: No ExecutionAbortContext is created because already_completed terminates orchestration early
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. TelemetrySink.record(PROVIDER_EXECUTION_IDEMPOTENCY_HIT)
- Exact telemetry events in order: PROVIDER_EXECUTION_IDEMPOTENCY_HIT
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: no callback possible
- Exact state mutation permitted: TelemetrySink.record
- Exact state mutation prohibited: CircuitBreaker.acquirePermit, AttemptExecutionAuthority.createAttempt, ExecutionAbortCoordinator.createExecutionAbortContext, adapter dispatch
- Exact assertions proving the invariant: reservationResult.status === 'already_completed'
- Exact contracts exercised: IdempotencyStore.reserve() returning already_completed

### Test 033 — Successful lease renewal.
- Architectural category: Lease ownership
- Exact invariant under test: Lease renewal successfully extends reservation timeout
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-033' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-033-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.renew(..., leaseToken) -> 'renewed'; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late callbacks
- Exact state mutation permitted: IdempotencyStore.renew
- Exact state mutation prohibited: none
- Exact assertions proving the invariant: IdempotencyStore.renew returns 'renewed'
- Exact contracts exercised: IdempotencyStore.renew()

### Test 034 — Renewal after lease loss.
- Architectural category: Lease ownership
- Exact invariant under test: Renewal failure due to lease_lost securely aborts execution orchestration
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-034' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-034-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Adapter is executing when renew fires
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_LEASE_LOST' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_LEASE_LOST
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.renew(..., leaseToken) -> 'lease_lost'; IdempotencyStore.release(execution_failed) -> released
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., IDEMPOTENCY_LEASE_LOST) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('lease_lost') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. AttemptToken.invalidate(lease_lost) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, IDEMPOTENCY_LEASE_LOST) 5. IdempotencyStore.release(execution_failed) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('lease_lost') rejects late adapter callback completely
- Exact state mutation permitted: IdempotencyStore.renew, AttemptToken.invalidate, CircuitBreaker.recordFailure, IdempotencyStore.release
- Exact state mutation prohibited: IdempotencyStore.complete
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST'
- Exact contracts exercised: IdempotencyStore.renew() returning lease_lost, single-winner terminal latch

### Test 035 — Renewal after expiration.
- Architectural category: Lease ownership
- Exact invariant under test: Renewal failure due to expired securely aborts execution orchestration
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-035' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-035-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Adapter is executing when renew fires
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_LEASE_LOST' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_LEASE_LOST
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.renew(..., leaseToken) -> 'expired'; IdempotencyStore.release(execution_failed) -> released
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., IDEMPOTENCY_LEASE_LOST) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('lease_lost') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. AttemptToken.invalidate(lease_lost) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, IDEMPOTENCY_LEASE_LOST) 5. IdempotencyStore.release(execution_failed) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('lease_lost') rejects late adapter callback completely
- Exact state mutation permitted: IdempotencyStore.renew, AttemptToken.invalidate, CircuitBreaker.recordFailure, IdempotencyStore.release
- Exact state mutation prohibited: IdempotencyStore.complete
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST'
- Exact contracts exercised: IdempotencyStore.renew() returning expired

### Test 036 — Stale worker completion rejected.
- Architectural category: Completion lifecycle
- Exact invariant under test: Successful provider callback fails if lease was lost concurrently
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-036' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-036-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_LEASE_LOST' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_LEASE_LOST
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete(..., leaseToken) -> 'lease_lost'; IdempotencyStore.release(execution_failed) -> released
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., IDEMPOTENCY_LEASE_LOST) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('lease_lost') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. AttemptToken.invalidate(lease_lost) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, IDEMPOTENCY_LEASE_LOST) 5. IdempotencyStore.release(execution_failed) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('lease_lost') prevents further callbacks
- Exact state mutation permitted: IdempotencyStore.complete, CircuitBreaker.recordFailure, IdempotencyStore.release
- Exact state mutation prohibited: CircuitBreaker.recordSuccess
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST'
- Exact contracts exercised: IdempotencyStore.complete() returning lease_lost

### Test 037 — Completion with fingerprint mismatch.
- Architectural category: Completion lifecycle
- Exact invariant under test: Successful provider callback fails if fingerprint changed concurrently in storage
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-037' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-037-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_COMPLETION_FAILED' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_COMPLETION_FAILED
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete(..., leaseToken) -> 'fingerprint_conflict'; IdempotencyStore.release(execution_failed) -> released
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., IDEMPOTENCY_COMPLETION_FAILED) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completion_failed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. AttemptToken.invalidate(completion_failed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, IDEMPOTENCY_COMPLETION_FAILED) 5. IdempotencyStore.release(execution_failed) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completion_failed') prevents further callbacks
- Exact state mutation permitted: IdempotencyStore.complete, CircuitBreaker.recordFailure, IdempotencyStore.release
- Exact state mutation prohibited: CircuitBreaker.recordSuccess
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_COMPLETION_FAILED'
- Exact contracts exercised: IdempotencyStore.complete() returning fingerprint_conflict

### Test 038 — Duplicate completion.
- Architectural category: Completion lifecycle
- Exact invariant under test: Successful provider callback fails if reservation already completed concurrently
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-038' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-038-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'internal_orchestration_failure', errorCode: 'IDEMPOTENCY_COMPLETION_FAILED' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: IDEMPOTENCY_COMPLETION_FAILED
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete(..., leaseToken) -> 'already_completed'; IdempotencyStore.release(execution_failed) -> released
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., IDEMPOTENCY_COMPLETION_FAILED) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completion_failed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(internal_orchestration_failure) 2. AttemptToken.invalidate(completion_failed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, IDEMPOTENCY_COMPLETION_FAILED) 5. IdempotencyStore.release(execution_failed) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completion_failed') prevents further callbacks
- Exact state mutation permitted: IdempotencyStore.complete, CircuitBreaker.recordFailure, IdempotencyStore.release
- Exact state mutation prohibited: CircuitBreaker.recordSuccess
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'IDEMPOTENCY_COMPLETION_FAILED'
- Exact contracts exercised: IdempotencyStore.complete() returning already_completed

### Test 039 — Release after completion.
- Architectural category: Release lifecycle
- Exact invariant under test: Successful completion prevents late failure cleanup from calling release
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-039' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-039-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: ProviderAdapterSuccess
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'provider_success' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionSuccess
- Exact ProviderExecutionErrorCode or SUCCESS: SUCCESS
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.complete() -> completed
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordSuccess() -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('completed') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(provider_success) 2. AttemptToken.invalidate(completed) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordSuccess(circuitPermitToken) 5. IdempotencyStore.complete(executionId, requestFingerprint, leaseToken, successResolution) 6. TelemetrySink.record(PROVIDER_EXECUTION_SUCCEEDED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_SUCCEEDED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('completed') rejects late timeout callback, thus IdempotencyStore.release is NEVER called.
- Exact state mutation permitted: IdempotencyStore.complete
- Exact state mutation prohibited: IdempotencyStore.release
- Exact assertions proving the invariant: IdempotencyStore.release is not invoked
- Exact contracts exercised: AttemptExecutionHandle preventing late cancellation leakage to release()

### Test 040 — Completion after release.
- Architectural category: Release lifecycle
- Exact invariant under test: Late provider completion is safely rejected by AttemptToken before reaching IdempotencyStore
- Exact initial ProviderExecutionInput: { executionId: 'exec-per5-040' }
- Exact request-fingerprint material: CanonicalRequestFingerprintMaterial
- Exact expected RequestFingerprint or explicit pre-fingerprint rejection: fp-per5-040-v1
- Exact initial idempotency state: unreserved
- Exact initial circuit state: closed
- Exact callerAbortSignal state: not_aborted
- Exact Registry result: provider_ready
- Exact adapter fact: Adapter is executing when timeout fires
- Exact provider invocation count: 1
- Exact attempt count: 1
- Exact TerminalCandidate: { cause: 'overall_timeout', errorCode: 'OVERALL_EXECUTION_TIMEOUT' }
- Exact TerminalStateLatch result: { status: 'acquired', winner: candidate }
- Exact ProviderExecutionResolution: ProviderExecutionFailure
- Exact ProviderExecutionErrorCode or SUCCESS: OVERALL_EXECUTION_TIMEOUT
- Exact idempotency calls and closed results: IdempotencyStore.reserve() -> acquired; IdempotencyStore.release(..., 'overall_timeout') -> 'released'
- Exact circuit calls and closed results: CircuitBreaker.acquirePermit() -> admitted_normal; CircuitBreaker.recordFailure(..., OVERALL_EXECUTION_TIMEOUT) -> recorded
- Exact AttemptExecutionAuthority operations: AttemptExecutionAuthority.createAttempt(); Handle.invalidate('timeout') -> invalidated
- Exact ExecutionAbortContext operations: ExecutionAbortCoordinator.createExecutionAbortContext(); Context.dispose() -> disposed
- Exact ordered cleanup sequence: 1. TerminalStateLatch.tryAcquire(overall_timeout) 2. AttemptToken.invalidate(timeout) 3. ExecutionAbortContext.dispose() 4. CircuitBreaker.recordFailure(circuitPermitToken, OVERALL_EXECUTION_TIMEOUT) 5. IdempotencyStore.release(overall_timeout) 6. TelemetrySink.record(PROVIDER_EXECUTION_FAILED) 7. SecureProviderDiagnosticSink: no diagnostic emitted
- Exact telemetry events in order: PROVIDER_EXECUTION_FAILED
- Exact secure diagnostic result: no diagnostic emitted
- Exact late-callback behavior: Handle.invalidate('timeout') rejects late adapter success, preventing IdempotencyStore.complete()
- Exact state mutation permitted: IdempotencyStore.release
- Exact state mutation prohibited: IdempotencyStore.complete
- Exact assertions proving the invariant: terminalResult.winner.errorCode === 'OVERALL_EXECUTION_TIMEOUT'
- Exact contracts exercised: AttemptExecutionHandle preventing late provider success leakage to complete()

### Test 041 — Release by stale lease token.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 042 — Provider succeeds after lease loss.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 043 — Completion store failure after provider execution.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 044 — Reconciliation-required resolution.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 045 — Provider ready.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 046 — Provider unsupported.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 047 — Provider disabled.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 048 — Provider not configured.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 049 — Model unsupported.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 050 — Execution profile unsupported.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 051 — Model/profile incompatible.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 052 — Tenant unauthorized.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 053 — Environment unauthorized.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 054 — Safety policy unsupported.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 055 — Adapter unavailable.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 056 — Exact sampling configuration cannot be mapped.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 057 — Closed circuit admits normal permit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 058 — Closed circuit records success.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 059 — Closed circuit records retryable failure below threshold.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 060 — Failure threshold opens circuit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 061 — Open circuit rejects invocation.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 062 — Reset interval admits one half-open probe.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 063 — Concurrent half-open probe rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 064 — Half-open probe success closes circuit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 065 — Half-open probe failure reopens circuit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 066 — Half-open probe timeout reopens circuit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 067 — Half-open probe cancellation reopens circuit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 068 — Expired permit cannot record success.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 069 — Wrong lease token cannot finalize permit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 070 — Wrong provider/model key cannot use permit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 071 — Authentication failure is terminal.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 072 — Authorization failure is terminal.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 073 — Rate limit retries within budget.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 074 — Retry-After exceeds remaining budget.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 075 — Network failure retries once.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 076 — Provider unavailable exhausts maximum attempts.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 077 — Provider timeout retries within overall deadline.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 078 — Overall deadline prevents next retry.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 079 — Content-policy rejection is terminal.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 080 — Invalid response is terminal.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 081 — Retry preserves provider.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 082 — Retry preserves model.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 083 — Retry preserves execution profile and prompt.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 084 — Adapter cannot request a retry.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 085 — Caller cancels before idempotency reservation.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 086 — Caller cancels after reservation.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 087 — Caller cancels after circuit admission.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 088 — Caller cancels before adapter dispatch.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 089 — Caller cancels during adapter execution.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 090 — Attempt timeout during execution.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 091 — Overall timeout during execution.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 092 — Provider success wins before cancellation.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 093 — Cancellation wins before provider success.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 094 — Provider failure wins before timeout.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 095 — Timeout wins before provider failure.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 096 — Lease loss wins before provider success.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 097 — Duplicate cancellation callback.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 098 — Duplicate timeout callback.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 099 — Duplicate provider-success callback.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 100 — Provider response after terminal completion.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 101 — Valid text success.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 102 — Empty generated text rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 103 — Whitespace-only generated text rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 104 — Oversized response rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 105 — Invalid finish reason rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 106 — Negative usage rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 107 — Inconsistent token totals rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 108 — Invalid safety report rejected.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 109 — Content-filter finish reason normalized.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 110 — Raw SDK exception becomes INTERNAL_ADAPTER_FAILURE without raw text.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 111 — Attempt-started telemetry.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 112 — Successful terminal telemetry.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 113 — Failed terminal telemetry.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 114 — Telemetry sink rejection does not change provider result.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 115 — Secure redacted diagnostic contains only approved fields.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 116 — Secure diagnostic sink failure remains isolated.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 117 — Adapter mutation of execution profile is rejected or impossible.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 118 — Late callback rejected by inactive AttemptToken, stale lease and finalized permit.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 119 — TerminalStateLatch structural authority boundary.

PENDING — NOT SPECIFIED IN BLOCK 2

### Test 120 — Complete end-to-end successful orchestration and cleanup.

PENDING — NOT SPECIFIED IN BLOCK 2

## 22. Contract-to-Test Traceability Matrix (Blocks 1 & 2)
| Contract / invariant | Test IDs | Exact assertion | Expected result |
| --- | --- | --- | --- |
| PER-4 ready boundary | 001 | terminalResult.winner.errorCode === 'PROMPT_COMPILATION_NOT_READY' | PROMPT_COMPILATION_NOT_READY |
| ProviderExecutionInput validation | 002 | terminalResult.winner.errorCode === 'MISSING_EXECUTION_PROFILE' | MISSING_EXECUTION_PROFILE |
| invalid requestedAt | 003 | terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT' | INVALID_EXECUTION_INPUT |
| branded ExecutionId validation | 004 | terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT' | INVALID_EXECUTION_INPUT |
| branded CorrelationId validation | 005 | terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT' | INVALID_EXECUTION_INPUT |
| ProviderTimeoutPolicy validation | 006 | terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT' | INVALID_EXECUTION_INPUT |
| ProviderRetryPolicy validation | 007 | terminalResult.winner.errorCode === 'INVALID_EXECUTION_INPUT' | INVALID_EXECUTION_INPUT |
| already-aborted caller signal | 008 | terminalResult.winner.errorCode === 'EXECUTION_CANCELLED' | EXECUTION_CANCELLED |
| RequestFingerprintBuilder determinism | 009 | fingerprintA === fingerprintB | fp-per5-009-v1 |
| semantic fingerprint providerId | 010 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint modelId | 011 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint executionProfileId | 012 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint PromptCompilationFingerprint | 013 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint timeout policy | 014 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint retry policy | 015 | fingerprintA !== fingerprintB | not equal |
| semantic fingerprint safety policy | 016 | fingerprintA !== fingerprintB | not equal |
| property-order independence | 017 | fingerprintA === fingerprintB | fp-per5-017-v1 |
| fingerprint-version conflict | 018 | terminalResult.winner.errorCode === 'INTERNAL_ORCHESTRATION_FAILURE' | INTERNAL_ORCHESTRATION_FAILURE |
| idempotency acquired | 019 | reservationResult.status === 'acquired' | acquired |
| idempotency already_completed replay | 020 | reservationResult.status === 'already_completed' | already_completed |
| concurrency already_in_progress | 021 | resolution.status === 'deferred' | ProviderExecutionDeferred |
| fingerprint conflict (provider) | 022 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict (model) | 023 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict (profile) | 024 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict (prompt) | 025 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict (timeout) | 026 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict (retry) | 027 | terminalResult.winner.errorCode === 'IDEMPOTENCY_FINGERPRINT_CONFLICT' | IDEMPOTENCY_FINGERPRINT_CONFLICT |
| fingerprint conflict telemetry leak protection | 028 | telemetryEvents excludes receivedFingerprint | PROVIDER_EXECUTION_FAILED |
| idempotency storage failure | 029 | terminalLatchInvocationCount === 0 && resolution.errorCode === 'IDEMPOTENCY_STORAGE_UNAVAILABLE' | ProviderExecutionFailure, IDEMPOTENCY_STORAGE_UNAVAILABLE |
| expired reservation reclaim | 030 | terminalResult.winner.errorCode === 'SUCCESS' | SUCCESS |
| simultaneous reservation race | 031 | resolution.status === 'deferred' | ProviderExecutionDeferred |
| already_completed without dispatch | 032 | terminalResult.winner.errorCode === 'SUCCESS' | SUCCESS |
| successful lease renewal | 033 | IdempotencyStore.renew returns 'renewed' | SUCCESS |
| renewal after lease loss | 034 | terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST' | IDEMPOTENCY_LEASE_LOST |
| renewal after expiration | 035 | terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST' | IDEMPOTENCY_LEASE_LOST |
| stale completion rejection | 036 | terminalResult.winner.errorCode === 'IDEMPOTENCY_LEASE_LOST' | IDEMPOTENCY_LEASE_LOST |
| completion fingerprint mismatch | 037 | terminalResult.winner.errorCode === 'IDEMPOTENCY_COMPLETION_FAILED' | IDEMPOTENCY_COMPLETION_FAILED |
| duplicate completion | 038 | terminalResult.winner.errorCode === 'IDEMPOTENCY_COMPLETION_FAILED' | IDEMPOTENCY_COMPLETION_FAILED |
| release after completion | 039 | IdempotencyStore.release is not invoked | SUCCESS |
| completion after release | 040 | terminalResult.winner.errorCode === 'OVERALL_EXECUTION_TIMEOUT' | OVERALL_EXECUTION_TIMEOUT |

**STATUS: PER-5 TEST MATRIX BLOCK 2 COMPLETE — BLOCKS 3–6 PENDING**
