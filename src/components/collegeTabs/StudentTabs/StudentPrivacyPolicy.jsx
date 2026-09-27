import React from "react";
import StudentKnowledgeNav from "./StudentKnowledgeNav";

const PRIVACY_SECTIONS = [
  {
    number: "01",
    title: "Information We Collect",
    content:
      "Libralink collects data necessary for library operations and circulation management. This includes your student ID number, full legal name, institutional email address, program/course, affiliated campus (e.g. Guagua National College or Santa Rita College), along with your transaction history including requested titles, checkout timestamps, and overdue penalty records.",
  },
  {
    number: "02",
    title: "How Your Data Is Utilized",
    content:
      "Your personal information is used exclusively to administer library loans, validate digital QR pickup passes, dispatch automated due date reminders and loan approval alerts, enforce the 5-book borrowing ceiling, and verify cross-campus visiting clearance at partner libraries.",
  },
  {
    number: "03",
    title: "Consortium Cross-Campus Data Sharing Safeguards",
    content:
      "When you place an Inter-School Hold for a book held by Santa Rita College (SRC), only the minimum necessary verification data—your name, student ID, school of origin, and request token—is transmitted to the host library desk for physical release. Your personal contact details, passwords, and private reading history remain strictly protected and isolated.",
  },
  {
    number: "04",
    title: "Camera & Device Permissions",
    content:
      "If you utilize mobile scanning features to scan book barcodes or digital passes, camera access is activated strictly for instantaneous optical decoding. Libralink does not record, upload, or store video feeds or photographic captures from your device.",
  },
  {
    number: "05",
    title: "Data Security, Encryption & Database RLS",
    content:
      "All API transmissions are encrypted using standard TLS 1.3 cryptographic protocols. Passwords and authentication tokens are salted and hashed. Database access is governed by PostgreSQL Row-Level Security (RLS) policies to prevent unauthorized cross-tenant data extraction.",
  },
  {
    number: "06",
    title: "Retention & Graduation Offboarding",
    content:
      "Borrowing transaction logs are preserved throughout your active enrollment to maintain academic clearance auditability. Upon graduation or formal institutional exit clearance, identifying transaction records are archived and anonymized in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).",
  },
  {
    number: "07",
    title: "Your Rights & Data Protection Inquiries",
    content:
      "Students possess the statutory right to review their circulation history, update account details, and request rectification of any inaccurate records. For privacy inquiries or data rights requests, contact the designated institutional Data Protection Officer at dpo@libralink.edu.ph.",
  },
];

export default function StudentPrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Shared Knowledge Top Navigation */}
      <StudentKnowledgeNav
        activeTab="privacy"
        title="Privacy Policy & Student Data Protection"
        subtitle="How Libralink safeguards student identities, circulation history, and cross-campus data transmissions."
        badgeText="Compliant with RA 10173 (DPA)"
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Preamble / Summary Callout */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 mb-8 text-xs sm:text-sm text-slate-700 space-y-1.5">
          <p className="font-semibold text-slate-900">
            Commitment to Student Privacy:
          </p>
          <p className="text-slate-600 leading-relaxed">
            Libralink treats student reading preferences and academic inquiries with the highest level of confidentiality. Your data is never monetized, sold, or shared with third-party advertisers.
          </p>
        </div>

        {/* Detailed Sections List */}
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
          {PRIVACY_SECTIONS.map((section) => (
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
          <span>Policy Document Reference: LIB-DPA-2026.1</span>
          <span>Data Protection Officer: dpo@libralink.edu.ph</span>
        </div>
      </main>
    </div>
  );
}
