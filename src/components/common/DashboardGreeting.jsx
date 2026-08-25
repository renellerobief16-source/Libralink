import { FiBookOpen, FiDatabase, FiShield } from 'react-icons/fi';

function DashboardGreeting() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const firstName = currentUser.first_name || 'Super';

  return (
    <div className="flex-1 flex items-center gap-6">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">
          Welcome back, Super Admin! 
        </h1>
        <p className="text-base text-slate-600 mb-3">
          Great to see you again!
        </p>
        <p className="text-sm text-slate-500 mb-2 max-w-xl">
          Here's what's happening across your multi-school library system.
          Stay informed, stay in control, and keep our libraries connected.
        </p>
        <p className="text-xs text-blue-600">
          You're doing great managing the system today.
        </p>
      </div>
      
      {/* Admin Image */}
      <div className="hidden lg:flex items-center justify-center w-60 h-60  overflow-hidden">
        <img 
          src="/admin.png" 
          alt="Admin" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563EB"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
          }}
        />
      </div>
    </div>
  );
}

export default DashboardGreeting;
