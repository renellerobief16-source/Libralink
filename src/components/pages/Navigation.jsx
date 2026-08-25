import { useState } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX, FiHome, FiStar, FiInfo, FiBook, FiMail, FiUser } from "react-icons/fi";

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home", icon: FiHome },
    { to: "/#features", label: "Features", icon: FiStar },
    { to: "/about", label: "About", icon: FiInfo },
    { to: "/library", label: "Library", icon: FiBook },
    { to: "/contact", label: "Contact", icon: FiMail },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/L.png" alt="Libralink Logo" className="w-10 h-10 object-cover" />
            <span className="text-xl font-bold text-[#0F172A]">Libralink</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 px-4 py-2 text-[#64748B] hover:text-[#0077B6] hover:bg-[#F8FAFC] rounded-lg transition-all text-sm font-medium"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="hidden md:flex items-center">
            <Link
              to="/login"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0077B6] hover:bg-[#005f8f] text-white rounded-xl font-medium transition-all shadow-md shadow-[#0077B6]/20 hover:shadow-lg text-sm"
            >
              <FiUser className="w-4 h-4" />
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-[#64748B] hover:text-[#0077B6] p-2 transition-colors rounded-lg hover:bg-[#F8FAFC]"
          >
            {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-[#E2E8F0]">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 px-4 py-3 text-[#64748B] hover:text-[#0077B6] hover:bg-[#F8FAFC] rounded-lg transition-all text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#E2E8F0]">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[#0077B6] hover:bg-[#005f8f] text-white rounded-xl font-medium transition-all shadow-md text-sm"
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
