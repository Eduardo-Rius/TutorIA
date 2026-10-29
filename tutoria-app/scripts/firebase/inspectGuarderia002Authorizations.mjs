import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

const ACCOUNTS_G002 = [
  {
    role: 'Asistente Educativa (G002)',
    uid: 'lab-g002-asistente',
    email: 'asistente.g002@lab.tutoria.invalid',
    authContextPath: 'authorizationContexts/lab-g002-asistente',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000011',
  },
  {
    role: 'Educadora (G002)',
    uid: 'lab-g002-educadora',
    email: 'educadora.g002@lab.tutoria.invalid',
    authContextPath: 'authorizationContexts/lab-g002-educadora',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000012',
  },
  {
    role: 'Directora (G002)',
    uid: 'lab-g002-directora',
    email: 'directora.g002@lab.tutoria.invalid',
    authContextPath: 'authorizationContexts/lab-g002-directora',
    assignmentPath: 'assignments/20000000-0000-4000-8000-000000000013',
  },
];

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

async function inspect() {
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== TARGET_PROJECT) {
    console.error(`[CRITICAL ABORT] Unexpected project: ${process.env.GCLOUD_PROJECT}`);
    process.exit(1);
  }

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: TARGET_PROJECT,
  });
  const db = getFirestore(app);

  console.log('================================================================');
  console.log('INSPECCIÓN EN MODO LECTURA — ASIGNACIONES SALAS GUARDERÍA 002');
  console.log(`Proyecto: ${TARGET_PROJECT}`);
  console.log('================================================================\n');

  for (const acc of ACCOUNTS_G002) {
    console.log(`\n--- ${acc.role} (${acc.email}) ---`);
    const authSnap = await db.doc(acc.authContextPath).get();
    const assignSnap = await db.doc(acc.assignmentPath).get();

    if (!authSnap.exists) {
      console.log(`  [ALERTA] ${acc.authContextPath} NO EXISTE en Firestore.`);
    } else {
      const authData = authSnap.data();
      const authRooms = authData.roomIds || [];
      console.log(`  ${acc.authContextPath}:`);
      console.log(`    daycareId: ${authData.daycareId}`);
      console.log(`    role: ${authData.role}`);
      console.log(`    roomIds (${authRooms.length}):`, authRooms);
      
      const missingInAuth = ALL_EIGHT_ROOMS.filter(r => !authRooms.includes(r));
      if (missingInAuth.length > 0) {
        console.log(`    -> Salas faltantes en authorizationContext:`, missingInAuth);
      } else {
        console.log(`    -> Contiene las 8 salas completas.`);
      }
    }

    if (!assignSnap.exists) {
      console.log(`  [ALERTA] ${acc.assignmentPath} NO EXISTE en Firestore.`);
    } else {
      const assignData = assignSnap.data();
      const assignRooms = assignData.roomIds || [];
      console.log(`  ${acc.assignmentPath}:`);
      console.log(`    daycareId: ${assignData.daycareId}`);
      console.log(`    role: ${assignData.role}`);
      console.log(`    roomIds (${assignRooms.length}):`, assignRooms);

      const missingInAssign = ALL_EIGHT_ROOMS.filter(r => !assignRooms.includes(r));
      if (missingInAssign.length > 0) {
        console.log(`    -> Salas faltantes en assignment:`, missingInAssign);
      } else {
        console.log(`    -> Contiene las 8 salas completas.`);
      }
    }
  }

  // Also inspect Cloud Function proposeWeeklyPlanning authorization map if exists
  console.log('\n================================================================');
  console.log('INSPECCIÓN DE GUARDERÍA 001 (ANITA) PARA COMPARACIÓN:');
  const anitaAuth = await db.doc('authorizationContexts/lab-teacher-anita').get();
  if (anitaAuth.exists) {
    console.log('  Anita roomIds:', anitaAuth.data().roomIds);
  }
}

inspect().catch(err => {
  console.error('Error during inspection:', err);
  process.exit(1);
});
