import { useState, type FormEvent } from 'react';
import { adminSignIn, isFirebaseConfigured, isKeepLogged } from '../lib/firebase';

interface AdminLoginProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal secreto de login do admin (aberto ao segurar "G" por 10s).
 * Glassmorphism escuro, integrado ao Firebase Auth.
 */
export function AdminLogin({ onClose, onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(isKeepLogged());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // autentica sempre com quem está digitando agora e respeita o "manter conectado".
      await adminSignIn(email, password, keep);
      onSuccess();
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code.includes('invalid-credential') || code.includes('wrong-password')) {
        setError('Credenciais inválidas.');
      } else if (code.includes('too-many-requests')) {
        setError('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel w-full max-w-sm rounded-2xl p-8">
        <div className="mb-1 font-mono text-[10px] tracking-[0.4em] text-neon-cyan uppercase">
          Restricted
        </div>
        <h2 className="font-display mb-6 text-3xl font-bold tracking-wide text-white uppercase">
          Admin Access
        </h2>

        {!isFirebaseConfigured && (
          <p className="mb-5 rounded-lg border border-neon-violet/30 bg-neon-violet/10 p-3 font-mono text-[11px] leading-relaxed text-white/70">
            Firebase ainda não configurado. Preencha as credenciais em{' '}
            <code className="text-neon-cyan">src/lib/firebase.ts</code>.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-white/50 uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60"
              placeholder="admin@nexusholding.studio"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-white/50 uppercase">
              Senha
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-neon-cyan/60"
              placeholder="••••••••"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
              className="h-4 w-4 accent-neon-cyan"
            />
            <span className="font-mono text-[11px] tracking-[0.06em] text-white/65">
              Manter-me conectado neste dispositivo
            </span>
          </label>

          {error && (
            <p className="font-mono text-[11px] text-neon-magenta">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="pill-button mt-2 justify-center disabled:opacity-40"
          >
            {loading ? 'Autenticando…' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-5 w-full text-center font-mono text-[10px] tracking-[0.3em] text-white/35 uppercase transition-colors hover:text-white/70"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
