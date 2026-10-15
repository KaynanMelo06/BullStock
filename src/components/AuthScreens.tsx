import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCategory } from '../context/CategoryContext';
import { Shield, Lock, User as UserIcon, AlertCircle, ArrowRight, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export const AuthScreens: React.FC = () => {
  const { login, register, authError, clearAuthError, setDemoUser } = useAuth();
  const { categories } = useCategory();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCategory, setRegCategory] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Set default category when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !regCategory) {
      setRegCategory(categories[0].id);
    }
  }, [categories, regCategory]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err: any) {
      setClientError(err.message || 'Erro ao entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    clearAuthError();

    if (!regCategory) {
      setClientError('Selecione uma categoria para solicitar seu acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(regUsername, regPassword, regConfirmPassword, regCategory);
    } catch (err: any) {
      setClientError(err.message || 'Erro no cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = clientError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bull-bg text-bull-text transition-colors">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full">
        {/* BullStock Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-bull-surface border-2 border-bull-primary/40 flex items-center justify-center p-2 shadow-2xl shadow-black/40">
              <img
                src="/logo.svg"
                alt="BullStock Logo"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-bull-primary text-bull-on-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
              Robotics
            </div>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight flex items-center gap-1">
            <span className="text-bull-primary">Bull</span>
            <span className="text-white">Stock</span>
          </h1>
          <p className="mt-1 text-xs text-bull-text-muted text-center max-w-xs">
            Inventários e listas de compras compartilhadas em tempo real para equipes de robótica.
          </p>
        </div>

        {/* Tab Switcher: Entrar / Cadastrar */}
        <div className="w-full grid grid-cols-2 p-1 rounded-2xl bg-bull-surface border border-bull-border mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setClientError(null);
              clearAuthError();
            }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
              mode === 'login'
                ? 'bg-bull-primary text-bull-on-primary shadow-md'
                : 'text-bull-text-muted hover:text-bull-text'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setClientError(null);
              clearAuthError();
            }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
              mode === 'register'
                ? 'bg-bull-primary text-bull-on-primary shadow-md'
                : 'text-bull-text-muted hover:text-bull-text'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-bull-surface border border-bull-alert text-xs text-bull-alert flex items-start justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-bull-alert" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => {
                setClientError(null);
                clearAuthError();
              }}
              className="text-bull-alert hover:opacity-80 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Card Container */}
        <div className="w-full bg-bull-surface border border-bull-border rounded-3xl p-6 shadow-2xl">
          {mode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1.5">
                  Nome de Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value.toLowerCase())}
                    placeholder="ex.: lucas_robo"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/40 text-sm focus:outline-none focus:border-bull-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/40 text-sm focus:outline-none focus:border-bull-primary transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-bull-primary hover:brightness-110 active:scale-[0.98] text-bull-on-primary font-black text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Acessando...</span>
                ) : (
                  <>
                    <span>Entrar no BullStock</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Prominent Password Warning Mandate */}
              <div className="p-3 rounded-xl bg-bull-surface-elevated border border-bull-primary/30 flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-bull-primary shrink-0 mt-0.5" />
                <p className="text-xs text-bull-text font-semibold leading-relaxed">
                  ⚠️ <strong className="text-bull-primary">Não há recuperação de senha.</strong> Guarde-a com cuidado. Não coletamos e-mail nem dados pessoais.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Nome de Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="letras, números, . - _ (3 a 20)"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/40 text-sm focus:outline-none focus:border-bull-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Senha (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/40 text-sm focus:outline-none focus:border-bull-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Confirmação de Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text placeholder:text-bull-text-muted/40 text-sm focus:outline-none focus:border-bull-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-bull-text-muted mb-1">
                  Categoria Inicial para Solicitar Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-bull-primary">
                    <Layers className="w-4 h-4" />
                  </div>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-bull-surface-elevated border border-bull-border text-bull-text text-sm focus:outline-none focus:border-bull-primary transition cursor-pointer"
                  >
                    {categories.length === 0 ? (
                      <option value="">Carregando categorias...</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-bull-text-muted">
                  Ao criar a conta, seu pedido de entrada será enviado ao capitão desta categoria.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-bull-primary hover:brightness-110 active:scale-[0.98] text-bull-on-primary font-black text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Criando conta e solicitando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cadastrar e Solicitar Acesso</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Mode for Instant Testing */}
          <div className="mt-5 pt-4 border-t border-bull-border/50 text-center">
            <button
              type="button"
              onClick={() => setDemoUser('capitao_robo', true)}
              className="text-xs font-bold text-bull-primary hover:underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-bull-primary" />
              <span>Entrar como Demonstração (Capitão da Robótica)</span>
            </button>
          </div>
        </div>

        {/* Zero PII Guarantee Banner */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-bull-text-muted">
          <Shield className="w-3.5 h-3.5 text-bull-primary" />
          <span>Privacidade Total: Sem coleta de dados pessoais ou e-mails reais.</span>
        </div>
      </div>

      <footer className="py-4 text-center text-[11px] text-bull-text-muted">
        BullStock • Robótica e Equipes • PWA Instalável
      </footer>
    </div>
  );
};
