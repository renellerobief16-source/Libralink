import { Link } from "react-router-dom";
import { FiArrowRight, FiBook, FiZap, FiRefreshCw, FiUsers, FiClock, FiShield, FiSearch, FiNavigation, FiBell, FiCheckCircle, FiStar } from "react-icons/fi";
import Navigation from "./Navigation";

function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-white pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 min-h-screen flex items-center">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-block px-3 sm:px-4 py-2 bg-[#0077B6]/10 rounded-full mb-4 sm:mb-6">
              <span className="text-[#0077B6] text-xs sm:text-sm font-semibold">✨ Smart Library Navigation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#0F172A] mb-4 sm:mb-6 leading-tight">
              Find Books Smarter with <span className="text-[#0077B6]">Libralink</span>
            </h1>
            <p className="text-base sm:text-lg text-[#64748B] mb-6 sm:mb-8 max-w-2xl">
              Empowering students at Santa Rita College of Pampanga and Guagua National College of Pampanga with smart library navigation, real-time book search, and intelligent shelf mapping for seamless academic resource discovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                to="/login"
                className="bg-[#0077B6] hover:bg-[#005f8f] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Get Started</span>
                <FiArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                to="/login"
                className="border-2 border-[#0077B6] text-[#0077B6] px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-colors hover:bg-[#0077B6]/10 flex items-center justify-center"
              >
                <span>Student Login</span>
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <img 
              src="/landing.png" 
              alt="Libralink Library Navigation" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { icon: FiBook, value: '2,230+', label: 'Books Available', color: 'bg-[#0077B6]' },
    { icon: FiUsers, value: '6,000+', label: 'Active Students', color: 'bg-[#005f8f]' },
    { icon: FiClock, value: '24/7', label: 'Real-time Updates', color: 'bg-[#0077B6]' },
    { icon: FiShield, value: '100%', label: 'Secure Access', color: 'bg-[#005f8f]' }
  ];

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <stat.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">{stat.value}</div>
              <div className="text-sm sm:text-base text-[#64748B]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: FiSearch, title: 'Smart Book Search', description: 'Find books instantly by title, author, subject, or ISBN with AI-powered search capabilities.' },
    { icon: FiBook, title: 'Interactive Library Map', description: 'Locate shelves and books using a real-time digital floor map with step-by-step directions.' },
    { icon: FiNavigation, title: 'Intelligent Navigation', description: 'Receive intelligent routing to the exact shelf location with real-time updates and notifications.' },
    { icon: FiBell, title: 'Real-time Notifications', description: 'Get instant alerts for book availability, due dates, and request updates.' },
    { icon: FiCheckCircle, title: 'Easy Borrowing', description: 'Streamlined borrowing process with digital requests and QR code pickup.' },
    { icon: FiStar, title: 'Favorites & History', description: 'Save your favorite books and track your complete borrowing history.' }
  ]

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">Powerful Features</h2>
          <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto">
            Everything you need for a seamless library experience
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-[#F7FAFC] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] hover:shadow-lg hover:border-[#0077B6]/30 transition-all"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0077B6]/10 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#0077B6]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-3">{f.title}</h3>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: FiSearch, title: 'Search Books', description: 'Search for books by title, author, ISBN, or subject across both libraries.' },
    { icon: FiBook, title: 'Locate Shelf', description: 'View the exact shelf location using our interactive library map.' },
    { icon: FiCheckCircle, title: 'Borrow Easily', description: 'Submit a digital request and pick up your book with QR code.' }
  ];

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">How It Works</h2>
          <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto">
            Get started with Libralink in three simple steps
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
          {steps.map((step, i) => (
            <div key={i} className="text-center relative">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#0077B6]/10 rounded-full flex items-center justify-center mx-auto">
                  <step.icon className="w-10 h-10 sm:w-12 sm:h-12 text-[#0077B6]" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#0077B6] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {i + 1}
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0F172A] mb-3">{step.title}</h3>
              <p className="text-sm sm:text-base text-[#64748B]">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-[#E2E8F0]"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: 'Maria Santos',
      role: 'Student, Santa Rita College',
      content: 'Libralink has completely transformed how I find books in the library. The interactive map saves me so much time!',
      rating: 5
    },
    {
      name: 'John Reyes',
      role: 'Student, Guagua National College',
      content: 'The real-time availability feature is amazing. I can check if a book is available before even going to the library.',
      rating: 5
    },
    {
      name: 'Ana Cruz',
      role: 'Librarian, SRC',
      content: 'Managing the library has never been easier. Students can find books on their own, reducing our workload significantly.',
      rating: 5
    }
  ];

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">What Users Say</h2>
          <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto">
            Trusted by students and librarians across both institutions
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-[#F7FAFC] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <FiStar key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-[#64748B] mb-6 leading-relaxed">"{t.content}"</p>
              <div>
                <div className="font-semibold text-[#0F172A]">{t.name}</div>
                <div className="text-sm text-[#64748B]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">
          Ready to Transform Your Library Experience?
        </h2>
        <p className="text-base sm:text-lg text-[#64748B] mb-8 max-w-2xl mx-auto">
          Join thousands of students and librarians who are already navigating smarter with Libralink.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="bg-[#0077B6] hover:bg-[#005f8f] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <span>Get Started Free</span>
            <FiArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/about"
            className="border-2 border-[#0077B6] text-[#0077B6] px-8 py-4 rounded-xl font-semibold text-lg transition-colors hover:bg-[#0077B6]/10 flex items-center justify-center"
          >
            <span>Learn More</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-[#0077B6] rounded-xl flex items-center justify-center">
                <FiBook className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#0F172A]">Libralink</span>
            </div>
            <p className="text-[#64748B] text-sm leading-relaxed">Smart Library Navigation System for modern institutions. Empowering students with seamless book discovery.</p>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4 text-sm">Product</h4>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li><Link to="/about" className="hover:text-[#0077B6] transition-colors">Features</Link></li>
              <li><Link to="/library" className="hover:text-[#0077B6] transition-colors">Library</Link></li>
              <li><Link to="/contact" className="hover:text-[#0077B6] transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4 text-sm">Institutions</h4>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li><span className="hover:text-[#0077B6] transition-colors cursor-pointer">Santa Rita College</span></li>
              <li><span className="hover:text-[#0077B6] transition-colors cursor-pointer">Guagua National College</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li><span className="hover:text-[#0077B6] transition-colors cursor-pointer">support@libralink.edu</span></li>
              <li><span className="hover:text-[#0077B6] transition-colors cursor-pointer">+63 (0) 123-456-7890</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E2E8F0] pt-8 text-center text-sm text-[#64748B]">
          <p>&copy; 2026 Libralink. All rights reserved. | Santa Rita College of Pampanga & Guagua National College of Pampanga</p>
        </div>
      </div>
    </footer>
  );
}

export default Home;