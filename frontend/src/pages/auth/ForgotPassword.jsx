import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/ui/Button';
import { forgotPassword } from '../../api/auth.api';

const forgotSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
});

export default function ForgotPassword() {
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const submittedEmail = watch('email');

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const onSubmit = async (values) => {
    try {
      await forgotPassword(values);
    } catch {
      // Intentionally silent: security rule requires always returning generic success
    } finally {
      setIsSent(true);
      setCountdown(30);
    }
  };

  return (
    <AuthLayout
      heading="Forgot your password?"
      subheading="Enter the email associated with your MediBridge account"
    >
      {!isSent ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Mail size={16} />
              </div>
              <input
                type="email"
                {...register('email')}
                placeholder="you@organization.org"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                  errors.email ? 'border-rose-400' : 'border-slate-200 hover:border-primary-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
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
              <span>Send Recovery Link</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>

          <div className="pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <h4 className="text-base font-heading font-bold text-text-heading">
              Check Your Inbox
            </h4>
            <p className="text-xs text-text-body mt-1.5 leading-relaxed max-w-sm mx-auto">
              If an account exists with <strong className="text-teal-800">{submittedEmail}</strong>, a secure password reset link has been dispatched.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-text-muted">
            The link is valid for <strong>15 minutes</strong>. Remember to check your spam/junk folder.
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={countdown > 0 || isSubmitting}
              onClick={handleSubmit(onSubmit)}
              className="w-full"
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend recovery email'}
            </Button>

            <Link to="/login">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
