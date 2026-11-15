import Badge from '../../components/ui/Badge';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <div className="space-y-3">
        <Badge color="warning">Student Project Template</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-heading">Terms of Service</h1>
        <p className="text-xs text-text-muted">Last updated: November 2026 • Academic Demonstration</p>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
        <strong>Notice:</strong> This application is a university computer science demonstration project ("MediBridge"). It is not currently operating as a licensed medical wholesaler or pharmaceutical distributor. These terms govern demonstrative usage of this software.
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-text-body leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">1. Eligibility and Accounts</h2>
          <p>
            Users must provide accurate information when registering as donors, licensed pharmacists, or charitable organizations. Providing fraudulent medical licenses, false registration certificates, or contaminated medicines will result in immediate account termination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">2. Prohibited Medicine Categories</h2>
          <p>
            The platform strictly blocks:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Opened foil strips, cut blisters, or loose tablets.</li>
            <li>Expired medicines or medicines with fewer than 60 days of shelf life.</li>
            <li>Cold-chain items (insulin, biologicals, vaccines) and liquid injectables.</li>
            <li>Controlled substances, narcotics, and Schedule X/H1 psychotropics.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">3. Pharmacist Verification Responsibility</h2>
          <p>
            Pharmacists participate on a voluntary professional basis to inspect visual indicators of packaging integrity and batch information. Approval through the software constitutes technical verification of sealed condition, not a chemical assay.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">4. Limitation of Liability</h2>
          <p>
            As an educational prototype, MediBridge and its student creators assume no liability for medical outcomes, delivery logistics, or third-party institutional compliance.
          </p>
        </section>
      </div>
    </div>
  );
}

