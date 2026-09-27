import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, Info, FileText, ShieldCheck } from "lucide-react";

export default function StudentKnowledgeNav({
  activeTab = "help", // "help" | "about" | "terms" | "privacy"
  title,
  subtitle,
  badgeText = "Consortium Information",
}) {
  const navigate = useNavigate();

  const tabs = [
    { id: "help", label: "Help & FAQs", path: "/studentpage/help", icon: HelpCircle },
    { id: "about", label: "About Libralink", path: "/studentpage/about", icon: Info },
    { id: "terms", label: "Terms of Service", path: "/studentpage/terms", icon: FileText },
    { id: "privacy", label: "Privacy Policy", path: "/studentpage/privacy", icon: ShieldCheck },
  ];

  return (
    <header className="border-b border-slate-100 bg-white sticky top-0 z-30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-5 pb-0">
        {/* Top bar: Back Link & Badge */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Library</span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0077B6]" />
            {badgeText}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Minimalist Switcher Tabs */}
        <nav
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px border-b border-transparent"
          aria-label="Documentation sections"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? "border-slate-900 text-slate-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                }`}
              >
                <TabIcon
                  className={`h-3.5 w-3.5 ${isActive ? "text-slate-900" : "text-slate-400"}`}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
