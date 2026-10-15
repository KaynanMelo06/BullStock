import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';

// Direct import of config
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// ============================================================================
// Zero-PII Pseudo-Email & Validation Helpers
// ============================================================================
export const PSEUDO_EMAIL_DOMAIN = '@usuarios.estoque.local';

export function usernameToEmail(username: string): string {
  const normalized = username.trim().toLowerCase();
  return `${normalized}${PSEUDO_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return '';
  if (email.endsWith(PSEUDO_EMAIL_DOMAIN)) {
    return email.slice(0, -PSEUDO_EMAIL_DOMAIN.length);
  }
  return email.split('@')[0];
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3) {
    return { valid: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
  }
  if (normalized.length > 20) {
    return { valid: false, error: 'O nome de usuário deve ter no máximo 20 caracteres.' };
  }
  const regex = /^[a-z0-9._-]+$/;
  if (!regex.test(normalized)) {
    return {
      valid: false,
      error: 'O nome de usuário só pode conter letras minúsculas, números, ponto (.), hífen (-) e underscore (_).',
    };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  return { valid: true };
}

// ============================================================================
// Required Firestore Error Handler (Skill Mandate)
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// Test Connection on Boot (Skill Mandate)
// ============================================================================
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('BullStock: Operando em modo offline (cache persistente ativo).');
    }
  }
}
testConnection();

export async function logoutUser() {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Erro ao sair:', error);
    throw error;
  }
}
