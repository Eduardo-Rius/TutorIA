import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse CLI flags inside provision for testability

const TARGET_PROJECT = 'tutoria-identity-lab';
const PROD_PROJECT = 'guarderiasimss-5cb09';

// 1. Fail-closed guards
const getProjectId = () => {
    // Attempt to get from environment first
    if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
    if (process.env.FIREBASE_CONFIG) {
        try {
            const config = JSON.parse(process.env.FIREBASE_CONFIG);
            if (config.projectId) return config.projectId;
        } catch (e) {}
    }

    try {
        const creds = applicationDefault();
        if (creds && creds.projectId) return creds.projectId;
    } catch (e) {}

    // Fallback if we cannot reliably determine
    return process.env.GCLOUD_PROJECT || 'undefined';
};

// We will explicitly pass GCLOUD_PROJECT=tutoria-identity-lab when running this script to ensure safety.

// 2. Admin SDK will be initialized only during --execute

// 3. Fixtures
export const DAYCARES = [
    {
        id: '00000000-0000-4000-8000-000000000001',
        data: {
            daycareNumber: 'TUTORIA-LAB-001',
            daycareName: 'Guardería Laboratorio TutorIA Norte'
        }
    },
    {
        id: '00000000-0000-4000-8000-000000000002',
        data: {
            daycareNumber: 'TUTORIA-LAB-002',
            daycareName: 'Guardería Laboratorio TutorIA Sur'
        }
    }
];

export const PERSONS = [
    { id: '10000000-0000-4000-8000-000000000001', data: { name: 'Anita López' } },
    { id: '10000000-0000-4000-8000-000000000002', data: { name: 'Laura Martínez' } },
    { id: '10000000-0000-4000-8000-000000000003', data: { name: 'Ceci Demo' } },
    { id: '10000000-0000-4000-8000-000000000004', data: { name: 'Tere Demo' } }
];

export const ASSIGNMENTS = [
    {
        id: '20000000-0000-4000-8000-000000000001',
        data: {
            personId: '10000000-0000-4000-8000-000000000001',
            role: 'TEACHER',
            daycareId: '00000000-0000-4000-8000-000000000001',
            roomIds: ['room-lactantes-a', 'room-lactantes-b']
        }
    },
    {
        id: '20000000-0000-4000-8000-000000000002',
        data: {
            personId: '10000000-0000-4000-8000-000000000002',
            role: 'TEACHER',
            daycareId: '00000000-0000-4000-8000-000000000002',
            roomIds: ['room-maternal-a']
        }
    },
    {
        id: '20000000-0000-4000-8000-000000000003',
        data: {
            personId: '10000000-0000-4000-8000-000000000003',
            role: 'DIRECTOR',
            daycareId: '00000000-0000-4000-8000-000000000001',
            roomIds: []
        }
    },
    {
        id: '20000000-0000-4000-8000-000000000004',
        data: {
            personId: '10000000-0000-4000-8000-000000000004',
            role: 'SUPERVISOR',
            daycareId: '00000000-0000-4000-8000-000000000001',
            roomIds: []
        }
    }
];

export const AUTH_USERS = [
    {
        uid: 'lab-teacher-anita',
        email: 'anita@lab.tutoria.invalid',
        displayName: 'Anita López'
    },
    {
        uid: 'lab-teacher-laura',
        email: 'laura@lab.tutoria.invalid',
        displayName: 'Laura Martínez'
    },
    {
        uid: 'lab-director-ceci',
        email: 'ceci@lab.tutoria.invalid',
        displayName: 'Ceci Demo'
    },
    {
        uid: 'lab-supervisor-tere',
        email: 'tere@lab.tutoria.invalid',
        displayName: 'Tere Demo'
    }
];

export const AUTHORIZATION_CONTEXTS = [
    {
        id: 'lab-teacher-anita',
        data: {
            authUid: 'lab-teacher-anita',
            personId: '10000000-0000-4000-8000-000000000001',
            assignmentId: '20000000-0000-4000-8000-000000000001',
            institutionalRole: 'TEACHER',
            authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
            roomIds: ['room-lactantes-a', 'room-lactantes-b'],
            active: true,
            validFrom: new Date(),
            validTo: null
        }
    },
    {
        id: 'lab-teacher-laura',
        data: {
            authUid: 'lab-teacher-laura',
            personId: '10000000-0000-4000-8000-000000000002',
            assignmentId: '20000000-0000-4000-8000-000000000002',
            institutionalRole: 'TEACHER',
            authorizedDaycareIds: ['00000000-0000-4000-8000-000000000002'],
            roomIds: ['room-maternal-a'],
            active: true,
            validFrom: new Date(),
            validTo: null
        }
    },
    {
        id: 'lab-director-ceci',
        data: {
            authUid: 'lab-director-ceci',
            personId: '10000000-0000-4000-8000-000000000003',
            assignmentId: '20000000-0000-4000-8000-000000000003',
            institutionalRole: 'DIRECTOR',
            authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
            roomIds: [],
            active: true,
            validFrom: new Date(),
            validTo: null
        }
    },
    {
        id: 'lab-supervisor-tere',
        data: {
            authUid: 'lab-supervisor-tere',
            personId: '10000000-0000-4000-8000-000000000004',
            assignmentId: '20000000-0000-4000-8000-000000000004',
            institutionalRole: 'SUPERVISOR',
            authorizedDaycareIds: [
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002'
            ],
            roomIds: [],
            active: true,
            validFrom: new Date(),
            validTo: null
        }
    }
];

export async function provision() {
    const isExecute = process.argv.includes('--execute');
    const projectId = getProjectId();

    if (projectId === PROD_PROJECT) {
        console.error(`[HIGH SEVERITY] ABORT: Attempted to run against production project: ${PROD_PROJECT}`);
        process.exit(1);
    }

    if (projectId !== TARGET_PROJECT) {
        console.error(`[ERROR] ABORT: Project ID must be exactly ${TARGET_PROJECT}. Found: ${projectId}`);
        process.exit(1);
    }

    console.log(`[TARGET PROJECT]: ${projectId}`);
    console.log(`[MODE]: ${isExecute ? 'EXECUTE (REAL MUTATION)' : 'DRY RUN — NO CLOUD MUTATIONS WILL OCCUR'}`);

    console.log(`\n--- Planning ---`);
    console.log(`Auth users planned: ${AUTH_USERS.length}`);
    console.log(`Daycares planned: ${DAYCARES.length}`);
    console.log(`Persons planned: ${PERSONS.length}`);
    console.log(`Assignments planned: ${ASSIGNMENTS.length}`);
    console.log(`AuthorizationContexts planned: ${AUTHORIZATION_CONTEXTS.length}`);

    // Detail printing
    for (const d of DAYCARES) {
        console.log(`[PLAN Daycare] ${d.id} -> ${d.data.daycareNumber}`);
    }
    for (const p of PERSONS) {
        console.log(`[PLAN Person] ${p.id} -> ${p.data.name}`);
    }
    for (const a of ASSIGNMENTS) {
        console.log(`[PLAN Assignment] ${a.id} -> Person ${a.data.personId} / Role ${a.data.role} / Daycare ${a.data.daycareId}`);
    }
    for (const c of AUTHORIZATION_CONTEXTS) {
        console.log(`[PLAN AuthContext] ${c.id} -> Uid ${c.data.authUid} / Role ${c.data.institutionalRole} / Scope ${c.data.authorizedDaycareIds.join(',')}`);
    }

    if (!isExecute) {
        console.log(`\nDRY RUN — NO CLOUD MUTATIONS WILL OCCUR`);
        return;
    }

    if (!process.env.FIXTURE_PASSWORD) {
        console.error('[ERROR] ABORT: --execute requires FIXTURE_PASSWORD environment variable to be set.');
        process.exit(1);
    }

    let app;
    try {
        app = initializeApp({
            credential: applicationDefault(),
            projectId: TARGET_PROJECT
        });
    } catch (e) {
        console.error(`[ERROR] Failed to initialize Firebase Admin: ${e.message}`);
        process.exit(1);
    }

    const db = getFirestore(app);
    const auth = getAuth(app);

    // Execute Auth Upsert
    console.log('\n--- Upserting Auth Users ---');
    for (const u of AUTH_USERS) {
        try {
            await auth.getUser(u.uid);
            console.log(`Updating Auth User: ${u.uid}`);
            await auth.updateUser(u.uid, {
                email: u.email,
                displayName: u.displayName,
                password: process.env.FIXTURE_PASSWORD
            });
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating Auth User: ${u.uid}`);
                await auth.createUser({
                    ...u,
                    password: process.env.FIXTURE_PASSWORD
                });
            } else {
                console.error(`Failed to upsert Auth User ${u.uid}:`, error);
                process.exit(1);
            }
        }
    }

    // Execute Firestore Upsert
    console.log('\n--- Upserting Firestore Documents ---');
    const batch = db.batch();

    for (const d of DAYCARES) {
        const ref = db.collection('daycares').doc(d.id);
        batch.set(ref, d.data, { merge: true });
    }

    for (const p of PERSONS) {
        const ref = db.collection('persons').doc(p.id);
        batch.set(ref, p.data, { merge: true });
    }

    for (const a of ASSIGNMENTS) {
        const ref = db.collection('assignments').doc(a.id);
        batch.set(ref, a.data, { merge: true });
    }

    for (const c of AUTHORIZATION_CONTEXTS) {
        const ref = db.collection('authorizationContexts').doc(c.id);
        batch.set(ref, c.data, { merge: true });
    }

    console.log('Committing Firestore batch...');
    await batch.commit();
    console.log('Done.');
}

// Support direct execution vs import
if (import.meta.url === `file://${process.argv[1]}`) {
    provision().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
