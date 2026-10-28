import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

const BACKUP_PATH = resolve(process.cwd(), 'scripts/firebase/backup_SRMD30_before.json');

const TARGETS = [
  {
    label: 'Anita (Asistente Educativa Guardería 001)',
    authContextPath: 'authorizationContexts/lab-teacher-anita',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000001',
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
  console.log(`MASTER ARB — SR-MD-30 | AUTORIZACIÓN MATERNAL B2 EN LAB`);
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
    operation: 'SR-MD-30 Add room-maternal-b2',
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

    const newAuthRooms = Array.from(new Set([...prevAuthRooms, 'room-maternal-b2']));
    const newAssignRooms = Array.from(new Set([...prevAssignRooms, 'room-maternal-b2']));

    updates[target.authContextPath] = { roomIds: newAuthRooms };
    updates[target.assignmentPath] = { roomIds: newAssignRooms };

    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath} -> nuevo roomIds:`, newAuthRooms);
    console.log(`  /${target.assignmentPath} -> nuevo roomIds:`, newAssignRooms);
  }

  if (!isExecute) {
    console.log(`\n[DRY RUN FINALIZADO]: No se aplicaron cambios en la base de datos.`);
    console.log(`Para ejecutar la mutación efectiva una vez autorizado por MASTER ARB, ejecutar:`);
    console.log(`node scripts/firebase/patchLabMaternalB2Authorization.mjs --execute\n`);
    return;
  }

  // 4. Aplicación de cambios (si --execute)
  console.log(`\n[APLICANDO CAMBIOS EN LAB]...`);
  for (const [docPath, patch] of Object.entries(updates)) {
    await db.doc(docPath).update(patch);
    console.log(` - Actualizado: /${docPath}`);
  }

  // 5. Verificación post-mutación
  console.log(`\n--- VERIFICACIÓN POST-MUTACIÓN ---`);
  for (const target of TARGETS) {
    const freshAuth = (await db.doc(target.authContextPath).get()).data();
    const freshAssign = (await db.doc(target.assignmentPath).get()).data();

    const authOk = freshAuth.roomIds.includes('room-maternal-b2');
    const assignOk = freshAssign.roomIds.includes('room-maternal-b2');

    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath} -> room-maternal-b2 presente: ${authOk ? 'SÍ [OK]' : 'NO [FALLO]'}`);
    console.log(`  /${target.assignmentPath} -> room-maternal-b2 presente: ${assignOk ? 'SÍ [OK]' : 'NO [FALLO]'}`);

    if (!authOk || !assignOk) {
      throw new Error(`Verificación fallida para ${target.label}`);
    }
  }

  console.log(`\n[ÉXITO]: Autorización de Maternal B2 para Anita completada correctamente.`);
}

main().catch((err) => {
  console.error(`\n[ERROR]: ${err.message}`);
  process.exit(1);
});
