import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  X,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'ADMIN' | 'DELIVERY' | string;
  userName?: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userRole,
  userName,
}: ChangePasswordModalProps) {
  const { token, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Front-end validations
    if (!currentPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الحالية');
      return;
    }

    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 10) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 10 أحرف');
      return;
    }

    if (!confirmPassword.trim()) {
      setError('يرجى تأكيد كلمة المرور الجديدة');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    if (newPassword === currentPassword) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
      return;
    }

    if (!token) {
      setError('يرجى تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);

    try {
      const res = await api.changePassword(
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
        token
      );

      setSuccess(res.message || 'تم حفظ وتغيير كلمة المرور بنجاح ✅');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel =
    (userRole || user?.role) === 'ADMIN'
      ? 'مدير المطعم'
      : (userRole || user?.role) === 'DELIVERY'
      ? 'مسؤول التوصيل'
      : 'المستخدم';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200 text-stone-900"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="إلغاء وإغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 shrink-0 shadow-md">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">تغيير كلمة المرور</h3>
              <p className="text-xs text-stone-400">
                حساب {roleLabel} {userName ? `(${userName})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs text-stone-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>يتم التحقق الأمني وتشفير كلمة المرور الجديدة تلقائيًا عبر bcrypt.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. Current Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              كلمة المرور الحالية <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                required
                disabled={loading || !!success}
                className="w-full pr-10 pl-10 py-2.5 bg-stone-50 border border-stone-300 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                title={showCurrent ? 'إخفاء' : 'إظهار'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2. New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[10px] font-mono ${
                  newPassword.length >= 10
                    ? 'text-emerald-600 font-bold'
                    : newPassword.length > 0
                    ? 'text-amber-600'
                    : 'text-stone-400'
                }`}
              >
                {newPassword.length}/10 أحرف كحد أدنى
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="10 أحرف أو أكثر"
                required
                minLength={10}
                disabled={loading || !!success}
                className={`w-full pr-10 pl-10 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all outline-none ${
                  newPassword && newPassword.length < 10
                    ? 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                    : newPassword.length >= 10
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                title={showNew ? 'إخفاء' : 'إظهار'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              يجب أن تحتوي كلمة المرور على 10 أحرف على الأقل لحماية حسابك.
            </p>
          </div>

          {/* 3. Confirm New Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-700">
                تأكيد كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              {confirmPassword && (
                <span
                  className={`text-[10px] font-bold ${
                    newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {newPassword === confirmPassword ? 'متطابقة ✓' : 'غير متطابقة ✗'}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-stone-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                required
                disabled={loading || !!success}
                className={`w-full pr-10 pl-10 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all outline-none ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : confirmPassword && confirmPassword === newPassword
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                title={showConfirm ? 'إخفاء' : 'إظهار'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {/* حفظ كلمة المرور */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ كلمة المرور</span>
                </>
              )}
            </button>

            {/* إلغاء */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-colors cursor-pointer border border-stone-200"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
