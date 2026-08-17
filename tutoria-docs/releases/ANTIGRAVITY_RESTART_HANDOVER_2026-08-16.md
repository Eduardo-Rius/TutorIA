# TutorIA Antigravity Restart Handover

## Repository
Repository:
TutorIA

Branch:
sprint/0.6-core-domain-foundation

Recovery HEAD:
af91e64ab17e8ee8bb98808921fe9a39a49c6588

## Current Architecture Milestone
Identity V2

## Firebase Environments
LAB:
tutoria-identity-lab

PROD:
guarderiasimss-5cb09

PROD MUTATION:
NOT AUTHORIZED

## Completed
- LAB / PROD Firebase boundary isolated
- AuthorizationContext supports Supervisor multi-daycare scope
- AuthorizationContext rehydration invariants protected
- Firestore Rules migrated to Identity V2
- Firestore Rules V2 deployed to LAB
- Safe Identity LAB Provisioner implemented
- Provisioner protected remotely in GitHub

## Current Provisioner State
Default:
DRY RUN

Real mutation:
requires --execute

Password:
requires FIXTURE_PASSWORD during execute

LAB target:
tutoria-identity-lab

PROD:
hard denied

## Planned LAB Fixtures
Auth users:
4

Synthetic identities:
Anita — TEACHER — daycare 1
Laura — TEACHER — daycare 2
Ceci — DIRECTOR — daycare 1
Tere — SUPERVISOR — daycare 1 + daycare 2

Firestore topology:
daycares: 2
persons: 4
assignments: 4
authorizationContexts: 4

weeklyPlannings:
0

legacy users authorization fixtures:
0

## EXACT STOPPING POINT

THE FIRST REAL IDENTITY FIXTURE SEED HAS NOT BEEN EXECUTED.

No Auth users have been created by the provisioner.

No Identity V2 fixture documents have been written by the provisioner.

## NEXT ACTION

PRE-EXECUTION CREDENTIAL + TARGET AUDIT.

Before ANY --execute invocation:

1. determine the credential source used by firebase-admin
2. verify Application Default Credentials availability
3. determine credential project identity
4. prove effective project is tutoria-identity-lab
5. prove PROD guard remains effective
6. verify FIXTURE_PASSWORD availability without printing it
7. perform zero mutations during the audit
8. obtain explicit HUMAN AUTHORIZATION before first real seed

DO NOT execute the seed merely because this handover exists.

## Absolute Safety Rules

- Never mutate PROD without explicit human authorization.
- Never infer Firebase target.
- Never expose secrets.
- Never use destructive collection-wide fixture cleanup.
- Never touch Planning during Identity fixture provisioning.
- Never pass --execute during an audit.
- Human authorization required before first real seed.
- Browser/runtime evidence overrides assumptions.
- No force push.
- No automatic tags.

## Resume Command

After restart:

cd /Users/rius/Developer/TutorIA

git checkout sprint/0.6-core-domain-foundation

git pull --ff-only origin sprint/0.6-core-domain-foundation

git rev-parse HEAD

Expected:

af91e64ab17e8ee8bb98808921fe9a39a49c6588

Then:

cd tutoria-app

npm install

DO NOT run the provisioner with --execute.

Resume with:

PRE-EXECUTION CREDENTIAL + TARGET AUDIT
