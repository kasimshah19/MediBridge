import { PackagePlus, UserCheck, MapPinCheck, QrCode } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Donate Sealed Medicines',
    desc: 'Donors register unused, sealed medicines with expiry dates, batch numbers, and photo proof.',
    icon: PackagePlus,
    color: 'from-teal-500 to-teal-700',
    badge: '100% Sealed & Intact',
  },
  {
    step: '02',
    title: 'Pharmacist Verification',
    desc: 'Registered pharmacists inspect medicine packaging, verify batch safety, and approve or reject submissions.',
    icon: UserCheck,
    color: 'from-sky-500 to-sky-700',
    badge: 'Mandatory Compliance',
  },
  {
    step: '03',
    title: 'Geo-Radius Matching',
    desc: 'Approved medicines are automatically mapped and matched to verified charitable clinics & NGOs nearby.',
    icon: MapPinCheck,
    color: 'from-emerald-500 to-emerald-700',
    badge: 'OpenStreetMap Routing',
  },
  {
    step: '04',
    title: 'QR Chain of Custody',
    desc: 'Handover is validated with encrypted QR verification to ensure zero diversion into grey markets.',
    icon: QrCode,
    color: 'from-teal-600 to-cyan-700',
    badge: 'Tamper-Evident Transfer',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
            <span>End-to-End Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-heading tracking-tight">
            How MediBridge Works
          </h2>
          <p className="text-sm sm:text-base text-text-body mt-2.5 leading-relaxed">
            A four-step closed-loop platform guaranteeing safety, regulatory compliance, and verified delivery.
          </p>
        </div>

        {/* Steps Grid / Timeline */}
        <div className="relative">
          {/* Desktop Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-teal-200 via-sky-200 to-emerald-200 -translate-y-12 -z-10" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="relative p-6 rounded-3xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Step Number Bubble */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-black text-teal-600/70 tracking-widest uppercase">
                      Step {item.step}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60">
                      {item.badge}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 text-teal-700 border border-teal-200/60 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 shadow-xs">
                    <Icon size={26} className="text-teal-700" />
                  </div>

                  {/* Text */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-text-heading group-hover:text-teal-800 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-body leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
