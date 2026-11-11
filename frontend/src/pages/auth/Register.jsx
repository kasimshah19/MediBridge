import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Heart,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  FileBadge,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/ui/Button';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Must contain at least 1 number');

const phoneRegex = /^[6-9]\d{9}$/;

const registerSchema = z
  .object({
    role: z.enum(['donor', 'pharmacist', 'ngo']),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
    email: z.string().trim().email('Please provide a valid email address'),
    phone: z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
    city: z.string().trim().min(2, 'City is required'),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, 'Please confirm your password'),

    // Pharmacist fields
    licenseNumber: z.string().trim().optional(),
    pharmacyName: z.string().trim().optional(),
    registrationState: z.string().trim().optional(),
    experienceYears: z.coerce.number().min(0).optional(),

    // NGO fields
    organizationName: z.string().trim().optional(),
    designation: z.string().trim().optional(),

    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and safety policy to register',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === 'pharmacist') {
        return Boolean(data.licenseNumber && data.pharmacyName && data.registrationState);
      }
      return true;
    },
    {
      message: 'License number, pharmacy name, and registration state are required',
      path: ['licenseNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.role === 'ngo') {
        return Boolean(data.organizationName && data.designation);
      }
      return true;
    },
    {
      message: 'Organization name and designation are required for NGOs',
      path: ['organizationName'],
    }
  );

export default function Register() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('donor');
  const [showPassword, setShowPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'donor',
      name: '',
      email: '',
      phone: '',
      city: '',
      password: '',
      confirmPassword: '',
      licenseNumber: '',
      pharmacyName: '',
      registrationState: '',
      experienceYears: 0,
      organizationName: '',
      designation: '',
      terms: false,
    },
  });

  const watchedPassword = watch('password', '');

  // Password strength meter calculation
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

  const roleCards = [
    {
      id: 'donor',
      title: 'Medicine Donor',
      tagline: 'I have unused, sealed medicines to donate',
      desc: 'Donate unopened, valid medications from home and track their verified redistribution.',
      icon: Heart,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
      id: 'pharmacist',
      title: 'Licensed Pharmacist',
      tagline: 'I inspect and verify donated medicine packs',
      desc: 'Verify batch numbers, packaging integrity, and expiry safety as a certified pharmacist.',
      icon: ShieldCheck,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      id: 'ngo',
      title: 'NGO / Charitable Clinic',
      tagline: 'We dispense medicines to patients in need',
      desc: 'Request and receive verified medications matched by proximity for charitable distribution.',
      icon: Building2,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setValue('role', roleId);
  };

  const onSubmit = async (values) => {
    setRegError('');
    try {
      const user = await authRegister(values);
      toast.success('Registration completed!');
      const targetPath = getDashboardPathForUser(user);
      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Registration failed. Please check your inputs.';
      setRegError(msg);
    }
  };

  return (
    <AuthLayout
      heading={step === 1 ? 'Join the MediBridge Network' : 'Complete Your Registration'}
      subheading={
        step === 1
          ? 'Select how you want to contribute to the community medicine exchange'
          : `Providing details for your ${selectedRole.toUpperCase()} account`
      }
    >
      {/* Progress Step Indicator */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step === 1 ? 'bg-primary-600 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {step === 2 ? '✓' : '1'}
          </span>
          <span className={`font-semibold ${step === 1 ? 'text-primary-700' : 'text-text-muted'}`}>
            Select Role
          </span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200 mx-2" />
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
              step === 2 ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            2
          </span>
          <span className={`font-semibold ${step === 2 ? 'text-primary-700' : 'text-text-muted'}`}>
            Account Details
          </span>
        </div>
      </div>

      {/* Inline Registration Error Banner */}
      {regError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{regError}</div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 1: ROLE SELECTION CARDS                                   */}
      {/* ============================================================== */}
      {step === 1 && (
        <div className="space-y-3">
          {roleCards.map((card) => {
            const Icon = card.icon;
            const isSelected = selectedRole === card.id;

            return (
              <div
                key={card.id}
                onClick={() => handleRoleSelect(card.id)}
                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left flex items-start gap-3.5 relative ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50/60 shadow-soft ring-2 ring-primary-400/40'
                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50/50'
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${card.color} flex-shrink-0 mt-0.5`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-sm font-heading font-bold text-text-heading flex items-center gap-2">
                    {card.title}
                  </h4>
                  <p className="text-xs font-semibold text-primary-700 mt-0.5">{card.tagline}</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{card.desc}</p>
                </div>

                {/* Selected Checkmark Ring */}
                <div className="absolute top-4 right-4">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-4">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setStep(2)}
              className="w-full shadow-hover"
            >
              <span>Continue with {selectedRole.toUpperCase()}</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>

          <div className="pt-3 text-center">
            <p className="text-xs text-text-body">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-primary-700 hover:text-primary-800 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: PROFILE & ADAPTIVE ROLE FORM                           */}
      {/* ============================================================== */}
      {step === 2 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary-700 transition-colors mb-1"
          >
            <ArrowLeft size={14} />
            <span>Change role (Selected: {selectedRole})</span>
          </button>

          {/* Common Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Dr. Sunita Rao"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.name ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="user@example.com"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.email ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="9876543210"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.phone ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                City / Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <MapPin size={15} />
                </div>
                <input
                  type="text"
                  {...register('city')}
                  placeholder="Pune / Mumbai"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.city ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.city && <p className="text-[11px] text-rose-600 mt-1">{errors.city.message}</p>}
            </div>
          </div>

          {/* Pharmacist Specific Adaptive Fields */}
          {selectedRole === 'pharmacist' && (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                <FileBadge size={16} className="text-sky-600" />
                <span>Pharmacist Licensing Credentials</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pharmacy Reg. License Number *
                  </label>
                  <input
                    type="text"
                    {...register('licenseNumber')}
                    placeholder="MH-PHARM-2024-XXXX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-text-heading"
                  />
                  {errors.licenseNumber && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{errors.licenseNumber.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    State Council Registered *
                  </label>
                  <input
                    type="text"
                    {...register('registrationState')}
                    placeholder="Maharashtra / Delhi"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-text-heading"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Affiliated Pharmacy / Hospital Name *
                </label>
                <input
                  type="text"
                  {...register('pharmacyName')}
                  placeholder="Apex Community Chemist & Druggist"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-text-heading"
                />
              </div>
            </div>
          )}

          {/* NGO Specific Adaptive Fields */}
          {selectedRole === 'ngo' && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Briefcase size={16} className="text-indigo-600" />
                <span>NGO / Charitable Entity Representation</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Organization / Clinic Name *
                  </label>
                  <input
                    type="text"
                    {...register('organizationName')}
                    placeholder="Seva Health Trust"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-text-heading"
                  />
                  {errors.organizationName && (
                    <p className="text-[10px] text-rose-600 mt-0.5">
                      {errors.organizationName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your Official Designation *
                  </label>
                  <input
                    type="text"
                    {...register('designation')}
                    placeholder="Medical Officer / Coordinator"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-text-heading"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Min 8 characters"
                  className={`w-full pl-9 pr-9 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.password ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-heading"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Re-enter password"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white text-xs sm:text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50 ${
                    errors.confirmPassword ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Password Strength Meter */}
          {watchedPassword && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Password Strength:</span>
                <span className="font-bold text-text-heading">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-text-muted pt-1">
                <span className={watchedPassword.length >= 8 ? 'text-emerald-600' : ''}>
                  • 8+ Chars
                </span>
                <span className={/[A-Z]/.test(watchedPassword) ? 'text-emerald-600' : ''}>
                  • 1 Uppercase
                </span>
                <span className={/[0-9]/.test(watchedPassword) ? 'text-emerald-600' : ''}>
                  • 1 Number
                </span>
              </div>
            </div>
          )}

          {/* Terms Agreement Checkbox */}
          <div className="pt-1">
            <label className="inline-flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                {...register('terms')}
                className="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-400/40 mt-0.5"
              />
              <span className="text-xs text-text-body leading-tight">
                I certify that all registered medicines donated or verified comply with pharmaceutical integrity standards (sealed, unexpired).
              </span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.terms.message}</p>
            )}
          </div>

          {/* Submit Registration Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full shadow-hover"
            >
              <span>Create {selectedRole.toUpperCase()} Account</span>
              <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
