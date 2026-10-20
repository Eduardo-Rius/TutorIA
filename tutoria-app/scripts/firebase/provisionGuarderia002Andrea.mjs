import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'crypto';
import { writeFileSync, chmodSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

// Guardería 002 Definitions
const DAYCARE_002_ID = '00000000-0000-4000-8000-000000000002';

const ACCOUNTS = [
  {
    uid: 'lab-g002-asistente',
    email: 'asistente.g002@lab.tutoria.invalid',
    displayName: 'Asistente Educativa (Guardería 002)',
    role: 'TEACHER',
    personId: '10000000-0000-4000-8000-000000000011',
    assignmentId: '20000000-0000-4000-8000-000000000011',
    roomIds: ['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c'],
    roleDescription: 'Asistente Educativa — Planeación semanal y PDA con IA real'
  },
  {
    uid: 'lab-g002-educadora',
    email: 'educadora.g002@lab.tutoria.invalid',
    displayName: 'Educadora (Guardería 002)',
    role: 'DIRECTOR',
    personId: '10000000-0000-4000-8000-000000000012',
    assignmentId: '20000000-0000-4000-8000-000000000012',
    roomIds: ['room-lactantes-a', 'room-lactantes-b', 'room-lactantes-c'],
    roleDescription: 'Educadora — Revisión diaria y retroalimentación'
  },
  {
    uid: 'lab-g002-directora',
    email: 'directora.g002@lab.tutoria.invalid',
    displayName: 'Directora (Guardería 002)',
    role: 'SUPERVISOR',
    personId: '10000000-0000-4000-8000-000000000013',
    assignmentId: '20000000-0000-4000-8000-000000000013',
    roomIds: [],
    roleDescription: 'Directora — Cierre institucional y supervisión final'
  }
];

function generateSecurePassword() {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!#%&*+=?@_';
  const all = uppers + lowers + digits + symbols;

  let pwd = '';
  // Ensure at least 2 of each class
  for (let i = 0; i < 2; i++) {
    pwd += uppers[randomBytes(1)[0] % uppers.length];
    pwd += lowers[randomBytes(1)[0] % lowers.length];
    pwd += digits[randomBytes(1)[0] % digits.length];
    pwd += symbols[randomBytes(1)[0] % symbols.length];
  }
  for (let i = pwd.length; i < 24; i++) {
    pwd += all[randomBytes(1)[0] % all.length];
  }
  return pwd.split('').sort(() => randomBytes(1)[0] - 128).join('');
}

async function main() {
  const isExecute = process.argv.includes('--execute');

  // STRICT FAIL-CLOSED SANITY CHECKS
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== TARGET_PROJECT) {
    console.error(`[CRITICAL ABORT] Mismatched GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT}`);
    process.exit(1);
  }

  console.log(`================================================================`);
  console.log(`PROVISIONAMIENTO CONTROLADO — GUARDERÍA 002 (PILOTO ANDREA)`);
  console.log(`Proyecto Destino: ${TARGET_PROJECT}`);
  console.log(`Modo: ${isExecute ? 'EXECUTE (CREACIÓN EFECTIVA EN LA NUBE)' : 'DRY RUN (SIMULACIÓN)'}`);
  console.log(`================================================================\n`);

  console.log(`Cuentas a aprovisionar (3):`);
  for (const acc of ACCOUNTS) {
    console.log(` - ${acc.displayName}`);
    console.log(`   Email: ${acc.email}`);
    console.log(`   UID: ${acc.uid}`);
    console.log(`   Rol Institucional: ${acc.role}`);
    console.log(`   Daycare: ${DAYCARE_002_ID}`);
    console.log(`   Salas: ${acc.roomIds.length ? acc.roomIds.join(', ') : 'Todas (Directora/Supervisión)'}`);
  }

  // Generate 3 independent random passwords
  const generatedCredentials = ACCOUNTS.map(acc => ({
    ...acc,
    password: generateSecurePassword()
  }));

  if (!isExecute) {
    console.log(`\n[DRY RUN COMPLETADO] Ningún cambio fue realizado en Firebase LAB.`);
    console.log(`Para ejecutar los cambios reales, corra este script con --execute.`);
    return;
  }

  // EXECUTE PHASE
  console.log(`\nIniciando conexión con Firebase Admin...`);
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: TARGET_PROJECT
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Firebase Authentication Upsert
  console.log(`\n[1/3] Aprovisionando usuarios en Firebase Authentication...`);
  for (const cred of generatedCredentials) {
    try {
      await auth.getUser(cred.uid);
      console.log(`  Actualizando contraseña de usuario existente: ${cred.email} (${cred.uid})`);
      await auth.updateUser(cred.uid, {
        email: cred.email,
        displayName: cred.displayName,
        password: cred.password
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`  Creando nuevo usuario: ${cred.email} (${cred.uid})`);
        await auth.createUser({
          uid: cred.uid,
          email: cred.email,
          displayName: cred.displayName,
          password: cred.password
        });
      } else {
        throw err;
      }
    }
  }

  // 2. Firestore Upsert
  console.log(`\n[2/3] Aprovisionando colecciones Firestore (persons, assignments, authorizationContexts)...`);
  const batch = db.batch();

  for (const cred of generatedCredentials) {
    // persons
    const personRef = db.collection('persons').doc(cred.personId);
    batch.set(personRef, {
      name: cred.displayName,
      email: cred.email,
      daycareId: DAYCARE_002_ID,
      createdAt: new Date()
    }, { merge: true });

    // assignments
    const assignmentRef = db.collection('assignments').doc(cred.assignmentId);
    batch.set(assignmentRef, {
      personId: cred.personId,
      role: cred.role,
      daycareId: DAYCARE_002_ID,
      roomIds: cred.roomIds,
      createdAt: new Date()
    }, { merge: true });

    // authorizationContexts
    const authContextRef = db.collection('authorizationContexts').doc(cred.uid);
    batch.set(authContextRef, {
      authUid: cred.uid,
      personId: cred.personId,
      assignmentId: cred.assignmentId,
      institutionalRole: cred.role,
      authorizedDaycareIds: [DAYCARE_002_ID],
      roomIds: cred.roomIds,
      active: true,
      validFrom: new Date(),
      validTo: null
    }, { merge: true });
  }

  console.log(`  Guardando lote en Firestore...`);
  await batch.commit();
  console.log(`  ✓ Colecciones Firestore actualizadas exitosamente.`);

  // 3. Secure Credential File Delivery OUTSIDE Repo
  console.log(`\n[3/3] Guardando credenciales en almacén privado seguro...`);
  const secureDir = join(homedir(), '.tutoria');
  mkdirSync(secureDir, { recursive: true });

  const credFilePath = join(secureDir, 'credentials_guarderia_002.txt');
  const now = new Date().toISOString();

  let fileContent = `=================================================================\n`;
  fileContent += `TUTORIA LAB — CREDENCIALES DE ACCESO: GUARDERÍA 002 (PILOTO ANDREA)\n`;
  fileContent += `Generado: ${now}\n`;
  fileContent += `Entorno: tutoria-identity-lab\n`;
  fileContent += `Daycare ID: ${DAYCARE_002_ID}\n`;
  fileContent += `=================================================================\n\n`;

  for (const cred of generatedCredentials) {
    fileContent += `-----------------------------------------------------------------\n`;
    fileContent += `PERFIL: ${cred.displayName}\n`;
    fileContent += `ROL INTERNO: ${cred.role} (${cred.roleDescription})\n`;
    fileContent += `USUARIO / EMAIL: ${cred.email}\n`;
    fileContent += `CONTRASEÑA: ${cred.password}\n`;
    fileContent += `SALAS ASIGNADAS: ${cred.roomIds.length ? cred.roomIds.join(', ') : 'Todas'}\n`;
    fileContent += `-----------------------------------------------------------------\n\n`;
  }

  fileContent += `AVISO DE SEGURIDAD:\n`;
  fileContent += `- Estas contraseñas fueron generadas con criptografía de alta entropía (24 caracteres).\n`;
  fileContent += `- Este archivo está fuera del repositorio Git y no se subirá a GitHub.\n`;
  fileContent += `- Andrea puede utilizar cualquiera de las 3 cuentas cerrando sesión y volviendo a iniciar.\n`;

  writeFileSync(credFilePath, fileContent, { encoding: 'utf-8', mode: 0o600 });
  chmodSync(credFilePath, 0o600);

  console.log(`  ✓ Archivo seguro de credenciales generado exitosamente.`);
  console.log(`  ✓ Ruta protegida (chmod 600, solo propietario): ${credFilePath}`);
  console.log(`\n[FINALIZADO]: Las 3 cuentas están listas y activas en Firebase LAB.`);
}

main().catch(err => {
  console.error(`\n[ERROR]: Falló el aprovisionamiento:`, err);
  process.exit(1);
});
