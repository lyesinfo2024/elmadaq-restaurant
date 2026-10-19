import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Lock, Mail, ShieldAlert, CheckCircle2, UserCheck, Shield, KeyRound } from 'lucide-react';
import { soundPlayer } from '../utils/soundEffects.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundPlayer.unlockAudio();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول، يرجى التأكد من البريد وكلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdminCredentials = () => {
    setEmail('admin@elbahdja.dz');
    setPassword('Admin@123456');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-stone-950">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تسجيل دخول لوحة الإدارة</h3>
              <p className="text-xs text-stone-400">بوابة مسير المطعم ومندوب التوصيل</p>
            </div>
          </div>
        </div>

        {/* بطاقة معلومات حساب مدير المطعم */}
        <div className="p-4 bg-amber-50/90 border-b border-amber-200/70">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>معلومات حساب مسير المطعم:</span>
              </div>
              <div className="text-[11px] text-stone-700 font-mono space-y-0.5">
                <div>البريد: <span className="font-bold text-stone-900 select-all">admin@elbahdja.dz</span></div>
                <div>كلمة المرور: <span className="font-bold text-stone-900 select-all">Admin@123456</span> <span className="text-[10px] text-stone-500 font-sans">(أو الجديدة بعد التغيير)</span></div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillAdminCredentials}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>تعبئة تلقائية</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="اسم المستخدم أو البريد الإلكتروني"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full pr-10 pl-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>جاري التحقق والمصادقة...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>تسجيل الدخول إلى النظام</span>
              </span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-center text-[11px] text-stone-400 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>تشفير كلمات المرور عبر Bcrypt وصلاحيات RBAC مخصصة للنظام</span>
        </div>
      </div>
    </div>
  );
}
