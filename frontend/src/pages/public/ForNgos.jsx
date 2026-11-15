import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function ForNgos() {
  const steps = [
    {
      number: '01',
      title: 'Register Account',
      description: 'Create an NGO account with your organization name and authorized contact details.',
    },
    {
      number: '02',
      title: 'Complete Profile & Map Pin',
      description: 'Fill organization address, services offered, and pinpoint your clinic on the interactive map.',
    },
    {
      number: '03',
      title: 'Upload Official Documents',
      description: 'Submit your 80G/12A registration certificate, ID proof, and clinic licenses securely.',
    },
    {
      number: '04',
      title: 'Admin Verification & Go Live',
      description: 'Our compliance officers verify records within 24-48 hours, unlocking free medicine allocation.',
    },
  ];

  const requiredDocs = [
    {
      title: 'Registration Certificate',
      appliesTo: 'All Organizations',
      description: 'Trust deed, Society registration, or Section 8 incorporation certificate.',
    },
    {
      title: 'Authorized Signatory ID Proof',
      appliesTo: 'All Organizations',
      description: 'Government photo identification (Aadhaar / Voter ID / Passport) of designated contact.',
    },
    {
      title: 'Clinic / Facility License',
      appliesTo: 'Charitable Clinics Only',
      description: 'Clinical Establishments registration certificate or municipal healthcare operational license.',
    },
    {
      title: '12A & 80G Tax Exemption (Optional)',
      appliesTo: 'NGOs',
      description: 'Tax exemption certificates issued by Income Tax Department.',
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <Badge color="info">Partner Onboarding</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-heading tracking-tight">
          Empowering Charitable Clinics & NGOs with{' '}
          <span className="text-teal-700">Verified Medicines</span>
        </h1>
        <p className="text-base sm:text-lg text-text-body leading-relaxed">
          MediBridge supplies verified, sealed, and safe medicines directly to non-profit healthcare institutions serving underprivileged communities.
        </p>
        <div className="pt-2 flex justify-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg">
              Register Your Organization
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits Bento */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text-heading text-center">Benefits of Partnering with MediBridge</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-base font-bold text-text-heading">100% Free Verified Stocks</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Every single batch of medicine is inspected by certified pharmacists before allocation. Zero cost for NGOs and charitable clinics.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <h3 className="text-base font-bold text-text-heading">Proximity-Based Allocation</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Our intelligent geo-radius algorithm prioritizes medicines within your locality, simplifying handover logistics and minimizing transit delays.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-text-heading">Audit-Ready Chain of Custody</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Digital QR handovers record timestamps, batch serials, and donor verification data, keeping your compliance audits clean and transparent.
            </p>
          </Card>
        </div>
      </section>

      {/* 4-Step Onboarding Workflow */}
      <section className="space-y-8 bg-slate-50/70 p-8 sm:p-12 rounded-3xl border border-teal-900/10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge color="success">4 Simple Steps</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-heading">The Onboarding Process</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            From registration to verified status in a seamless, paperless workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div key={st.number} className="bg-white p-6 rounded-2xl border border-teal-900/10 shadow-soft space-y-2">
              <div className="text-2xl font-black text-teal-600">{st.number}</div>
              <h3 className="text-sm font-bold text-text-heading">{st.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{st.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Required Documents Checklist */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <Badge color="warning">Document Checklist</Badge>
          <h2 className="text-2xl font-bold text-text-heading">What You Need to Get Verified</h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Prepare these documents in PDF, JPG, or PNG format (max 5MB each) before starting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {requiredDocs.map((doc, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-soft space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-heading">{doc.title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {doc.appliesTo}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{doc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="p-8 rounded-3xl bg-teal-700 text-white text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to start receiving verified medicines?</h2>
        <p className="text-xs sm:text-sm text-teal-100 max-w-xl mx-auto">
          Sign up your organization in less than 5 minutes.
        </p>
        <Link to="/register">
          <Button variant="secondary" size="md" className="bg-white text-teal-900 hover:bg-teal-50">
            Register Organization Now
          </Button>
        </Link>
      </section>
    </div>
  );
}

