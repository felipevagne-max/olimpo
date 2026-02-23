import { useEffect, useRef, useState } from 'react';
import { Mail, Lock, ArrowRight, Code2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Session helpers - no Base44 auth dependency
export const SESSION_KEY = 'olimpo_session';
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function Auth() {
  const canvasRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // First access flow
  const [step, setStep] = useState('login'); // 'login' | 'change_password' | 'forgot_password' | 'reset_password'
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  // Check for reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      setResetToken(token);
      setStep('reset_password');
    }
  }, []);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
      ctx.font = fontSize + 'px JetBrains Mono, monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 50);
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      // Validate against Supabase (check subscription + password)
      const { data } = await base44.functions.invoke('loginWithSupabase', { email, password });

      if (!data.success) {
        toast.error(data.error || 'Erro ao fazer login');
        setLoading(false);
        return;
      }

      // Clear all previous session data first
      localStorage.clear();
      
      // Store session locally - no Base44 auth needed
      setSession({
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        session_token: data.session_token,
        logged_in_at: Date.now()
      });

      if (data.is_first_login) {
        setPendingEmail(email);
        setPendingUserId(data.user_id);
        setStep('change_password');
        setLoading(false);
        return;
      }

      window.location.href = '/App';

    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao fazer login';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      // Update password in Supabase and mark is_first_login = false
      const { data } = await base44.functions.invoke('changePassword', {
        userId: pendingUserId,
        newPassword
      });

      if (!data.success) {
        toast.error('Erro ao salvar senha');
        setSavingPassword(false);
        return;
      }

      toast.success('Senha criada! Bem-vindo ao Olimpo!');
      setTimeout(() => { window.location.href = '/App'; }, 1000);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar senha');
      setSavingPassword(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Digite seu email');
      return;
    }

    setSendingReset(true);
    try {
      const { data } = await base44.functions.invoke('sendPasswordReset', {
        email: forgotPasswordEmail
      });

      if (data.success) {
        toast.success('Email de reset enviado! Verifique sua caixa de entrada');
        setForgotPasswordEmail('');
        setStep('login');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao enviar email');
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await base44.functions.invoke('resetPassword', {
        token: resetToken,
        newPassword
      });

      if (!data.success) {
        toast.error('Erro ao redefinir senha');
        setSavingPassword(false);
        return;
      }

      toast.success('Senha redefinida com sucesso! Você será redirecionado para o login');
      setTimeout(() => {
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setStep('login');
        window.history.replaceState({}, document.title, '/Auth');
      }, 1000);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao redefinir senha');
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] relative overflow-hidden flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ filter: 'blur(0.5px)' }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0, 255, 102, 0.04), transparent)', filter: 'blur(40px)' }}
      />

      <>
      {step === 'forgot_password' && (
        <div className="relative z-10 w-full max-w-md animate-fadeSlideUp">
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl font-bold text-[#00FF66] tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 30px rgba(0, 255, 102, 0.3)' }}>
              OLIMPO
            </h1>
          </div>
          <div className="bg-[#0B0B10] rounded-2xl p-8 border border-[rgba(0,255,102,0.18)]" style={{ boxShadow: '0 0 40px rgba(0, 255, 102, 0.08)' }}>
            <h2 className="text-2xl font-semibold text-white mb-2">Recuperar Senha</h2>
            <p className="text-white/60 text-sm mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-white/90 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-[#050508] text-white px-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none placeholder:text-white/30"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,102,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                type="submit"
                disabled={sendingReset}
                className="w-full bg-[#00FF66] hover:bg-[#00E676] text-black font-semibold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ boxShadow: '0 0 20px rgba(0, 255, 102, 0.25)' }}
              >
                {sendingReset ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Link de Reset'}
              </button>
              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-[#00FF66] hover:text-[#00DD55] text-sm transition-colors py-2"
              >
                Voltar ao Login
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'reset_password' && (
        <div className="relative z-10 w-full max-w-md animate-fadeSlideUp">
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl font-bold text-[#00FF66] tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 30px rgba(0, 255, 102, 0.3)' }}>
              OLIMPO
            </h1>
          </div>
          <div className="bg-[#0B0B10] rounded-2xl p-8 border border-[rgba(0,255,102,0.18)]" style={{ boxShadow: '0 0 40px rgba(0, 255, 102, 0.08)' }}>
            <h2 className="text-2xl font-semibold text-white mb-2">Nova Senha</h2>
            <p className="text-white/60 text-sm mb-6">Defina uma nova senha para sua conta.</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-white/90 text-sm mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-[#050508] text-white px-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none placeholder:text-white/30"
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,102,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00FF66]/50 hover:text-[#00FF66]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/90 text-sm mb-2">Confirmar Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="w-full bg-[#050508] text-white px-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none placeholder:text-white/30"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,102,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-[#00FF66] hover:bg-[#00E676] text-black font-semibold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ boxShadow: '0 0 20px rgba(0, 255, 102, 0.25)' }}
              >
                {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'change_password' && (
        <div className="relative z-10 w-full max-w-md animate-fadeSlideUp">
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-4xl font-bold text-[#00FF66] tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 30px rgba(0, 255, 102, 0.3)' }}>
              OLIMPO
            </h1>
          </div>
          <div className="bg-[#0B0B10] rounded-2xl p-8 border border-[rgba(0,255,102,0.18)]" style={{ boxShadow: '0 0 40px rgba(0, 255, 102, 0.08)' }}>
            <h2 className="text-2xl font-semibold text-white mb-2">Crie sua senha</h2>
            <p className="text-white/60 text-sm mb-6">Primeiro acesso detectado. Defina sua senha definitiva.</p>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-white/90 text-sm mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-[#050508] text-white px-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none placeholder:text-white/30"
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,102,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00FF66]/50 hover:text-[#00FF66]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/90 text-sm mb-2">Confirmar Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="w-full bg-[#050508] text-white px-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none placeholder:text-white/30"
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,102,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,102,0.18)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-[#00FF66] hover:bg-[#00E676] text-black font-semibold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ boxShadow: '0 0 20px rgba(0, 255, 102, 0.25)' }}
              >
                {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'login' && <div className="relative z-10 w-full max-w-md animate-fadeSlideUp">
        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <div
            className="w-16 h-16 rounded-full bg-[#0B0B10] border border-[rgba(0,255,102,0.3)] flex items-center justify-center mb-4 relative"
            style={{ boxShadow: '0 0 20px rgba(0, 255, 102, 0.15)' }}
          >
            <Code2 className="w-8 h-8 text-[#00FF66]" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(0, 255, 102, 0.1), transparent)' }} />
          </div>
          <h1
            className="text-4xl font-bold text-[#00FF66] tracking-tight"
            style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 30px rgba(0, 255, 102, 0.3)' }}
          >
            OLIMPO
          </h1>
        </div>

        {/* Card */}
        <div
          className="bg-[#0B0B10] rounded-2xl p-8 border border-[rgba(0,255,102,0.18)] relative overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(0, 255, 102, 0.08)' }}
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0, 255, 102, 0.08), transparent)', filter: 'blur(30px)' }} />

          <div className="relative">
            <h2 className="text-2xl font-semibold text-white mb-2">Acesse sua conta</h2>
            <p className="text-white/70 text-sm mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              Use o email e a senha cadastrados no Olimpo
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-white/90 text-sm mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00FF66]/50 transition-colors duration-200 group-focus-within:text-[#00FF66]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-[#050508] text-white pl-12 pr-4 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none transition-all duration-200 placeholder:text-white/30"
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0, 255, 102, 0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 102, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 255, 102, 0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-white/90 text-sm mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00FF66]/50 transition-colors duration-200 group-focus-within:text-[#00FF66]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full bg-[#050508] text-white pl-12 pr-12 py-3.5 rounded-lg border border-[rgba(0,255,102,0.18)] outline-none transition-all duration-200 placeholder:text-white/30"
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0, 255, 102, 0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 102, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 255, 102, 0.18)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00FF66]/50 hover:text-[#00FF66]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00FF66] hover:bg-[#00E676] active:bg-[#19FF7A] text-black font-semibold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 0 20px rgba(0, 255, 102, 0.25)' }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-150 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="text-white/50 text-xs text-center mt-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Apenas usuários com assinatura ativa podem acessar
            </p>

            <button
              type="button"
              onClick={() => {
                setEmail('');
                setPassword('');
                setStep('forgot_password');
              }}
              className="w-full mt-3 text-[#00FF66] hover:text-[#00DD55] text-xs transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/40 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Sistema protegido • Acesso via Cakto
          </p>
        </div>
      </div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeSlideUp { animation: fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        input:focus-visible { outline: none; }
      `}</style>
      </>
    </div>
  );
}