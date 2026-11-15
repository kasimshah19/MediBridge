import { Link } from 'react-router-dom';
import { Heart, Stethoscope, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

const personas = [
  {
    title: 'For Donors',
    badge: 'Individuals & Families',
    desc: 'Turn unneeded, sealed medicines from your home into lifesaving care for patients in need.',
    icon: Heart,
    accent: 'border-teal-200 bg-teal-50/30',
    iconBg: 'bg-teal-50 text-teal-700',
    benefits: [
      'Stop medicines from expiring in medicine cabinets',
      'Track every donation step with real-time updates',
      'Strict safety checks prevent misuse or black marketing',
      'Support local charitable clinics in your community',
    ],
    ctaText: 'Start Donating',
    ctaLink: '/register',
    buttonVariant: 'primary',
  },
  {
    title: 'For Pharmacists',
    badge: 'Licensed Healthcare Heroes',
    desc: 'Lend your clinical expertise to authenticate donated medicines and safeguard patient safety.',
    icon: Stethoscope,
    accent: 'border-sky-200 bg-sky-50/30',
    iconBg: 'bg-sky-50 text-sky-700',
    benefits: [
      'Digital inspection platform with batch & expiry checklists',
      'Official verification credentials & volunteer recognition',
      'Zero liability: platform enforces compliance checklists',
      'Prevent expired or opened counterfeit medicines entering care',
    ],
    ctaText: 'Join as Pharmacist',
    ctaLink: '/register',
    buttonVariant: 'secondary',
  },
  {
    title: 'For NGOs & Clinics',
    badge: 'Non-Profits & Charitable Clinics',
    desc: 'Receive verified, high-quality essential medicines for free to treat vulnerable community members.',
    icon: Building2,
    accent: 'border-emerald-200 bg-emerald-50/30',
    iconBg: 'bg-emerald-50 text-emerald-700',
    benefits: [
      'Free verified inventory of essential prescription items',
      'Geo-radius matching connects you to nearby donors',
      'Complete QR chain of custody for statutory audits',
      'Simple online onboarding with document verification',
    ],
    ctaText: 'Onboard Your Organization',
    ctaLink: '/register',
    buttonVariant: 'primary',
  },
];

export default function WhoIsItForSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white/40 to-teal-50/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
            <span>Ecosystem Partners</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-heading tracking-tight">
            Who is MediBridge For?
          </h2>
          <p className="text-sm sm:text-base text-text-body mt-2.5 leading-relaxed">
            A collaborative three-way exchange designed for donors, licensed pharmacists, and verified non-profit healthcare providers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {personas.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-7 sm:p-8 rounded-3xl bg-white border ${item.accent} shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-xs`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/50">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-text-heading mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-body leading-relaxed mb-6">
                    {item.desc}
                  </p>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Key Capabilities:
                    </p>
                    {item.benefits.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5 text-xs text-text-body">
                        <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link to={item.ctaLink} className="block">
                    <Button variant={item.buttonVariant} size="md" className="w-full">
                      <span>{item.ctaText}</span>
                      <ArrowRight size={15} className="ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
