import { Routes, Route, Link, Navigate } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";

// Pages
import Home from "./components/pages/Home";
import About from "./components/pages/About";
import Library from "./components/pages/Library";
import Contact from "./components/pages/Contact";
import Login from "./components/pages/Login";
import BookDetail from "./components/pages/BookDetail";

// User Portals
import Admin from "./components/portals/admin/Admin";
import LibrarianPortal from "./components/portals/admin/LibrarianPortal";
import LibrarianAdminPortal from "./components/portals/admin/LibrarianAdminPortal";
import StudentPortal from "./components/portals/student/StudentPortal";
import StudentOnboarding from "./components/portals/student/StudentOnboarding";

function App() {
  return (
    <NotificationProvider>
      <div className="min-h-screen">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Home />} />

          {/* Main Pages */}
          <Route path="/about" element={<About />} />
          <Route path="/library" element={<Library />} />
          <Route path="/contact" element={<Contact />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />

          {/* User Portals - Updated Routes */}
          
          {/* Super Admin Portal */}
          <Route path="/superadmin" element={<Admin />} />
          
          {/* Librarian Admin Portal */}
          <Route path="/librarian-admin" element={<LibrarianAdminPortal />} />
          
          {/* Librarian Portal */}
          <Route path="/librarian" element={<LibrarianPortal />} />
          
          {/* Student Portal */}
          <Route path="/student-onboarding" element={<StudentOnboarding />} />
          <Route path="/studentpage/*" element={<StudentPortal />} />

          {/* Book Detail Page */}
          <Route path="/book/:bookId" element={<BookDetail />} />

          {/* Legacy Routes - Redirect to new routes */}
          <Route path="/admin/portal" element={<Navigate to="/librarian" replace />} />
          <Route path="/admin" element={<Navigate to="/librarian" replace />} />
          <Route path="/student/portal" element={<Navigate to="/studentpage" replace />} />
          <Route path="/librarian-admin/portal" element={<Navigate to="/librarian-admin" replace />} />
          <Route path="/student" element={<Navigate to="/studentpage" replace />} />
          <Route path="/dashboard" element={<Navigate to="/login" replace />} />

          {/* Future Pages */}
          {/*
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/books" element={<Books />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          */}

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
                <span className="text-xs font-semibold tracking-[0.18em] uppercase mb-4 text-blue-400">
                  Page not found
                </span>
                <h1 className="text-7xl md:text-8xl font-semibold mb-4">
                  404
                </h1>
                <p className="text-gray-300 mb-8 max-w-md">
                  This page doesn't exist or has been moved to a different shelf.
                </p>
                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl font-semibold transition-transform hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Back to the catalog
                </Link>
              </div>
            }
          />
        </Routes>
      </div>
    </NotificationProvider>
  );
}

export default App;