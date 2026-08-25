import { FiMail, FiPhone, FiMapPin, FiSend, FiClock, FiMessageSquare, FiHelpCircle } from "react-icons/fi";
import Navigation from "./Navigation";

function Contact() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      
      {/* Header Section */}
      <div className="pt-28 pb-12 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] mb-4">Contact Us</h1>
          <p className="text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto">
            Get in touch with our team for support, partnerships, or general inquiries
          </p>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Get in Touch</h2>
              
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiMail className="text-[#0077B6] text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Email</h3>
                      <p className="text-sm text-[#64748B]">support@libralink.com</p>
                      <p className="text-sm text-[#64748B]">partnerships@libralink.com</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiPhone className="text-[#0077B6] text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Phone</h3>
                      <p className="text-sm text-[#64748B]">+1 (555) 123-4567</p>
                      <p className="text-sm text-[#64748B]">Mon-Fri, 9am-5pm EST</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiMapPin className="text-[#0077B6] text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Office</h3>
                      <p className="text-sm text-[#64748B]">123 Innovation Drive</p>
                      <p className="text-sm text-[#64748B]">San Francisco, CA 94102</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6]/10 to-[#0096C7]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiClock className="text-[#0077B6] text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Business Hours</h3>
                      <p className="text-sm text-[#64748B]">Monday - Friday: 9:00 AM - 5:00 PM</p>
                      <p className="text-sm text-[#64748B]">Saturday: 10:00 AM - 2:00 PM</p>
                      <p className="text-sm text-[#64748B]">Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Send us a Message</h2>
                <form className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#0F172A] mb-2">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-2">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-[#0F172A] mb-2">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#0F172A] mb-2">Message</label>
                    <textarea
                      id="message"
                      rows="5"
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 transition-all resize-none text-sm"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#0077B6] hover:bg-[#005f8f] text-white py-3 rounded-xl font-semibold transition-all shadow-md shadow-[#0077B6]/20 hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                  >
                    <FiSend className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support CTA Section */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#0077B6] to-[#0096C7] rounded-2xl p-8 sm:p-12 shadow-lg">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Need Immediate Support?</h2>
            <p className="text-lg text-white/90 mb-8">
              Check our comprehensive FAQ section or start a live chat with our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center gap-2 bg-white text-[#0077B6] px-8 py-3 rounded-xl font-semibold text-base transition-all hover:shadow-lg">
                <FiHelpCircle className="w-5 h-5" />
                <span>View FAQ</span>
              </button>
              <button className="flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-base transition-all hover:bg-white/10">
                <FiMessageSquare className="w-5 h-5" />
                <span>Start Live Chat</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;
