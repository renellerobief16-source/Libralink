import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function StudentTermsOfService() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content:
        'By accessing and using Libralink, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
    },
    {
      title: '2. Use License',
      content:
        'Permission is granted to temporarily download one copy of the materials (information or software) on Libralink for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:\n• Modify or copy the materials\n• Use the materials for any commercial purpose or for any public display\n• Attempt to decompile or reverse engineer any software contained on Libralink\n• Remove any copyright or other proprietary notations from the materials\n• Transfer the materials to another person or "mirror" the materials on any other server',
    },
    {
      title: '3. Disclaimer',
      content:
        'The materials on Libralink are provided on an "as is" basis. Libralink makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.',
    },
    {
      title: '4. Limitations',
      content:
        'In no event shall Libralink or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Libralink, even if Libralink or an authorized representative has been notified orally or in writing of the possibility of such damage.',
    },
    {
      title: '5. Accuracy of Materials',
      content:
        'The materials appearing on Libralink could include technical, typographical, or photographic errors. Libralink does not warrant that any of the materials on its website are accurate, complete, or current. Libralink may make changes to the materials contained on its website at any time without notice.',
    },
    {
      title: '6. Materials and Links',
      content:
        'Libralink has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Libralink of the site. Use of any such linked website is at the user\'s own risk.',
    },
    {
      title: '7. Modifications',
      content:
        'Libralink may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.',
    },
    {
      title: '8. Governing Law',
      content:
        'These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction where Libralink operates, and you irrevocably submit to the exclusive jurisdiction of the courts located in that location.',
    },
    {
      title: '9. User Responsibilities',
      content:
        'You are responsible for maintaining the confidentiality of your account information and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password. You must notify Libralink immediately of any unauthorized uses of your account.',
    },
    {
      title: '10. Borrowing Policies',
      content:
        'Users agree to follow all library borrowing policies and regulations. This includes returning books by the due date, maintaining the condition of borrowed materials, and paying any fines or fees associated with overdue or damaged books. Failure to comply may result in account suspension.',
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
          <h1 className="text-4xl font-bold text-slate-900">Terms of Service</h1>
        </div>

        {/* Last Updated */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8 border-l-4 border-blue-500">
          <p className="text-slate-600">
            <strong>Last Updated:</strong> August 30, 2026
          </p>
          <p className="text-slate-600 mt-2">
            Please read these terms carefully before using Libralink. Your access and use of the
            platform constitutes your agreement to be bound by these terms.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{section.title}</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-8 mt-12">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">Questions About These Terms?</h3>
          <p className="text-slate-700 mb-4">
            If you have any questions or concerns about our Terms of Service, please don't hesitate
            to contact our support team.
          </p>
          <button
            onClick={() => navigate('/studentpage/help')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Contact Support
          </button>
        </div>

        {/* Footer Links */}
        <div className="flex gap-6 justify-center mt-12 text-sm">
          <button
            onClick={() => navigate('/studentpage/privacy')}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Privacy Policy
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
