import Accordion from '../ui/Accordion';
import { HelpCircle } from 'lucide-react';

const faqItems = [
  {
    question: 'What medicines can I donate to MediBridge?',
    answer:
      'You can donate sealed, unexpired medicines in original packaging with at least 3+ months remaining before expiry. Blister packs, foil strips, and factory-sealed bottles of tablets, capsules, and syrups are eligible. Opened strips, loose pills, injections, cold-chain items (like insulin), and controlled narcotics are strictly prohibited.',
  },
  {
    question: 'How are donated medicines verified for safety?',
    answer:
      'Every medicine must pass inspection by a registered pharmacist before redistribution. Pharmacists check physical seal integrity, batch numbers against manufacturer recalls, expiry dates, and proper packaging conditions. Only medicines with 100% pharmacist approval are cleared for clinic allocation.',
  },
  {
    question: 'How are NGOs and charitable clinics verified?',
    answer:
      'NGOs and clinics undergo statutory verification by MediBridge administrators. Organizations must submit their Registration Certificate, Government ID of the authorized signatory, 12A/80G tax certificates, or Clinic Establishment Licenses. Physical or digital geo-location is verified before access is granted.',
  },
  {
    question: 'Is MediBridge completely free to use?',
    answer:
      'Yes, 100% free. MediBridge is a non-profit technology exchange platform. Neither donors nor recipient clinics are ever charged any fees, commissions, or subscriptions. Donated medicines can never be resold or monetized by any party.',
  },
  {
    question: 'How is user data and medical privacy protected?',
    answer:
      'We practice strict data minimization. Donors and NGOs have role-based protected access. Donor personal contact information is never exposed publicly or to unauthorized parties. Handover uses encrypted, time-limited QR codes to preserve privacy and prevent unauthorized transfers.',
  },
  {
    question: 'Is medicine redistribution legally compliant in India?',
    answer:
      'MediBridge acts as a regulatory coordination software connecting licensed institutions. Donated medicines are never distributed directly to random individuals; they are transferred exclusively to registered charitable healthcare institutions with qualified dispensing doctors and pharmacists in compliance with Drugs and Cosmetics Act regulations.',
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle size={14} className="text-teal-600" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-extrabold text-text-heading tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-text-body mt-2 leading-relaxed">
            Everything you need to know about safety, compliance, verification, and donation rules.
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion items={faqItems} defaultOpenIndex={0} />
      </div>
    </section>
  );
}
