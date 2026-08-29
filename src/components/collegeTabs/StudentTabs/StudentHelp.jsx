import { HelpCircle, Mail, MessageSquare, Book, Calendar, RotateCcw, AlertTriangle, CreditCard, Lock, Bell, ImageIcon, Key, Palette, Search, Zap, Smartphone } from "lucide-react";
import { useState } from "react";

function StudentHelp() {
  const [searchTerm, setSearchTerm] = useState("");

  const faqs = [
    {
      category: "Borrowing",
      icon: Book,
      items: [
        {
          icon: Book,
          question: "How do I borrow a book?",
          answer: "Browse books in the Explore section, click 'Request', and submit. Librarians will review and approve your request within 2-3 business days. Once approved, you can pick up the book at your library.",
        },
        {
          icon: Calendar,
          question: "What's the borrowing period?",
          answer: "Standard borrowing period is 14 days from the date you pick up the book. You can renew books up to 2 times if there are no pending requests for them. Extensions are not available for books requested by other students.",
        },
        {
          icon: RotateCcw,
          question: "Can I return a book early?",
          answer: "Yes, you can return books anytime during the borrowing period. Early returns help other students access the books they need. There are no penalties for early returns.",
        },
      ],
    },
    {
      category: "Fines & Penalties",
      icon: AlertTriangle,
      items: [
        {
          icon: CreditCard,
          question: "How are fines calculated?",
          answer: "Late fees are ₱10 per day per book after the due date. Check the 'Fines' section in your profile to see any outstanding balances. Fines must be settled before you can borrow more books.",
        },
        {
          icon: CreditCard,
          question: "How do I pay fines?",
          answer: "You can pay fines through the Libralink app or in person at your library. Both online and offline payment options are available. Keep your receipt for records.",
        },
        {
          icon: AlertTriangle,
          question: "What happens if I lose a book?",
          answer: "If you lose a book, you're responsible for its replacement cost. The librarian will calculate the replacement cost based on the book's original price. Contact your library immediately if you lose a book.",
        },
      ],
    },
    {
      category: "Account & Notifications",
      icon: Bell,
      items: [
        {
          icon: Bell,
          question: "How do I manage notifications?",
          answer: "Go to Settings → Notifications to customize which alerts you receive. You can enable/disable notifications for approvals, reminders, rejections, and updates. Email notifications are also available.",
        },
        {
          icon: ImageIcon,
          question: "How do I change my profile picture?",
          answer: "Go to Profile → Edit Profile → Click the camera icon on your profile picture to upload and crop a new image. Supported formats are JPG and PNG. Maximum file size is 5MB.",
        },
        {
          icon: Key,
          question: "How do I reset my password?",
          answer: "Go to Settings → Change Password. Enter your current password and your new password (minimum 8 characters). For security, use a combination of letters, numbers, and special characters.",
        },
        {
          icon: Palette,
          question: "How do I customize my interface?",
          answer: "Go to Settings → Appearance to customize your theme (Light/Dark/System), font size, and UI density. Changes are applied immediately and saved to your account.",
        },
      ],
    },
    {
      category: "Technical Support",
      icon: Zap,
      items: [
        {
          icon: Search,
          question: "Why can't I see some books?",
          answer: "Some books may be unavailable if they're currently borrowed, reserved, or not yet catalogued. You can still request them if available. Check with your librarian for more information.",
        },
        {
          icon: Zap,
          question: "What should I do if the app isn't working?",
          answer: "Try refreshing the page or clearing your browser cache. If the issue persists, contact your school administrator or librarian. You can also check our system status for any ongoing issues.",
        },
        {
          icon: Smartphone,
          question: "Is Libralink available on mobile?",
          answer: "Libralink is optimized for all devices including smartphones and tablets. You can access it through your mobile browser. A dedicated mobile app may be available soon.",
        },
      ],
    },
  ];

  const filteredFaqs = faqs.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden px-4 py-8 md:py-12">
        
        {/* Header */}
        <div className="mb-10 animate-fade-in-down">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg animate-bounce">
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Help & Support</h1>
              <p className="mt-1 text-base text-slate-600">Find answers to your questions</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:shadow-md"
            />
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((section, sectionIdx) => {
              const CategoryIcon = section.icon;
              return (
                <section key={sectionIdx} className="animate-fade-in-up" style={{ animationDelay: `${0.2 + sectionIdx * 0.1}s` }}>
                  <div className="flex items-center gap-3 mb-5 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                      <CategoryIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{section.category}</h2>
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item, itemIdx) => {
                      const ItemIcon = item.icon;
                      return (
                        <details 
                          key={itemIdx} 
                          className="group/item rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden animate-fade-in-up"
                          style={{ animationDelay: `${0.25 + sectionIdx * 0.1 + itemIdx * 0.05}s` }}
                        >
                          <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover/item:bg-blue-100 group-hover/item:text-blue-600 transition-colors">
                                <ItemIcon className="h-5 w-5" aria-hidden="true" />
                              </div>
                              <h3 className="font-semibold text-slate-900 text-base leading-snug pt-0.5 group-open/item:text-blue-600 transition-colors">{item.question}</h3>
                            </div>
                            <svg
                              className="h-5 w-5 shrink-0 text-slate-400 transition group-open/item:rotate-180 group-hover/item:text-blue-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </summary>
                          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/30 animate-slide-down">
                            <p className="text-slate-700 leading-relaxed">{item.answer}</p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" aria-hidden="true" />
              <p className="text-slate-600 font-medium">No results found for "{searchTerm}"</p>
              <p className="text-sm text-slate-500 mt-1">Try searching with different keywords</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <section className="mt-12 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 animate-fade-in-up hover:shadow-lg transition-shadow" style={{ animationDelay: '0.5s' }}>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Still need help?</h3>
          <p className="text-slate-700 mb-6 leading-relaxed">
            Couldn't find the answer you're looking for? Reach out to your school librarian or administrator for additional support. They're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:shadow-lg hover:from-blue-600 hover:to-blue-700 active:scale-95 transform hover:scale-105"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              Email Support
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500 bg-white px-6 py-3 text-base font-semibold text-blue-600 transition hover:bg-blue-50 active:scale-95 transform hover:scale-105"
            >
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
              Ask a Question
            </button>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 text-center py-8 border-t border-slate-200 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <p className="text-sm text-slate-600">
            Last updated: August 30, 2026 • Version 1.2.0
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default StudentHelp;
