import { CheckCircle2, XCircle, ShieldAlert, Award } from 'lucide-react';

const acceptedItems = [
  'Factory-sealed blister packs and foil strips intact',
  'Medicines with at least 3+ months before expiry date',
  'Original manufacturer packaging with readable batch & expiry',
  'Room-temperature solid oral dosages (tablets, capsules)',
  'Sealed, unbroken liquid bottles (syrups, suspensions with unbroken seal)',
  'Unused topical ointments/creams with foil seal unbroken',
];

const rejectedItems = [
  'Any expired medicines (strictly blocked by auto-expiry screening)',
  'Opened strips, clipped blister cards, or loose pills in containers',
  'Injections, vials, IV fluids, or ampoules',
  'Cold-chain or temperature-sensitive products (insulin, biologics, vaccines)',
  'Medicines with torn, erased, or missing batch/expiry printing',
  'Narcotics, psychotropics, or Schedule X habit-forming drugs',
];

export default function SafetyComplianceSection() {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert size={14} className="text-teal-600" />
            <span>Strict Safety Guidelines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-heading tracking-tight">
            Safety & Clinical Compliance
          </h2>
          <p className="text-sm sm:text-base text-text-body mt-2.5 leading-relaxed">
            Patient safety is non-negotiable. MediBridge enforces strict intake criteria before any item enters redistribution.
          </p>
        </div>

        {/* Two-Column Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: What We Accept (Green) */}
          <div className="p-7 sm:p-8 rounded-3xl bg-emerald-50/40 border border-emerald-200/80 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  What We Proudly Accept
                </h3>
                <p className="text-xs text-emerald-800">
                  Eligible for pharmacist screening and redistribution
                </p>
              </div>
            </div>

            <ul className="space-y-3.5">
              {acceptedItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-emerald-900">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: What We Never Accept (Rose/Red) */}
          <div className="p-7 sm:p-8 rounded-3xl bg-rose-50/40 border border-rose-200/80 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-950">
                  What We Never Accept
                </h3>
                <p className="text-xs text-rose-800">
                  Strictly rejected for public safety & regulatory compliance
                </p>
              </div>
            </div>

            <ul className="space-y-3.5">
              {rejectedItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-rose-900">
                  <XCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Central Mandatory Disclaimer Bar */}
        <div className="mt-10 p-5 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Award size={24} className="text-teal-700 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-teal-950">
                Core Clinical Golden Rule
              </p>
              <p className="text-xs text-teal-800">
                Nothing is approved without pharmacist verification. Every strip is physically inspected before matching.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-white px-3 py-1.5 rounded-xl border border-teal-200 shadow-xs flex-shrink-0">
            Regulated Exchange
          </span>
        </div>
      </div>
    </section>
  );
}
