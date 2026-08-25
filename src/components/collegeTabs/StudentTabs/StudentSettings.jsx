function StudentSettings({ onLogout }) {
  return (
    <div className="animate-slide-up">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0f172a] mb-4 sm:mb-6">Settings</h1>
      
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xl mb-4">
        <h3 className="font-semibold text-[#0f172a] mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[#0f172a]">Dark Mode</p>
            <p className="text-sm text-slate-600">Toggle dark mode theme</p>
          </div>
          <button 
            className="w-12 h-6 rounded-full transition-colors bg-gray-300"
          >
            <div className="w-5 h-5 rounded-full bg-white transition-transform translate-x-0.5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xl">
        <h3 className="font-semibold text-[#0f172a] mb-4">Account</h3>
        <button
          onClick={onLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default StudentSettings;
