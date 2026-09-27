import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Building2,
  Calendar,
  AlertCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  ChevronDown,
  Mail,
  Clock,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import StudentKnowledgeNav from "./StudentKnowledgeNav";

const FAQ_CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "consortium", label: "Inter-School & SRC", icon: Building2 },
  { id: "borrowing", label: "Borrowing & Loans", icon: BookOpen },
  { id: "fines", label: "Fines & Penalties", icon: CreditCard },
  { id: "qr", label: "Digital QR Pass", icon: QrCode },
  { id: "account", label: "Account & Security", icon: ShieldCheck },
];

const FAQS_DATA = [
  {
    category: "consortium",
    question: "How does inter-school borrowing work between GNC and Santa Rita College (SRC)?",
    shortAnswer: "Search for books with the 'SRC • Partner Campus' badge and request an Inter-School Hold pass.",
    fullAnswer:
      "When you search on Libralink, the catalog queries both Guagua National College (GNC) and Santa Rita College (SRC) in real time. If a title is held by SRC, you can place a hold request directly in the Explore tab. Once approved by the librarian, Libralink issues a digital QR referral pass. You can then visit SRC's library, present your pass and active student ID, and access the copy.",
  },
  {
    category: "consortium",
    question: "Is there a visiting fee when entering Santa Rita College or partner campuses?",
    shortAnswer: "A standard ₱50.00 research fee applies unless waived under institutional reciprocity agreements.",
    fullAnswer:
      "Partner campuses like Santa Rita College enforce a nominal visiting research fee (typically ₱50.00 per visit or per day) for visiting students from other consortium schools. This fee is automatically indicated on the book details card and included in your request slip. Some research visits are complimentary depending on active consortium reciprocity arrangements.",
  },
  {
    category: "consortium",
    question: "Can I take home a book borrowed from Santa Rita College?",
    shortAnswer: "Items labeled 'Library Use Only' must be studied in their reading hall; circulating copies depend on policy.",
    fullAnswer:
      "Rare reference books, single-copy encyclopedias, and special collection items marked 'Library Use Only' must be consulted on-site inside SRC's reading rooms. For regular circulating titles, off-campus loans are subject to the host librarian's discretion and your verified Libralink good-standing status.",
  },
  {
    category: "borrowing",
    question: "How many books can I borrow at the same time?",
    shortAnswer: "Undergraduate students can hold up to 5 active loans concurrently.",
    fullAnswer:
      "Students in good standing can borrow up to a maximum of 5 books simultaneously across all connected campuses. If you have reached your 5-book limit, you must return an existing loan before new borrowing requests can be submitted.",
  },
  {
    category: "borrowing",
    question: "What is the standard borrowing period and can I renew online?",
    shortAnswer: "14 calendar days with up to 2 online renewals if no other student has placed a hold.",
    fullAnswer:
      "Standard student loan duration is 14 calendar days from the date of physical pickup. You can renew eligible loans up to 2 consecutive times via the 'Activity' tab, provided the book has not been requested or waitlisted by another student.",
  },
  {
    category: "borrowing",
    question: "How do I claim my book once my request is approved?",
    shortAnswer: "Present your digital QR pickup code at the circulation desk within 3 business days.",
    fullAnswer:
      "Once a librarian approves your request, you will receive an alert in your Inbox with a pickup deadline (usually 3 business days). Visit the circulation counter of the holding library, open your transaction slip, and let the desk staff scan your QR code to record the release.",
  },
  {
    category: "fines",
    question: "How are overdue fines computed and tracked?",
    shortAnswer: "₱10.00 per day per book past the due date (excluding recognized holidays).",
    fullAnswer:
      "Overdue fees accumulate automatically at ₱10.00 per calendar day per overdue book until the item is checked in. You can check any active fines in your Profile or Activity summary. Outstanding overdue fines temporarily restrict new loan requests.",
  },
  {
    category: "fines",
    question: "What should I do if I misplace or damage a library book?",
    shortAnswer: "Report it immediately to avoid accumulating daily overdue fines while replacement is arranged.",
    fullAnswer:
      "Notify the circulation librarian promptly. Daily fines are paused once a formal loss report is logged. The borrower is responsible for replacing the book with an exact or newer edition, or remitting the assessed replacement value plus administrative processing charges.",
  },
  {
    category: "qr",
    question: "What is the digital QR code and is it secure?",
    shortAnswer: "An encrypted, dynamic authorization token linked directly to your authenticated student ID.",
    fullAnswer:
      "Libralink replaces manual paper call slips with dynamic, encrypted QR tokens. These codes contain verified transaction identifiers that only authorized librarian scanners can validate, preventing unauthorized use or ticket tampering.",
  },
  {
    category: "account",
    question: "How do I update my password or security credentials?",
    shortAnswer: "Navigate to Settings → Security to change your login credentials.",
    fullAnswer:
      "You can update your login password anytime under Settings → Security. For account safety, passwords must contain at least 8 characters including letters and numbers. If you lose access to your account, visit your school library desk with your physical student ID for identity verification.",
  },
];

export default function StudentHelp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (idx) => {
    setOpenItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQS_DATA.filter((item) => {
      const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.shortAnswer.toLowerCase().includes(q) ||
        item.fullAnswer.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-white">
      {/* Shared Knowledge Top Navigation */}
      <StudentKnowledgeNav
        activeTab="help"
        title="Help & Support Center"
        subtitle="Frequently asked questions, consortium borrowing rules, and library circulation guidelines."
        badgeText="Guides & FAQs"
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Minimalist Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policies, Santa Rita College loans, fines, QR passes..."
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Minimalist Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-4 mb-6 border-b border-slate-100">
          {FAQ_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white font-medium shadow-2xs"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {filteredFaqs.length} {filteredFaqs.length === 1 ? "Guide" : "Guides"} Available
          </p>
          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="text-xs text-blue-600 hover:underline"
            >
              View all topics
            </button>
          )}
        </div>

        {/* FAQ Accordion List (Minimalist Notion/Stripe Style) */}
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center my-6">
            <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No guides match your search</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try searching with different terms like "overdue", "Santa Rita", or "renewals".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = Boolean(openItems[idx]);
              return (
                <div key={idx} className="py-4 sm:py-5 group">
                  <button
                    type="button"
                    onClick={() => toggleItem(idx)}
                    className="w-full flex items-start justify-between gap-4 text-left transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {faq.question}
                      </h3>
                      {!isOpen && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {faq.shortAnswer}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 mt-1 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-slate-800" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pl-0 pr-4 animate-in fade-in duration-150">
                      <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-100/80 text-slate-700">
                        {faq.fullAnswer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Minimalist Support Desk Footer */}
        <section className="mt-12 rounded-2xl border border-slate-100 bg-slate-50/60 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Need specific library assistance?</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact the circulation desk for account clearance, fine settlements, or special research permits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="mailto:library@gnc.edu.ph"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email Helpdesk</span>
              </a>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700 block">Host Libraries:</span>
              <span>Guagua National College & Santa Rita College</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">Service Hours:</span>
              <span>Monday – Saturday, 8:00 AM – 5:00 PM</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
