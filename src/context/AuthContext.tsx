import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import {
  auth,
  db,
  usernameToEmail,
  emailToUsername,
  validateUsername,
  validatePassword,
  logoutUser,
  handleFirestoreError,
  OperationType,
} from '../services/firebase';
import { UserDoc, SuperadminsDoc } from '../types';

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  username: string;
  loading: boolean;
  isSuperadmin: boolean;
  superadminUids: string[];
  login: (usernameInput: string, passwordInput: string) => Promise<void>;
  register: (
    usernameInput: string,
    passwordInput: string,
    confirmPasswordInput: string,
    categoryId: string
  ) => Promise<{ uid: string; categoryId: string }>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  // Demo simulation mode for offline/test verification
  isDemoUser: boolean;
  setDemoUser: (demoUsername?: string, isSuper?: boolean) => void;
  claimSuperadmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [superadminUids, setSuperadminUids] = useState<string[]>([]);

  // Listen to config/superadmins
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'superadmins'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SuperadminsDoc;
          const uids = Array.isArray(data.uids) ? data.uids : [];
          setSuperadminUids(uids);
          if (user && uids.includes(user.uid)) {
            setIsSuperadmin(true);
          } else {
            setIsSuperadmin(false);
          }
        } else {
          setSuperadminUids([]);
          setIsSuperadmin(false);
        }
      },
      () => {
        // Non-fatal if offline or rules not configured yet
      }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    // Check saved demo session
    const savedDemo = localStorage.getItem('bullstock_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser({ uid: parsed.uid } as unknown as User);
        setUserDoc(parsed);
        setIsDemoUser(true);
        if (parsed.isSuperadmin) setIsSuperadmin(true);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('bullstock_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsDemoUser(false);
        setUser(currentUser);
        localStorage.removeItem('bullstock_demo_user');

        const derivedUsername = emailToUsername(currentUser.email);

        // Fetch or create user doc with zero PII
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newDoc: UserDoc = {
              uid: currentUser.uid,
              username: derivedUsername || 'usuario',
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newDoc);
            setUserDoc(newDoc);
          } else {
            setUserDoc(userSnap.data() as UserDoc);
          }
        } catch (err) {
          console.warn('BullStock: Perfil em modo local ou sincronização offline:', err);
          setUserDoc({
            uid: currentUser.uid,
            username: derivedUsername || 'usuario',
          });
        }
      } else {
        if (!localStorage.getItem('bullstock_demo_user')) {
          setUser(null);
          setUserDoc(null);
          setIsSuperadmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update superadmin status whenever user or superadminUids changes
  useEffect(() => {
    if (user && superadminUids.includes(user.uid)) {
      setIsSuperadmin(true);
    }
  }, [user, superadminUids]);

  const login = async (usernameInput: string, passwordInput: string) => {
    setLoading(true);
    setAuthError(null);

    const normUsername = usernameInput.trim().toLowerCase();
    const userVal = validateUsername(normUsername);
    if (!userVal.valid) {
      setLoading(false);
      setAuthError(userVal.error || 'Nome de usuário inválido.');
      throw new Error(userVal.error);
    }

    if (!passwordInput) {
      setLoading(false);
      setAuthError('Por favor, informe sua senha.');
      throw new Error('Senha obrigatória.');
    }

    const email = usernameToEmail(normUsername);

    try {
      await signInWithEmailAndPassword(auth, email, passwordInput);
    } catch (err: any) {
      console.error('Falha no login:', err);
      let message = 'Nome de usuário ou senha incorretos.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Nome de usuário ou senha incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas com falha. Aguarde alguns instantes e tente novamente.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Sem conexão de rede. Verifique sua internet.';
      }
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    usernameInput: string,
    passwordInput: string,
    confirmPasswordInput: string,
    categoryId: string
  ) => {
    setLoading(true);
    setAuthError(null);

    const normUsername = usernameInput.trim().toLowerCase();
    const userVal = validateUsername(normUsername);
    if (!userVal.valid) {
      setLoading(false);
      setAuthError(userVal.error || 'Nome de usuário inválido.');
      throw new Error(userVal.error);
    }

    const passVal = validatePassword(passwordInput);
    if (!passVal.valid) {
      setLoading(false);
      setAuthError(passVal.error || 'Senha inválida.');
      throw new Error(passVal.error);
    }

    if (passwordInput !== confirmPasswordInput) {
      setLoading(false);
      setAuthError('As senhas não coincidem. Digite a mesma senha nos dois campos.');
      throw new Error('As senhas não coincidem.');
    }

    if (!categoryId) {
      setLoading(false);
      setAuthError('Selecione uma categoria para solicitar seu acesso.');
      throw new Error('Selecione uma categoria.');
    }

    const email = usernameToEmail(normUsername);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, passwordInput);
      const uid = cred.user.uid;

      // 1. Create user document with ONLY uid, username, createdAt
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        username: normUsername,
        createdAt: serverTimestamp(),
      });

      // 2. Create pending member document in categories/{catId}/members/{uid}
      const memberRef = doc(db, 'categories', categoryId, 'members', uid);
      await setDoc(memberRef, {
        uid,
        username: normUsername,
        role: 'membro',
        status: 'pendente',
        requestedAt: serverTimestamp(),
      });

      setUserDoc({ uid, username: normUsername });
      return { uid, categoryId };
    } catch (err: any) {
      console.error('Falha no cadastro:', err);
      let message = 'Não foi possível concluir o cadastro.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Este nome de usuário já está em uso. Por favor, escolha outro.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha é muito fraca. Utilize no mínimo 8 caracteres.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Sem conexão de rede. Verifique sua internet.';
      }
      setAuthError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('bullstock_demo_user');
      setIsDemoUser(false);
      setUser(null);
      setUserDoc(null);
      setIsSuperadmin(false);
      await logoutUser();
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const setDemoUser = (demoUsername = 'capitao_robo', isSuper = true) => {
    const demoProfile: UserDoc & { isSuperadmin?: boolean } = {
      uid: 'demo-uid-' + demoUsername,
      username: demoUsername,
      createdAt: new Date().toISOString(),
      isSuperadmin: isSuper,
    };

    localStorage.setItem('bullstock_demo_user', JSON.stringify(demoProfile));
    setUser({ uid: demoProfile.uid } as unknown as User);
    setUserDoc(demoProfile);
    setIsDemoUser(true);
    setIsSuperadmin(isSuper);
  };

  const claimSuperadmin = async () => {
    if (!user) throw new Error('Faça login primeiro.');
    try {
      const configRef = doc(db, 'config', 'superadmins');
      const snap = await getDoc(configRef);
      if (!snap.exists() || !(snap.data() as SuperadminsDoc).uids?.length) {
        await setDoc(configRef, { uids: [user.uid] });
        setIsSuperadmin(true);
      } else {
        const current = (snap.data() as SuperadminsDoc).uids || [];
        if (!current.includes(user.uid)) {
          await setDoc(configRef, { uids: [...current, user.uid] });
          setIsSuperadmin(true);
        }
      }
    } catch (err) {
      console.error('Erro ao registrar superadmin:', err);
      handleFirestoreError(err, OperationType.WRITE, 'config/superadmins');
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        username: userDoc?.username || (user?.email ? emailToUsername(user.email) : ''),
        loading,
        isSuperadmin,
        superadminUids,
        login,
        register,
        logout,
        authError,
        clearAuthError,
        isDemoUser,
        setDemoUser,
        claimSuperadmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
