import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // TODO: Insert env variables
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain",
  projectId: "mock-project-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
