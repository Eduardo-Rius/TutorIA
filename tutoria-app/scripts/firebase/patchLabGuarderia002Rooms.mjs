import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

const BACKUP_PATH = resolve(process.cwd(), 'scripts/firebase/backup_SRMD33_G002_before.json');

const ALL_EIGHT_ROOMS = [
  'room-lactantes-a',
  'room-lactantes-b',
  'room-lactantes-c',
  'room-maternal-a',
  'room-maternal-b1',
  'room-maternal-b2',
  'room-maternal-c1',
  'room-maternal-c2',
];

const TARGETS = [
  {
    label: 'Asistente Educativa (Guardería 002 - Andrea)',
    authContextPath: 'authorizationContexts/lab-g002-asistente',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000011',
  },
  {
    label: 'Educadora (Guardería 002 - Andrea)',
    authContextPath: 'authorizationContexts/lab-g002-educadora',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000012',
  },
  {
    label: 'Directora (Guardería 002 - Andrea)',
    authContextPath: 'authorizationContexts/lab-g002-directora',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000013',
  },
];

async function main() {
  const isExecute = process.argv.includes('--execute');
  const isRollback = process.argv.includes('--rollback');

  const projectId = TARGET_PROJECT;
  if (projectId === PROD_PROJECT) {
    console.error(`[CRITICAL ABORT] Intento de ejecución contra proyecto de producción: ${PROD_PROJECT}`);
    process.exit(1);
  }

  console.log(`================================================================`);
  console.log(`MASTER ARB — SR-MD-33 | ASIGNACIÓN 8 SALAS GUARDERÍA 002 EN LAB`);
  console.log(`Proyecto Destino: ${projectId}`);
  console.log(`Modo: ${isRollback ? 'ROLLBACK' : isExecute ? 'EXECUTE (MUTACIÓN EFECTIVA)' : 'DRY RUN (INSPECCIÓN Y PROPUESTA SIN CAMBIOS)'}`);
  console.log(`================================================================\n`);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  const db = getFirestore(app);

  if (isRollback) {
    if (!existsSync(BACKUP_PATH)) {
      throw new Error(`Archivo de respaldo no encontrado en ${BACKUP_PATH}`);
    }
    const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf-8'));
    console.log(`[ROLLBACK]: Restaurando estado previo desde ${BACKUP_PATH}...`);
    for (const [docPath, data] of Object.entries(backup.documents)) {
      await db.doc(docPath).set(data);
      console.log(` - Restaurado: /${docPath}`);
    }
    console.log('[ROLLBACK SUCCESS]: Estado anterior de Guardería 002 restaurado al 100%.');
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
    operation: 'SR-MD-33 Provision 8 rooms for Guarderia 002 accounts',
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

    const newAuthRooms = Array.from(new Set([...prevAuthRooms, ...ALL_EIGHT_ROOMS]));
    const newAssignRooms = Array.from(new Set([...prevAssignRooms, ...ALL_EIGHT_ROOMS]));

    updates[target.authContextPath] = { roomIds: newAuthRooms };
    updates[target.assignmentPath] = { roomIds: newAssignRooms };

    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath} -> ${newAuthRooms.length} salas (agregadas: ${newAuthRooms.filter(r => !prevAuthRooms.includes(r)).join(', ') || 'ninguna'})`);
    console.log(`  /${target.assignmentPath} -> ${newAssignRooms.length} salas (agregadas: ${newAssignRooms.filter(r => !prevAssignRooms.includes(r)).join(', ') || 'ninguna'})`);
  }

  if (!isExecute) {
    console.log(`\n[DRY RUN FINALIZADO]: NO SE REALIZÓ NINGUNA MUTACIÓN EN FIRESTORE.`);
    console.log(`Para aplicar los cambios cuando el MASTER ARB lo autorice explícitamente, ejecutar:`);
    console.log(`node scripts/firebase/patchLabGuarderia002Rooms.mjs --execute\n`);
    return;
  }

  console.log(`\n[APLICANDO CAMBIOS EN FIRESTORE LAB]...`);
  for (const [docPath, patch] of Object.entries(updates)) {
    await db.doc(docPath).update(patch);
    console.log(` - Actualizado: /${docPath}`);
  }

  console.log(`\n[VERIFICACIÓN POST-EJECUCIÓN]...`);
  for (const target of TARGETS) {
    const authPost = await db.doc(target.authContextPath).get();
    const assignPost = await db.doc(target.assignmentPath).get();
    console.log(`* ${target.label}:`);
    console.log(`  /${target.authContextPath} roomIds count: ${authPost.data().roomIds?.length}`);
    console.log(`  /${target.assignmentPath} roomIds count: ${assignPost.data().roomIds?.length}`);
  }

  console.log(`\n[ÉXITO]: Las ocho salas fueron asignadas idempotentemente a las tres cuentas de Guardería 002.`);
}

main().catch(err => {
  console.error('[ERROR]:', err);
  process.exit(1);
});
