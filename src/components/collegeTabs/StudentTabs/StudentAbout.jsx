import React from "react";
import {
  Building2,
  Globe,
  QrCode,
  ShieldCheck,
  BookOpen,
  Cpu,
  Layers,
  CheckCircle,
  ExternalLink,
  MapPin,
} from "lucide-react";
import StudentKnowledgeNav from "./StudentKnowledgeNav";

export default function StudentAbout() {
  const consortiumCampuses = [
    {
      code: "GNC",
      name: "Guagua National College",
      location: "San Jose, Guagua, Pampanga",
      role: "Lead Host Institution & Repository",
      collections: "General Education, Business, Education, Sciences, Literature",
    },
    {
      code: "SRC",
      name: "Santa Rita College",
      location: "Gosioco Street, San Jose, Santa Rita, Pampanga",
      role: "Consortium Partner Campus",
      collections: "Theology, Reference Collections, Health & Humanities",
    },
  ];

  const platformPillars = [
    {
      title: "Consortium Real-time Catalogue Sync",
      description:
        "Queries physical library inventories across member institutions simultaneously. Students can see shelf locations, call numbers, and live availability at both GNC and Santa Rita College.",
      icon: Globe,
    },
    {
      title: "Digital QR Authorization & Passes",
      description:
        "Replaces paper circulation slips with dynamic QR tokens. Approved borrowing requests generate an encrypted pass that host campus librarians scan to verify identity and release books.",
      icon: QrCode,
    },
    {
      title: "Unified Student Account Governance",
      description:
        "Maintains a synchronized 5-book borrowing ceiling, automated overdue fee tracking (₱10.00/day), and cross-campus clearance records under a single student profile.",
      icon: ShieldCheck,
    },
    {
      title: "Interactive Campus Spatial Maps",
      description:
        "Integrated mapping engine providing exact geographical coordinates, building guidance, and route directions between Guagua and Santa Rita campuses.",
      icon: MapPin,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Shared Knowledge Top Navigation */}
      <StudentKnowledgeNav
        activeTab="about"
        title="About Libralink"
        subtitle="The unified inter-school library consortium platform empowering collaborative academic research."
        badgeText="Platform Overview"
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* Mission Statement */}
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Consortium Mission
          </p>
          <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
            Libralink is an academic inter-institutional library network created to dismantle barriers to educational resources. By digitally linking campus libraries in Pampanga, students gain reciprocal borrowing privileges, expanded research archives, and automated cross-library access.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Rather than confining student research to the physical holdings of a single institution, Libralink provides a shared portal where books catalogued across member schools can be discovered, reserved, and accessed through standardized digital clearance passes.
          </p>
        </section>

        {/* Member Campuses */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connected Campuses
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Active Consortium Libraries
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {consortiumCampuses.map((campus) => (
              <div
                key={campus.code}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-2.5 transition hover:border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {campus.code}
                  </span>
                  <span className="text-[11px] font-medium text-blue-600">Active Node</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{campus.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{campus.location}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold text-slate-700">Role:</span> {campus.role}</p>
                  <p><span className="font-semibold text-slate-700">Specializations:</span> {campus.collections}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Key Features
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Engineered for Seamless Collaboration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {platformPillars.map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <div key={pillar.title} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PillarIcon className="h-4 w-4 text-[#0077B6] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">{pillar.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pl-6">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Technical Architecture & Specs */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              System Specifications
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Architecture & Data Security
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 divide-y divide-slate-200/60 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-500">Platform Version</span>
              <span className="font-mono font-semibold text-slate-800">Libralink v2.4.0 (Enterprise Academic)</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-500">Database Engine</span>
              <span className="font-semibold text-slate-800">PostgreSQL with Supabase Realtime Replicas</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-500">Frontend Technology</span>
              <span className="font-semibold text-slate-800">React 18, Vite Engine, Tailwind CSS</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-500">Mapping & Geolocation</span>
              <span className="font-semibold text-slate-800">Interactive OpenStreetMap & Leaflet Vector Engine</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-500">Security Standard</span>
              <span className="font-semibold text-slate-800">AES Token Authentication & Institutional RBAC</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
