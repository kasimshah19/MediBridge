import Badge from '../../components/ui/Badge';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-8">
      <div className="space-y-3">
        <Badge color="warning">Student Project Template</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-heading">Privacy Policy</h1>
        <p className="text-xs text-text-muted">Last updated: November 2026 • Academic Demonstration</p>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
        <strong>Notice:</strong> This privacy policy demonstrates adherence to data protection best practices for the MediBridge educational platform prototype.
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-text-body leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">1. Information We Collect</h2>
          <p>
            MediBridge collects basic account details (name, email address, phone number, role) and professional verification data (pharmacy license number, NGO registration certificates).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">2. Location Data Usage</h2>
          <p>
            Location coordinates are collected solely to calculate geographical proximity between medicine donors and verified charitable clinics. Precise residential addresses are not published on public pages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">3. Document Storage & Security</h2>
          <p>
            Verification documents uploaded by NGOs (registration documents, ID proofs) are stored in secure directories and served exclusively to verified organization owners and authorized administrators. They are never indexed publicly or made accessible to unauthenticated users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-heading">4. Cookies & Session Storage</h2>
          <p>
            We utilize secure, httpOnly cookies (<code>mb_token</code>) to manage authenticated user sessions. No third-party ad tracking or commercial surveillance pixels are installed.
          </p>
        </section>
      </div>
    </div>
  );
}

