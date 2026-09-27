import React from "react";
import StudentKnowledgeNav from "./StudentKnowledgeNav";

const TERMS_SECTIONS = [
  {
    number: "01",
    title: "Scope, Acceptance & Student Eligibility",
    content:
      "By signing into Libralink and utilizing the inter-library borrowing platform, you agree to comply with all rules and guidelines established by the consortium between Guagua National College, Santa Rita College, and member institutions. Access is granted exclusively to currently enrolled students possessing active institutional credentials in good academic standing.",
  },
  {
    number: "02",
    title: "Borrowing Allowances, Loan Durations & Renewals",
    content:
      "Eligible undergraduate students may hold a maximum of five (5) active circulating books concurrently across all connected campus libraries. The standard loan duration is fourteen (14) calendar days from physical release. Eligible titles may be renewed online up to two (2) consecutive times, provided no other student has placed an active hold request on the copy.",
  },
  {
    number: "03",
    title: "Inter-School Campus Visitation & Visiting Terms",
    content:
      "Students requesting materials from partner campuses (e.g., Santa Rita College) must abide by host library regulations. Visiting students must present their physical school ID card along with an approved Libralink Digital QR Pass upon entry. Applicable research visiting fees (such as SRC's ₱50.00 research fee) must be settled upon entrance, and materials designated 'Library Use Only' must not be removed from the host reading room.",
  },
  {
    number: "04",
    title: "Overdue Penalties, Daily Fines & Account Holds",
    content:
      "Borrowed materials must be returned on or before the indicated due date. Overdue penalties accumulate automatically at ₱10.00 per calendar day per book (excluding official institutional holidays). Students with unresolved fines or unreturned overdue books are placed on temporary circulation hold, preventing any new hold requests until full clearance is issued.",
  },
  {
    number: "05",
    title: "Care of Materials & Replacement Liability for Loss",
    content:
      "Borrowers are strictly liable for the physical integrity of borrowed volumes. Writing, highlighting, folding pages, or water damage constitutes property defacement. In the event of an irreparable or lost volume, the borrower must either furnish an identical replacement copy in brand-new condition or reimburse the current market retail value plus institutional processing costs.",
  },
  {
    number: "06",
    title: "Digital QR Code Pass & Identity Integrity",
    content:
      "The Libralink Digital QR Pass generated for pickups and campus entry is encrypted and strictly non-transferable. Attempting to share tokens, borrow on behalf of unverified third parties, or forge circulation credentials constitutes serious academic dishonesty subject to institutional disciplinary review.",
  },
  {
    number: "07",
    title: "Clearance Holds & Academic Record Impact",
    content:
      "At the conclusion of each academic semester, all borrowed materials must be returned and outstanding financial liabilities settled. Failure to clear library obligations results in an administrative block on semester grade viewing, enrollment validation, and the release of official scholastic transcripts.",
  },
];

export default function StudentTermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      {/* Shared Knowledge Top Navigation */}
      <StudentKnowledgeNav
        activeTab="terms"
        title="Terms of Service & Borrower Agreement"
        subtitle="Institutional regulations, borrowing privileges, overdue obligations, and consortium access policies."
        badgeText="Effective Academic Year 2026–2027"
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Preamble / Summary Callout */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 mb-8 text-xs sm:text-sm text-slate-700 space-y-1.5">
          <p className="font-semibold text-slate-900">
            Important Notice for Consortium Borrowers:
          </p>
          <p className="text-slate-600 leading-relaxed">
            Borrowing privileges are a shared trust across Guagua National College and Santa Rita College. All loans, cross-campus requests, and returns are tracked centrally through your Libralink account.
          </p>
        </div>

        {/* Detailed Sections List */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
          {TERMS_SECTIONS.map((section) => (
            <article key={section.number} className="py-6 sm:py-7 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {section.number}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {section.title}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
                {section.content}
              </p>
            </article>
          ))}
        </div>

        {/* Closing Contact Note */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <span>Official Regulation Code: LIB-TOS-2026.4</span>
          <span>Inquiries: legal-compliance@libralink.edu.ph</span>
        </div>
      </main>
    </div>
  );
}
