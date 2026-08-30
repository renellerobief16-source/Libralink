import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiMenu, FiX, FiHome, FiInfo, FiBook, FiMail, FiUser } from "react-icons/fi";

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Home", icon: FiHome },
    { to: "/about", label: "About", icon: FiInfo },
    { to: "/library", label: "Library", icon: FiBook },
    { to: "/contact", label: "Contact", icon: FiMail },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between sm:h-[72px]">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setIsOpen(false)}>
            <img src="/L.png" alt="Libralink Logo" className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
            <span className="min-w-0"><span className="block text-lg font-semibold leading-5 tracking-[-0.02em] text-[#0F172A]">Libralink</span><span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[.12em] text-slate-400 sm:block">Connected libraries</span></span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${location.pathname === link.to ? "border-[#0077B6] text-[#0077B6]" : "border-transparent text-[#64748B] hover:text-[#0077B6]"}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="hidden md:flex items-center">
            <Link
              to="/login"
              className="flex min-h-10 items-center gap-2 bg-[#0077B6] px-4 text-sm font-medium text-white transition hover:bg-[#00669d]"
            >
              <FiUser className="w-4 h-4" />
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-10 w-10 items-center justify-center border border-slate-200 text-[#64748B] transition-colors hover:border-[#0077B6] hover:text-[#0077B6] md:hidden"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="public-navigation-menu"
          >
            {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div id="public-navigation-menu" className="space-y-1 border-t border-[#E2E8F0] bg-white py-3 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex min-h-11 items-center gap-3 px-3 text-sm font-medium ${location.pathname === link.to ? "bg-[#E0F2FE] text-[#0077B6]" : "text-[#64748B]"}`}
                onClick={() => setIsOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#E2E8F0]">
              <Link
                to="/login"
                className="flex min-h-11 items-center justify-center gap-2 bg-[#0077B6] px-5 text-sm font-medium text-white"
                onClick={() => setIsOpen(false)}
              >
                <FiUser className="w-4 h-4" />
                Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;
