import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

async function main() {
  const isExecute = process.argv.includes('--execute');

  const projectId = TARGET_PROJECT;
  if (projectId === PROD_PROJECT) {
    console.error(`[CRITICAL ABORT] Attempted to run against production project: ${PROD_PROJECT}`);
    process.exit(1);
  }

  console.log(`[TARGET PROJECT]: ${projectId}`);
  console.log(`[MODE]: ${isExecute ? 'EXECUTE (REAL MUTATION)' : 'DRY RUN — NO CLOUD MUTATIONS WILL OCCUR'}`);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId
  });
  const db = getFirestore(app);

  const authContextRef = db.collection('authorizationContexts').doc('lab-teacher-anita');
  const assignmentRef = db.collection('assignments').doc('20000000-0000-4000-8000-000000000001');

  const [authContextSnap, assignmentSnap] = await Promise.all([
    authContextRef.get(),
    assignmentRef.get()
  ]);

  if (!authContextSnap.exists) {
    throw new Error('Doc /authorizationContexts/lab-teacher-anita not found!');
  }
  if (!assignmentSnap.exists) {
    throw new Error('Doc /assignments/20000000-0000-4000-8000-000000000001 not found!');
  }

  const authContextBefore = authContextSnap.data();
  const assignmentBefore = assignmentSnap.data();

  const backupData = {
    timestamp: new Date().toISOString(),
    project: projectId,
    documents: {
      '/authorizationContexts/lab-teacher-anita': authContextBefore,
      '/assignments/20000000-0000-4000-8000-000000000001': assignmentBefore
    }
  };

  const backupPath = resolve(process.cwd(), 'scripts/firebase/backup_SRMD25D_before.json');
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`[BACKUP CREATED]: ${backupPath}`);
  console.log('--- Before State ---');
  console.log('authContext.roomIds:', authContextBefore.roomIds);
  console.log('assignment.roomIds:', assignmentBefore.roomIds);

  const targetRoomIds = ['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c'];

  if (!isExecute) {
    console.log('\n[DRY RUN COMPLETE] Target roomIds to set:', targetRoomIds);
    console.log('Run with --execute to apply the mutation to tutoria-identity-lab.');
    return;
  }

  console.log('\n--- Applying Surgical Update ---');
  await authContextRef.update({ roomIds: targetRoomIds });
  console.log('Updated /authorizationContexts/lab-teacher-anita roomIds');

  await assignmentRef.update({ roomIds: targetRoomIds });
  console.log('Updated /assignments/20000000-0000-4000-8000-000000000001 roomIds');

  console.log('\n--- Verifying Post-Update State ---');
  const [authContextAfterSnap, assignmentAfterSnap] = await Promise.all([
    authContextRef.get(),
    assignmentRef.get()
  ]);

  const authContextAfter = authContextAfterSnap.data();
  const assignmentAfter = assignmentAfterSnap.data();

  console.log('authContextAfter:', JSON.stringify(authContextAfter, null, 2));
  console.log('assignmentAfter:', JSON.stringify(assignmentAfter, null, 2));

  // Assert integrity of all other fields
  if (JSON.stringify(authContextAfter.roomIds) !== JSON.stringify(targetRoomIds)) {
    throw new Error('Integrity check failed: authContextAfter.roomIds mismatch!');
  }
  if (JSON.stringify(assignmentAfter.roomIds) !== JSON.stringify(targetRoomIds)) {
    throw new Error('Integrity check failed: assignmentAfter.roomIds mismatch!');
  }
  if (authContextAfter.userId !== authContextBefore.userId && authContextAfter.authUid !== authContextBefore.authUid) {
    throw new Error('Integrity check failed: user identity changed!');
  }
  if (authContextAfter.institutionalRole !== authContextBefore.institutionalRole) {
    throw new Error('Integrity check failed: role changed!');
  }
  if (assignmentAfter.personId !== assignmentBefore.personId) {
    throw new Error('Integrity check failed: personId changed!');
  }

  console.log('\n[SUCCESS]: Surgical update completed and verified with 100% field integrity.');
}

main().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
