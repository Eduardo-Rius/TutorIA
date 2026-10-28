import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

const BACKUP_PATH = resolve(process.cwd(), 'scripts/firebase/backup_SRMD28_before.json');

const TARGETS = [
  {
    label: 'Anita (Asistente Educativa Guardería 001)',
    authContextPath: 'authorizationContexts/lab-teacher-anita',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000001',
  },
  {
    label: 'Asistente Educativa (Guardería 002)',
    authContextPath: 'authorizationContexts/lab-g002-asistente',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000011',
  },
];

async function main() {
  const isExecute = process.argv.includes('--execute');
  const isRollback = process.argv.includes('--rollback');

  const projectId = TARGET_PROJECT;
  if (projectId === PROD_PROJECT) {
    console.error(`[CRITICAL ABORT] Attempted to run against production project: ${PROD_PROJECT}`);
    process.exit(1);
  }

  console.log(`================================================================`);
  console.log(`MASTER ARB — SR-MD-28 | AUTORIZACIÓN MATERNAL A EN LAB`);
  console.log(`Proyecto Destino: ${projectId}`);
  console.log(`Modo: ${isRollback ? 'ROLLBACK' : isExecute ? 'EXECUTE (MUTACIÓN EFECTIVA)' : 'DRY RUN (SOLO LECTURA / INSPECCIÓN)'}`);
  console.log(`================================================================\n`);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);

  if (isRollback) {
    if (!existsSync(BACKUP_PATH)) {
      throw new Error(`Backup file not found at ${BACKUP_PATH}`);
    }
    const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf-8'));
    console.log(`[ROLLBACK]: Restaurando estado previo desde ${BACKUP_PATH}...`);
    for (const [docPath, data] of Object.entries(backup.documents)) {
      await db.doc(docPath).set(data);
      console.log(` - Restaurado: /${docPath}`);
    }
    console.log('[ROLLBACK SUCCESS]: Estado anterior restaurado al 100%.');
    return;
  }

  // 1. Lectura del estado actual
  const currentStates = {};
  for (const target of TARGETS) {
    const authSnap = await db.doc(target.authContextPath).get();
    const assignSnap = await db.doc(target.assignmentPath).get();

    if (!authSnap.exists) {
      throw new Error(`Documento no encontrado: /${target.authContextPath}`);
    }
    if (!assignSnap.exists) {
      throw new Error(`Documento no encontrado: /${target.assignmentPath}`);
    }

    currentStates[target.authContextPath] = authSnap.data();
    currentStates[target.assignmentPath] = assignSnap.data();
  }

  // 2. Generación de respaldo
  const backupData = {
    timestamp: new Date().toISOString(),
    project: projectId,
    operation: 'SR-MD-28 Add room-maternal-a',
    documents: currentStates,
  };
  writeFileSync(BACKUP_PATH, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`[BACKUP CREADO]: ${BACKUP_PATH}\n`);

  // 3. Inspección y propuesta de cambio
  console.log(`--- ESTADO ANTERIOR ---`);
  for (const target of TARGETS) {
    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath} -> roomIds:`, currentStates[target.authContextPath].roomIds);
    console.log(`  /${target.assignmentPath} -> roomIds:`, currentStates[target.assignmentPath].roomIds);
  }

  console.log(`\n--- OPERACIÓN PROPUESTA (IDEMPOTENTE) ---`);
  const updates = {};
  for (const target of TARGETS) {
    const prevAuthRooms = currentStates[target.authContextPath].roomIds || [];
    const prevAssignRooms = currentStates[target.assignmentPath].roomIds || [];

    const newAuthRooms = Array.from(new Set([...prevAuthRooms, 'room-maternal-a']));
    const newAssignRooms = Array.from(new Set([...prevAssignRooms, 'room-maternal-a']));

    updates[target.authContextPath] = { roomIds: newAuthRooms };
    updates[target.assignmentPath] = { roomIds: newAssignRooms };

    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath}:`);
    console.log(`    Antes:  ${JSON.stringify(prevAuthRooms)}`);
    console.log(`    Después: ${JSON.stringify(newAuthRooms)}`);
    console.log(`  /${target.assignmentPath}:`);
    console.log(`    Antes:  ${JSON.stringify(prevAssignRooms)}`);
    console.log(`    Después: ${JSON.stringify(newAssignRooms)}`);
  }

  if (!isExecute) {
    console.log(`\n================================================================`);
    console.log(`[DRY RUN FINALIZADO CON ÉXITO]`);
    console.log(`NINGUNA MUTACIÓN FUE ENVIADA A FIRESTORE LAB.`);
    console.log(`Para ejecutar cuando el MASTER ARB lo autorice:`);
    console.log(`  node scripts/firebase/patchLabMaternalAAuthorization.mjs --execute`);
    console.log(`Para revertir en caso de requerirse:`);
    console.log(`  node scripts/firebase/patchLabMaternalAAuthorization.mjs --rollback`);
    console.log(`================================================================`);
    return;
  }

  console.log(`\n--- APLICANDO MUTACIÓN QUIRÚRGICA ---`);
  for (const [docPath, patch] of Object.entries(updates)) {
    await db.doc(docPath).update(patch);
    console.log(` - Actualizado: /${docPath}`);
  }

  console.log(`\n--- VERIFICACIÓN POST-ACTUALIZACIÓN ---`);
  for (const target of TARGETS) {
    const authSnap = await db.doc(target.authContextPath).get();
    const assignSnap = await db.doc(target.assignmentPath).get();

    const authAfter = authSnap.data();
    const assignAfter = assignSnap.data();

    if (!authAfter.roomIds.includes('room-maternal-a')) {
      throw new Error(`Error de verificación: ${target.authContextPath} no incluye room-maternal-a`);
    }
    if (!assignAfter.roomIds.includes('room-maternal-a')) {
      throw new Error(`Error de verificación: ${target.assignmentPath} no incluye room-maternal-a`);
    }

    // Comprobación de integridad de los demás campos
    const authBefore = currentStates[target.authContextPath];
    const assignBefore = currentStates[target.assignmentPath];

    if (authAfter.authUid !== authBefore.authUid || authAfter.institutionalRole !== authBefore.institutionalRole) {
      throw new Error(`Violación de integridad en ${target.authContextPath}: rol o identidad alterados`);
    }
    if (assignAfter.personId !== assignBefore.personId || assignAfter.role !== assignBefore.role) {
      throw new Error(`Violación de integridad en ${target.assignmentPath}: rol o persona alterados`);
    }
  }

  console.log(`[ÉXITO]: Autorización de Maternal A en LAB completada y verificada con 100% de integridad.`);
}

main().catch((err) => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
