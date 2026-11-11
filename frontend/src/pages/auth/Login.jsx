import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/ui/Button';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
  rememberMe: z.boolean().optional().default(false),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired') === '1';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values) => {
    setAuthError('');
    try {
      const user = await login({
        ...values,
        email: values.email.trim(),
        password: values.password.trim(),
      });
      toast.success(`Welcome back, ${user.name}!`);
      const targetPath = getDashboardPathForUser(user);
      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Unable to sign in. Please try again.';
      setAuthError(msg);
    }
  };

  return (
    <AuthLayout
      heading="Welcome back to MediBridge"
      subheading="Sign in to continue making a difference in community healthcare"
    >
      {/* Session Expired Notice */}
      {isExpired && !authError && (
        <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span>Your session has expired. Please sign in again.</span>
        </div>
      )}

      {/* Inline Auth / Lockout Error Banner */}
      {authError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{authError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Mail size={16} />
            </div>
            <input
              type="email"
              {...register('email')}
              placeholder="you@organization.org"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-text-heading placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-500 ${
                errors.email
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                  : 'border-slate-200 hover:border-primary-300'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-sm text-text-heading placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-500 ${
                errors.password
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                  : 'border-slate-200 hover:border-primary-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-heading transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-400/40"
            />
            <span className="text-xs text-text-body font-medium">Remember me for 30 days</span>
          </label>
        </div>

        {/* Sign In Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full shadow-hover"
          >
            <span>Sign In</span>
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>

        {/* Create Account Divider & Link */}
        <div className="pt-4 text-center">
          <p className="text-xs text-text-body">
            New to MediBridge?{' '}
            <Link
              to="/register"
              className="font-bold text-primary-700 hover:text-primary-800 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
