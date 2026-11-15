import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Users, CheckCircle2, Lock, Sparkles, Building2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function About() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <Badge color="info">Our Mission</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-heading tracking-tight">
          Bridging the Medicine Divide with <span className="text-teal-700">Safety & Trust</span>
        </h1>
        <p className="text-base sm:text-lg text-text-body leading-relaxed">
          Every year, thousands of tons of perfectly usable, sealed medicines are discarded, while millions of vulnerable individuals go without essential therapies. MediBridge exists to replace this paradox with a secure, verified redistribution pipeline.
        </p>
      </section>

      {/* Core Values */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-lg font-bold text-text-heading">Zero Safety Compromise</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            We operate on a strict rule: no medicine is ever approved without physical or digital inspection by registered, licensed pharmacists.
          </p>
        </Card>

        <Card className="p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <h3 className="text-lg font-bold text-text-heading">Tamper-Proof Audits</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Every step—from donor submission to pharmacist approval and NGO handover—is captured with encrypted audit logs and unique QR codes.
          </p>
        </Card>

        <Card className="p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Heart size={24} />
          </div>
          <h3 className="text-lg font-bold text-text-heading">Pure Social Impact</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            MediBridge is non-commercial and 100% free. Our singular metric of success is the number of legitimate medical treatments saved and delivered.
          </p>
        </Card>
      </section>

      {/* Chain of Custody Narrative */}
      <section className="bg-white p-8 sm:p-12 rounded-3xl border border-teal-900/10 shadow-soft space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-text-heading">How Our Chain of Custody Works</h2>
        <div className="space-y-4 text-xs sm:text-sm text-text-body leading-relaxed">
          <p>
            Traditional medicine donation often suffers from safety concerns, unaccounted storage conditions, and lack of transparency. MediBridge resolves this by implementing a closed, role-based network:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p><strong>1. Strict Donor Screening:</strong> Donors submit high-resolution packaging photos, clear batch details, and manufacturing origins. Open strips and loose tablets are filtered out before reaching any clinic.</p>
            <p><strong>2. Pharmacist Certification:</strong> Qualified pharmacists review submissions against safety databases and packaging authenticity standards.</p>
            <p><strong>3. Geo-Radius Matching:</strong> Verified charitable institutions receive medicines within their service radius, ensuring direct and accountable distribution.</p>
            <p><strong>4. Dual-Party QR Handover:</strong> The transfer is completed when both the donor and the receiving representative scan matching digital cryptographic tokens.</p>
          </div>
        </div>
      </section>

      {/* Compliance Note */}
      <section className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/60 max-w-4xl mx-auto text-xs text-slate-700 leading-relaxed">
        <strong>Academic & Regulatory Note:</strong> MediBridge is an academic project and healthcare exchange architecture created to demonstrate secure, verifiable medicine redistribution workflows. All operations follow statutory standards prohibiting controlled substances, unsealed units, and unverified handlers.
      </section>
    </div>
  );
}

