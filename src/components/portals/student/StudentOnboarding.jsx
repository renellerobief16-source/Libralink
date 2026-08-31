import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCamera, FiCheckCircle, FiCheck } from 'react-icons/fi';
import api, { updateProfilePicture, updateUserProfile, getBackendAssetUrl } from '../../../utils/api';

function isOnboardingComplete(user) {
  if (!user) return false;

  const username = user.username || user.name || user.first_name || '';
  const cellphone = user.contact_number || '';
  const recoveryEmail = user.recovery_email || user.email || '';
  const profilePicture = user.profile_picture || user.profile_image || '';
  const policyAccepted = !!user.policy_accepted;

  return !!(username.trim() && cellphone.trim() && recoveryEmail.trim() && profilePicture && policyAccepted);
}

const requestDesktopFullscreen = () => {
  const docEl = document.documentElement;
  const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;

  if (typeof requestFS === 'function') {
    requestFS.call(docEl);
  }
};

function StudentOnboarding() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [form, setForm] = useState({
    username: '',
    cellphone: '',
    recoveryEmail: '',
    policyAccepted: false,
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const handleSendVerificationCode = async () => {
    if (!form.recoveryEmail.trim()) {
      setVerificationError('Please enter your Gmail account first.');
      return;
    }

    setSendingCode(true);
    setVerificationError('');

    try {
      const token = localStorage.getItem('token');
      const normalizedEmail = form.recoveryEmail.trim().toLowerCase();
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/auth/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recovery_email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setVerificationError('');
        if (data.code) {
          console.log('Verification code:', data.code);
        }
      } else {
        setVerificationError(data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setVerificationError('Network error. Please check your connection.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setVerificationError('Please enter a valid 6-digit code.');
      return;
    }

    setVerifyingCode(true);
    setVerificationError('');

    try {
      const token = localStorage.getItem('token');
      const normalizedEmail = form.recoveryEmail.trim().toLowerCase();
      const normalizedCode = verificationCode.trim();
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          recovery_email: normalizedEmail,
          code: normalizedCode 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailVerified(true);
        setVerificationError('');
        setVerificationCode('');
        setCodeSent(false);
        setCurrentStep(4);
      } else {
        setVerificationError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setVerificationError('Network error. Please check your connection.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const steps = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'username', label: 'Username' },
    { key: 'cellphone', label: 'Cellphone Number' },
    { key: 'email', label: 'Gmail Account' },
    { key: 'photo', label: 'Profile Picture' },
    { key: 'policy', label: 'Policy' },
  ];

  const stepLabels = ['Welcome', 'Username', 'Cellphone', 'Recovery email', 'Photo', 'Policy'];

  const reminders = {
    welcome: 'Welcome to Libralink. Please complete these details to personalize your account and access the library system.',
    username: 'Create a unique username that others can recognize.',
    cellphone: 'Enter your active mobile number in case we need to contact you.',
    email: 'Use a valid Gmail account for password recovery and account safety.',
    photo: 'Upload a clear profile photo so your account is easy to recognize.',
    policy: 'Review the terms carefully before continuing. You must agree before entering the system.',
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUserInfo(parsedUser);
    setForm({
      username: parsedUser.username || parsedUser.name || parsedUser.first_name || '',
      cellphone: parsedUser.contact_number || '',
      recoveryEmail: parsedUser.recovery_email || parsedUser.email || '',
      policyAccepted: !!parsedUser.policy_accepted,
    });
    setPreview(parsedUser.profile_picture || parsedUser.profile_image || '');

    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      api.get(`/schools/${schoolId}`)
        .then((response) => {
          const schoolData = response?.data || response;
          setSchoolInfo(schoolData);
        })
        .catch(() => setSchoolInfo(null));
    }

    if (isOnboardingComplete(parsedUser)) {
      navigate('/studentpage');
    }
  }, [navigate]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.username.trim()) {
      alert('Please enter your username.');
      return;
    }

    if (!form.cellphone.trim()) {
      alert('Please enter your cellphone number.');
      return;
    }

    if (!form.recoveryEmail.trim()) {
      alert('Please enter your Gmail account.');
      return;
    }

    if (!photo && !preview) {
      alert('Please upload a profile picture.');
      return;
    }

    if (!form.policyAccepted) {
      alert('Please accept the policy before continuing.');
      return;
    }

    try {
      setLoading(true);

      let uploadedPicture = userInfo?.profile_picture || userInfo?.profile_image || preview || '';
      if (photo) {
        const { data, error } = await updateProfilePicture(photo);
        if (error) throw error;
        uploadedPicture = data?.profile_picture || data?.profile_image || uploadedPicture;
      }

      const userId = userInfo?.user_id || userInfo?.id || Number(localStorage.getItem('currentUserId'));
      const cleanedEmail = form.recoveryEmail.trim();
      const payload = {
        username: form.username.trim(),
        contact_number: form.cellphone.trim(),
        recovery_email: cleanedEmail,
        profile_picture: uploadedPicture,
        profile_image: uploadedPicture,
        policy_accepted: true,
      };

      if (userId) {
        const { error } = await updateUserProfile(userId, payload);
        if (error) throw error;
      }

      const updatedUser = {
        ...userInfo,
        ...payload,
        username: payload.username,
        contact_number: payload.contact_number,
        recovery_email: payload.recovery_email,
        profile_picture: uploadedPicture,
        profile_image: uploadedPicture,
        policy_accepted: true,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      requestDesktopFullscreen();
      navigate('/studentpage');
    } catch (error) {
      console.error('Student onboarding error:', error);
      alert(error.message || 'Unable to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !form.username.trim()) {
      alert('Please enter your username.');
      return;
    }

    if (currentStep === 2 && !form.cellphone.trim()) {
      alert('Please enter your cellphone number.');
      return;
    }

    if (currentStep === 3 && !form.recoveryEmail.trim()) {
      alert('Please enter your Gmail account.');
      return;
    }

    if (currentStep === 3 && !emailVerified) {
      if (!codeSent) {
        handleSendVerificationCode();
      } else {
        alert('Please verify your Gmail account before continuing.');
      }
      return;
    }

    if (currentStep === 4 && !photo && !preview) {
      alert('Please upload a profile picture.');
      return;
    }

    if (currentStep === 5) {
      if (!form.policyAccepted) {
        alert('Please accept the policy before continuing.');
        return;
      }
      handleSubmit();
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-blue-50 p-2 shadow-sm">
            <img src="/L.png" alt="Libralink Logo" className="h-full w-full rounded-full object-cover" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0077B6]">Student setup</p>
            <h1 className="text-3xl font-semibold tracking-[-.03em] text-slate-900">Welcome to Libralink</h1>
            <p className="text-sm leading-6 text-slate-600">
              Welcome to Libralink. Before you can access your library account, we need a few details to complete your profile and keep your account secure.
            </p>
            <p className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
              This quick setup helps you log in smoothly and recover your account if needed.
            </p>
          </div>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.username}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
              className="min-h-12 w-full border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
            />
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.cellphone}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Cellphone Number</label>
            <input
              type="tel"
              value={form.cellphone}
              onChange={(e) => setForm({ ...form, cellphone: e.target.value })}
              placeholder="09xxxxxxxxx"
              className="min-h-12 w-full border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
            />
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.email}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Gmail Account</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={form.recoveryEmail}
                onChange={(e) => {
                  setForm({ ...form, recoveryEmail: e.target.value });
                  setEmailVerified(false);
                  setCodeSent(false);
                  setVerificationCode('');
                  setVerificationError('');
                }}
                placeholder="you@gmail.com"
                className="min-h-12 flex-1 border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
                disabled={emailVerified}
              />
              {emailVerified && (
                <div className="flex items-center justify-center px-3 text-green-600">
                  <FiCheck className="w-5 h-5" />
                </div>
              )}
            </div>
            {form.recoveryEmail && !emailVerified && (
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={sendingCode}
                className="mt-2 text-sm font-semibold text-[#0077B6] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingCode ? 'Sending...' : codeSent ? 'Resend code' : 'Send verification code'}
              </button>
            )}
            {codeSent && !emailVerified && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Enter verification code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setVerificationError('');
                    }}
                    placeholder="123456"
                    className="min-h-12 w-full border border-slate-300 bg-slate-50 px-3 text-center text-lg font-mono tracking-widest outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
                    maxLength={6}
                    disabled={verifyingCode}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6 || verifyingCode}
                  className="w-full min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify code'}
                </button>
                {verificationError && (
                  <div className="border-l-4 border-red-500 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">{verificationError}</p>
                  </div>
                )}
              </div>
            )}
            {emailVerified && (
              <div className="mt-3 border-l-4 border-green-500 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">Your Gmail is verified and you can continue to the next step.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.photo}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Profile Picture</label>
            <div className="flex items-center gap-4 border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                {preview ? (
                  <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">+</span>
                )}
              </div>

              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-[#0077B6] px-4 text-sm font-semibold text-[#0077B6] transition hover:bg-[#E0F2FE]">
                <FiCamera /> Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
          {reminders.policy}
        </div>
        <p className="text-sm font-semibold text-slate-800">Policy</p>
        <div className="max-h-36 overflow-y-auto border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          By using this system, you agree to keep your account information accurate, use the platform responsibly, protect your login credentials, and avoid unauthorized or harmful activity. The library administration may monitor account usage for security and compliance purposes. Misuse of the system may result in restricted access or disciplinary action.
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.policyAccepted}
            onChange={(e) => setForm({ ...form, policyAccepted: e.target.checked })}
            className="h-4 w-4 accent-blue-600"
          />
          I agree to the policy
        </label>
      </div>
    );
  };

  const schoolLogo = getBackendAssetUrl(schoolInfo?.logo) || '/L.png';
  const schoolName = schoolInfo?.school_name || 'School';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-100 px-0 py-0 sm:px-6 sm:py-8 lg:px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "linear-gradient(rgba(2, 62, 138, 0.82), rgba(15, 23, 42, 0.72)), url('/p1.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col bg-white px-5 py-8 shadow-2xl sm:min-h-0 sm:border sm:border-white/20 sm:px-8 sm:py-9 lg:px-10">
        <div className="mb-7 flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
            <img src={schoolLogo} alt={`${schoolName} logo`} className="h-full w-full object-contain p-1" onError={(e) => { e.target.src = '/L.png'; }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0077B6]">Account setup</p>
            <h2 className="truncate text-lg font-semibold tracking-[-.02em] text-slate-900">{schoolName}</h2>
          </div>
        </div>

        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between text-xs font-medium"><span className="text-slate-500">Step {currentStep + 1} of {steps.length}</span><span className="text-[#0077B6]">{stepLabels[currentStep]}</span></div>
          <div className="flex gap-1.5" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
          {stepLabels.map((label, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <span key={label} className={`h-1 flex-1 ${isCompleted ? 'bg-[#0077B6]' : isActive ? 'bg-[#388697]' : 'bg-slate-200'}`} />
            );
          })}
          </div>
        </div>

        <div className="flex-1">{renderStepContent()}</div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-slate-600 transition hover:text-[#0077B6] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span>
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 bg-[#0077B6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00669d] disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? 'Saving...' : currentStep === steps.length - 1 ? <>Complete setup <FiCheckCircle /></> : <>Continue <FiArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentOnboarding;
