import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/ui/Button';
import { resetPassword } from '../../api/auth.api';

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

const resetSchema = z
  .object({
    password: passwordPolicy,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const watchedPassword = watch('password', '');

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Weak', percent: 33, color: 'bg-rose-500' };
    if (score <= 4) return { label: 'Medium', percent: 66, color: 'bg-amber-500' };
    return { label: 'Strong', percent: 100, color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(watchedPassword);

  const onSubmit = async (values) => {
    setApiError('');
    try {
      await resetPassword(token, values);
      setIsSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setApiError(
        err.response?.data?.message || 'Password reset link is invalid or has expired.'
      );
    }
  };

  return (
    <AuthLayout
      heading="Set a New Password"
      subheading="Create a strong, secure password for your MediBridge account"
    >
      {/* Expired / Invalid Token Banner */}
      {apiError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{apiError}</p>
            <Link
              to="/forgot-password"
              className="mt-1.5 inline-block text-primary-700 font-bold hover:underline"
            >
              Request a new password reset link →
            </Link>
          </div>
        </div>
      )}

      {isSuccess ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-base font-heading font-bold text-text-heading">
            Password Reset Complete!
          </h4>
          <p className="text-xs text-text-muted">
            Redirecting to sign-in page with your updated credentials...
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="primary" size="md">
                Sign In Now
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Min 8 characters"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                  errors.password ? 'border-rose-400' : 'border-slate-200 hover:border-primary-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-heading"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Strength Meter */}
          {watchedPassword && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Strength:</span>
                <span className="font-bold text-text-heading">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Re-enter new password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                  errors.confirmPassword
                    ? 'border-rose-400'
                    : 'border-slate-200 hover:border-primary-300'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full shadow-hover"
            >
              <span>Update Password</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

