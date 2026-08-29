import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, Database, Share2, Shield } from 'lucide-react';

export default function StudentPrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Introduction',
      content:
        'Libralink ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform. Please read this policy carefully. If you do not agree with our policies and practices, please do not use our service.',
      icon: Lock,
    },
    {
      title: '2. Information We Collect',
      content:
        'We collect various types of information in connection with your use of Libralink:\n\n• Personal Information: Name, email address, phone number, profile picture, school/institution\n• Account Information: Username, password (encrypted), account preferences\n• Borrowing Data: Books borrowed, return dates, borrowing history\n• Device Information: Device type, operating system, browser type, IP address\n• Usage Information: Pages visited, features used, search queries, interaction data',
      icon: Database,
    },
    {
      title: '3. How We Use Your Information',
      content:
        'We use the information we collect for various purposes:\n\n• Providing and maintaining our service\n• Processing borrowing requests and managing your account\n• Sending administrative information and updates\n• Responding to your inquiries and customer support requests\n• Monitoring and analyzing usage patterns for service improvement\n• Detecting and preventing fraudulent transactions and abuse\n• Complying with legal obligations',
      icon: Eye,
    },
    {
      title: '4. Data Security',
      content:
        'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All sensitive data is encrypted using industry-standard protocols. However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.',
      icon: Shield,
    },
    {
      title: '5. Sharing Your Information',
      content:
        'We do not sell, trade, or rent your personal information to third parties. We may share your information with:\n\n• Service providers who assist us in operating our website and conducting our business\n• Educational institutions for verification purposes\n• Legal authorities when required by law\n• Other users only to the extent necessary for library functionality (e.g., book availability to authorized users)',
      icon: Share2,
    },
    {
      title: '6. Your Privacy Rights',
      content:
        'You have the right to:\n\n• Access the personal information we hold about you\n• Request correction of inaccurate data\n• Request deletion of your data (subject to legal retention requirements)\n• Opt-out of marketing communications\n• Download a copy of your data in a portable format\n\nTo exercise these rights, contact our support team with your request.',
    },
    {
      title: '7. Cookies and Tracking',
      content:
        'Libralink uses cookies and similar tracking technologies to enhance your experience. Cookies help us remember your preferences and understand how you use our service. You can control cookie settings through your browser. Disabling cookies may limit your ability to use certain features.',
    },
    {
      title: '8. Third-Party Links',
      content:
        'Our platform may contain links to third-party websites. This Privacy Policy applies only to Libralink. We are not responsible for the privacy practices of other websites. We encourage you to review the privacy policies of any third-party sites before providing your information.',
    },
    {
      title: '9. Children\'s Privacy',
      content:
        'Libralink is intended for educational institutions. If a minor uses our service through a school account, parents/guardians may request information about what data we collect. We do not knowingly collect personal information from children under 13 without parental consent.',
    },
    {
      title: '10. Data Retention',
      content:
        'We retain your personal information only as long as necessary to fulfill the purposes for which it was collected, or as required by law. Borrowing history is retained for audit purposes. You can request data deletion, subject to legal and operational requirements.',
    },
    {
      title: '11. International Transfers',
      content:
        'Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where privacy laws may differ. By using Libralink, you consent to any such transfer of your information.',
    },
    {
      title: '12. Changes to This Policy',
      content:
        'We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last Updated" date of this Privacy Policy. Your continued use of Libralink following the posting of revised Privacy Policy means that you accept and agree to the changes.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-4xl font-bold text-slate-900">Privacy Policy</h1>
        </div>

        {/* Last Updated */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8 border-l-4 border-green-500">
          <p className="text-slate-600">
            <strong>Last Updated:</strong> August 30, 2026
          </p>
          <p className="text-slate-600 mt-2">
            Your privacy is important to us. This policy describes how Libralink collects, uses, and
            protects your personal information.
          </p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900">Secure Data Handling</h3>
                <p className="text-sm text-slate-600">All personal data encrypted and protected</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900">Your Control</h3>
                <p className="text-sm text-slate-600">Access and manage your data anytime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex gap-3 mb-3">
                  {IconComponent && (
                    <IconComponent className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                  )}
                  <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                </div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm p-8 mt-12">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">Privacy Questions?</h3>
          <p className="text-slate-700 mb-4">
            If you have any questions about our Privacy Policy or how we handle your data, please
            reach out to our privacy team.
          </p>
          <button
            onClick={() => navigate('/studentpage/help')}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Get in Touch
          </button>
        </div>

        {/* Footer Links */}
        <div className="flex gap-6 justify-center mt-12 text-sm">
          <button
            onClick={() => navigate('/studentpage/terms')}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Terms of Service
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => navigate('/studentpage/about')}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            About Libralink
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => navigate('/studentpage/help')}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Help & Support
          </button>
        </div>
      </div>
    </div>
  );
}
