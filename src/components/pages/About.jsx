import { FiBook, FiUsers, FiTarget, FiAward, FiMail, FiArrowRight } from "react-icons/fi";
import Navigation from "./Navigation";

function About() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      
      {/* Header Section */}
      <div className="pt-28 pb-12 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] mb-4">About Libralink</h1>
          <p className="text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto">
            Empowering libraries with intelligent navigation solutions since 2024
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Our Mission</h2>
              <p className="text-base text-[#64748B] mb-4 leading-relaxed">
                Libralink was founded with a simple yet powerful vision: to make every library book easily discoverable and accessible to everyone.
              </p>
              <p className="text-base text-[#64748B] mb-4 leading-relaxed">
                We believe that knowledge should never be hidden behind complex cataloging systems or confusing shelf layouts. Our smart navigation system bridges the gap between digital catalogs and physical library spaces.
              </p>
              <p className="text-base text-[#64748B] leading-relaxed">
                By combining cutting-edge technology with user-centered design, we're transforming how students, researchers, and library visitors interact with library collections.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiTarget className="text-[#0077B6] text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Our Vision</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">To create a world where every library book is just a few clicks away from being found.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiUsers className="text-[#0077B6] text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Our Community</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">Serving over 50 libraries and 100,000+ students across the nation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiAward className="text-[#0077B6] text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Our Achievement</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">Award-winning library technology recognized by the Library Innovation Awards 2025.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Our Values</h2>
            <p className="text-base text-[#64748B] max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FiBook,
                title: "Accessibility First",
                description: "We believe library resources should be accessible to everyone, regardless of technical expertise."
              },
              {
                icon: FiUsers,
                title: "Community Driven",
                description: "Our solutions are built with feedback from librarians, students, and researchers."
              },
              {
                icon: FiTarget,
                title: "Innovation Focused",
                description: "We continuously push the boundaries of what's possible in library technology."
              }
            ].map((value, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-[#0077B6]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-3">{value.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#0077B6] to-[#0096C7] rounded-2xl p-8 sm:p-12 shadow-lg">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Join Our Journey</h2>
            <p className="text-lg text-white/90 mb-8">
              We're always looking for libraries and institutions to partner with us in revolutionizing library navigation.
            </p>
            <a
              href="mailto:contact@libralink.com"
              className="inline-flex items-center gap-2 bg-white text-[#0077B6] px-8 py-3 rounded-xl font-semibold text-base transition-all hover:shadow-lg"
            >
              <FiMail className="w-5 h-5" />
              <span>Partner With Us</span>
              <FiArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
