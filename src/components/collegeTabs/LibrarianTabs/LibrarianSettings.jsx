import { useState, useEffect } from "react";
import {
  FiUser, FiLock, FiBell, FiMoon, FiSun, FiShield, FiCheck, FiX,
  FiEye, FiEyeOff, FiCamera, FiSave, FiAlertCircle, FiCheckCircle,
  FiMail, FiPhone, FiBookOpen, FiGrid, FiRefreshCw, FiSliders
} from "react-icons/fi";
import api, { changePassword, getBackendAssetUrl } from "../../../utils/api";

function LibrarianSettings({ darkMode, onToggleDarkMode, userInfo: initialUserInfo, schoolInfo: initialSchoolInfo }) {
  const [activeSubTab, setActiveSubTab] = useState("profile"); // 'profile' | 'security' | 'notifications' | 'appearance'

  // User & School state
  const [userInfo, setUserInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      return stored ? JSON.parse(stored) : initialUserInfo || {};
    } catch {
      return initialUserInfo || {};
    }
  });

  const [schoolInfo, setSchoolInfo] = useState(initialSchoolInfo || null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstname: userInfo?.firstname || "",
    lastname: userInfo?.lastname || "",
    email: userInfo?.email || "",
    contact_number: userInfo?.contact_number || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileImageUploading, setProfileImageUploading] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("libralink_librarian_notifications");
      return saved ? JSON.parse(saved) : {
        newBorrowRequests: true,
        overdueAlerts: true,
        consortiumUpdates: true,
        emailNotifications: false,
      };
    } catch {
      return {
        newBorrowRequests: true,
        overdueAlerts: true,
        consortiumUpdates: true,
        emailNotifications: false,
      };
    }
  });

  // Appearance State
  const [density, setDensity] = useState(() => {
    return localStorage.getItem("libralink_density") || "comfortable";
  });

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState({ show: false, type: "success", message: "" });

  const showFeedback = (type, message) => {
    setFeedback({ show: true, type, message });
    setTimeout(() => {
      setFeedback({ show: false, type: "success", message: "" });
    }, 4500);
  };

  // Sync profileForm when userInfo changes
  useEffect(() => {
    if (userInfo) {
      setProfileForm({
        firstname: userInfo.firstname || "",
        lastname: userInfo.lastname || "",
        email: userInfo.email || "",
        contact_number: userInfo.contact_number || "",
      });
    }
  }, [userInfo]);

  // Load fresh user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem("currentUserId") || userInfo?.user_id || userInfo?.id;
      if (!userId) return;

      try {
        const res = await api.get(`/users/${userId}`);
        if (res.data) {
          setUserInfo(res.data);
          localStorage.setItem("currentUser", JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn("Could not refresh user profile:", err);
      }
    };

    fetchUserData();
  }, []);

  // Password validation checks
  const passwordValidation = {
    length: passwordForm.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordForm.newPassword),
    lowercase: /[a-z]/.test(passwordForm.newPassword),
    number: /[0-9]/.test(passwordForm.newPassword),
  };
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  // Profile Save Handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const userId = localStorage.getItem("currentUserId") || userInfo?.user_id || userInfo?.id;
      if (!userId) throw new Error("User credentials missing. Please re-login.");

      const response = await api.put(`/users/${userId}`, {
        firstname: profileForm.firstname.trim(),
        lastname: profileForm.lastname.trim(),
        email: profileForm.email.trim(),
        contact_number: profileForm.contact_number.trim(),
      });

      if (response.success || response.data) {
        const updatedUser = {
          ...userInfo,
          firstname: profileForm.firstname.trim(),
          lastname: profileForm.lastname.trim(),
          email: profileForm.email.trim(),
          contact_number: profileForm.contact_number.trim(),
        };
        setUserInfo(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        showFeedback("success", "Profile details updated successfully!");
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Error updating profile";
      showFeedback("error", errMsg);
    } finally {
      setProfileSaving(false);
    }
  };

  // Profile Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showFeedback("error", "Please select a valid image file (PNG, JPG, JPEG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback("error", "Image file must be less than 5MB");
      return;
    }

    setProfileImageUploading(true);
    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      const response = await api.post("/users/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newImageUrl = response.profile_picture || response.profile_image || response.data?.profile_picture;
      if (newImageUrl) {
        const updatedUser = {
          ...userInfo,
          profile_picture: newImageUrl,
          profile_image: newImageUrl,
        };
        setUserInfo(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        showFeedback("success", "Profile picture updated successfully!");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to upload profile picture";
      showFeedback("error", errMsg);
    } finally {
      setProfileImageUploading(false);
    }
  };

  // Password Submit Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      showFeedback("error", "Please enter your current password");
      return;
    }

    if (!isPasswordValid) {
      showFeedback("error", "New password does not meet the security criteria");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback("error", "New password and confirmation password do not match");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      showFeedback("error", "New password must be different from your current password");
      return;
    }

    setPasswordSaving(true);
    try {
      const userId = localStorage.getItem("currentUserId") || userInfo?.user_id || userInfo?.id;
      
      // Try direct user password update endpoint
      const response = await api.put(`/users/${userId}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.success || response.data) {
        showFeedback("success", "Your password has been changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(response.message || "Failed to change password");
      }
    } catch (err) {
      // Fallback to auth change-password endpoint if needed
      try {
        const authRes = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
        if (!authRes.error) {
          showFeedback("success", "Your password has been changed successfully!");
          setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          return;
        }
      } catch {
        // Continue to error reporting below
      }

      const errMsg = err.response?.data?.message || err.message || "Failed to change password. Please verify current password.";
      showFeedback("error", errMsg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // Notification Toggle Handler
  const handleNotificationToggle = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("libralink_librarian_notifications", JSON.stringify(updated));
      return updated;
    });
    showFeedback("success", "Notification preference saved");
  };

  // Density Toggle Handler
  const handleDensityChange = (newDensity) => {
    setDensity(newDensity);
    localStorage.setItem("libralink_density", newDensity);
    showFeedback("success", `Display density set to ${newDensity}`);
  };

  const currentProfilePic = userInfo?.profile_picture || userInfo?.profile_image;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FiSliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Librarian Settings</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                Staff Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal staff credentials, password security, and interface preferences
            </p>
          </div>
        </div>

        {/* Quick Institutional Lock Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <FiShield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Institutional Access</span>
            <span className="font-semibold text-slate-800 truncate block">
              {schoolInfo?.school_name || localStorage.getItem("schoolName") || "Assigned Campus"}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Notification / Feedback Toast */}
      {feedback.show && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-200 shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-red-50/90 border-red-200 text-red-900"
          }`}
        >
          {feedback.type === "success" ? (
            <FiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p className="text-xs font-semibold flex-1">{feedback.message}</p>
          <button
            type="button"
            onClick={() => setFeedback({ show: false, type: "success", message: "" })}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Studio Tab Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === "profile"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FiUser className="w-4 h-4" />
            <span>Profile Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === "security"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FiLock className="w-4 h-4" />
            <span>Password & Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("notifications")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === "notifications"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FiBell className="w-4 h-4" />
            <span>Staff Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("appearance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === "appearance"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <FiMoon className="w-4 h-4" />
            <span>Theme & Display</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8">
          {/* ========================================================= */}
          {/* SUB-TAB 1: PROFILE DETAILS                                */}
          {/* ========================================================= */}
          {activeSubTab === "profile" && (
            <div className="space-y-8">
              {/* Profile Avatar Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/40 border border-blue-100/80">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden bg-white border-2 border-white shadow-md flex items-center justify-center">
                    {currentProfilePic ? (
                      <img
                        src={getBackendAssetUrl(currentProfilePic)}
                        alt="Librarian Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-600 text-white font-bold text-3xl flex items-center justify-center">
                        {userInfo?.firstname?.[0] || "L"}
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="librarian-avatar-upload"
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer transition-transform hover:scale-105"
                    title="Change profile picture"
                  >
                    <FiCamera className="w-3.5 h-3.5" />
                    <input
                      id="librarian-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={profileImageUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <FiShield className="w-3 h-3" />
                    Authorized Librarian
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {userInfo?.firstname} {userInfo?.lastname || ""}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{userInfo?.email || "No email registered"}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click the camera icon to upload a JPG or PNG avatar (Max 5MB)
                  </p>
                </div>
              </div>

              {/* Editable Profile Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Staff Information</h4>
                  <p className="text-xs text-slate-500">Update your official librarian contact details</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.firstname}
                      onChange={(e) => setProfileForm({ ...profileForm, firstname: e.target.value })}
                      placeholder="e.g. Maria"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.lastname}
                      onChange={(e) => setProfileForm({ ...profileForm, lastname: e.target.value })}
                      placeholder="e.g. Santos"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="librarian@institution.edu"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Number
                    </label>
                    <div className="relative">
                      <FiPhone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={profileForm.contact_number}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                        placeholder="0912 345 6789"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Campus Information (Read-only security lock) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Campus Binding
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Assigned Campus:</span>
                      <span className="font-bold text-slate-800">
                        {schoolInfo?.school_name || "Institution Campus"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Campus Code:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {schoolInfo?.school_code || "SCH"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4" />
                    {profileSaving ? "Saving Changes..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUB-TAB 2: PASSWORD & SECURITY                            */}
          {/* ========================================================= */}
          {activeSubTab === "security" && (
            <div className="space-y-8 max-w-2xl">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Change Account Password</h4>
                <p className="text-xs text-slate-500">
                  Keep your librarian counter access protected by updating to a strong, unique password
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.current ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new strong password"
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.new ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Password Security Criteria
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${passwordValidation.length ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordValidation.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                        ✓
                      </span>
                      <span>8+ characters</span>
                    </div>

                    <div className={`flex items-center gap-2 ${passwordValidation.uppercase ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordValidation.uppercase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                        ✓
                      </span>
                      <span>1 uppercase letter (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${passwordValidation.lowercase ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordValidation.lowercase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                        ✓
                      </span>
                      <span>1 lowercase letter (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${passwordValidation.number ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordValidation.number ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"}`}>
                        ✓
                      </span>
                      <span>1 number (0-9)</span>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-type new password"
                      className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.confirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving || !isPasswordValid || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <FiLock className="w-4 h-4" />
                    {passwordSaving ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUB-TAB 3: STAFF ALERTS & NOTIFICATIONS                   */}
          {/* ========================================================= */}
          {activeSubTab === "notifications" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Staff Alert Preferences</h4>
                <p className="text-xs text-slate-500">
                  Control which operational events trigger alerts in your librarian inbox and bell notifications
                </p>
              </div>

              <div className="space-y-4">
                {/* New Borrow Requests */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-slate-900 block">Borrow & Reservation Alerts</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Receive immediate alerts whenever a student places a new book borrow request.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.newBorrowRequests}
                    onClick={() => handleNotificationToggle("newBorrowRequests")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.newBorrowRequests ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                        notifications.newBorrowRequests ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Overdue Alerts */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-slate-900 block">Overdue Book Alerts</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Notify staff when borrowed items exceed loan period without return.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.overdueAlerts}
                    onClick={() => handleNotificationToggle("overdueAlerts")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.overdueAlerts ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                        notifications.overdueAlerts ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Consortium Updates */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-slate-900 block">Consortium Announcements</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Broadcast notices from partner institutional libraries and administrative bulletins.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications.consortiumUpdates}
                    onClick={() => handleNotificationToggle("consortiumUpdates")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.consortiumUpdates ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                        notifications.consortiumUpdates ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUB-TAB 4: APPEARANCE & DISPLAY                           */}
          {/* ========================================================= */}
          {activeSubTab === "appearance" && (
            <div className="space-y-8 max-w-2xl">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Display & Theme Preferences</h4>
                <p className="text-xs text-slate-500">
                  Customize the visual styling and layout density of your librarian workstation
                </p>
              </div>

              {/* Theme Mode Switcher */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Interface Theme
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (darkMode && onToggleDarkMode) onToggleDarkMode();
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      !darkMode
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <FiSun className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Light Workstation</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">High clarity for daytime cataloging</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!darkMode && onToggleDarkMode) onToggleDarkMode();
                    }}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      darkMode
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FiMoon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Dark Studio</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Reduced eye strain in low-light environments</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Table / Catalog Density */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Catalog Display Density
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleDensityChange("comfortable")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      density === "comfortable"
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <FiGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Comfortable View</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Spacious padding with detailed covers</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDensityChange("compact")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      density === "compact"
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                      <FiSliders className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Compact Data Density</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">High row density for rapid inventory checks</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibrarianSettings;
