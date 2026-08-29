import { Check, Zap, Shield, Heart, MessageCircle } from "lucide-react";

function StudentAbout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto w-full max-w-4xl min-w-0 overflow-x-hidden px-4 py-8 md:py-12">
        
        {/* Header */}
        <div className="mb-10 animate-fade-in-down">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">About Libralink</h1>
          <p className="mt-2 text-base text-slate-600">Learn about our library management platform</p>
        </div>

        {/* Hero Section */}
        <section className="mb-10 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 md:p-12 shadow-lg hover:shadow-xl transition-shadow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 animate-bounce">
              <img 
                src="/L.png" 
                alt="Libralink Logo" 
                className="h-28 w-28 object-contain drop-shadow-lg hover:scale-110 transition-transform"
              />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.2s' }}>Libralink</h2>
            <p className="mt-3 text-xl text-slate-700 animate-fade-in" style={{ animationDelay: '0.3s' }}>Unified Library Management System</p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <span>Version 1.2.0</span>
              <span className="text-slate-300">•</span>
              <span>Released Aug 30, 2026</span>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-2xl font-bold text-slate-900 mb-4 group">
            <span className="group-hover:text-blue-600 transition-colors">About</span>
          </h3>
          <p className="text-base leading-7 text-slate-700">
            Libralink is a comprehensive library management platform designed to streamline book borrowing, tracking, and library operations across educational institutions. Built with modern technology, Libralink provides students, librarians, and administrators with an intuitive interface to manage library resources efficiently.
          </p>
          <p className="mt-5 text-base leading-7 text-slate-700">
            Our mission is to make library management seamless and accessible, improving the overall experience for everyone involved in library operations.
          </p>
        </section>

        {/* Key Features */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-6 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Key Features</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Book Browsing & Discovery", desc: "Explore thousands of books with advanced search and filtering" },
              { title: "Smart Borrowing Requests", desc: "Request books from partner libraries with ease" },
              { title: "Due Date Reminders", desc: "Never miss a deadline with timely notifications" },
              { title: "Fine Management", desc: "Track and manage library fines transparently" },
              { title: "Real-time Notifications", desc: "Stay updated with instant alerts and updates" },
              { title: "Personalized Settings", desc: "Customize your experience with flexible preferences" },
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition transform hover:scale-105 animate-fade-in-up" style={{ animationDelay: `${0.35 + idx * 0.05}s` }}>
                <Check className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">{feature.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technology & Stack */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3 mb-6 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Built With Modern Technology</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { label: "Frontend", tech: "React, Tailwind CSS, Modern UI Components" },
              { label: "Backend", tech: "Node.js, Express, RESTful API" },
              { label: "Database", tech: "PostgreSQL, Real-time Sync" },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition transform hover:scale-105 animate-fade-in-up" style={{ animationDelay: `${0.45 + idx * 0.05}s` }}>
                <p className="font-semibold text-slate-900 mb-2">{item.label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.tech}</p>
              </div>
            ))}
          </div>
        </section>

        {/* System Information */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-3 mb-6 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">System Information</h3>
          </div>
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.55s' }}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 hover:bg-slate-50 px-2 rounded transition">
              <span className="text-slate-600">Application Version</span>
              <span className="font-semibold text-slate-900">1.2.0</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 hover:bg-slate-50 px-2 rounded transition">
              <span className="text-slate-600">Build Number</span>
              <span className="font-semibold text-slate-900">Latest</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 hover:bg-slate-50 px-2 rounded transition">
              <span className="text-slate-600">Release Date</span>
              <span className="font-semibold text-slate-900">August 30, 2026</span>
            </div>
            <div className="flex justify-between items-center hover:bg-slate-50 px-2 rounded transition">
              <span className="text-slate-600">Status</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Legal & Policy */}
        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-3 mb-6 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:scale-110 transition-transform">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">Legal & Policy</h3>
          </div>
          <p className="text-sm text-slate-600 mb-5">© 2026 Libralink. All rights reserved.</p>
          <div className="space-y-3">
            <a
              href="/studentpage/terms"
              className="block text-blue-600 hover:text-blue-700 font-medium text-sm transition hover:underline transform hover:translate-x-1"
            >
              → Terms of Service
            </a>
            <a
              href="/studentpage/privacy"
              className="block text-blue-600 hover:text-blue-700 font-medium text-sm transition hover:underline transform hover:translate-x-1"
            >
              → Privacy Policy
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-8 border-t border-slate-200 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <p className="text-sm text-slate-600 leading-relaxed">
            Thank you for using Libralink! We're committed to providing the best library management experience.
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
      `}</style>
    </div>
  );
}

export default StudentAbout;
