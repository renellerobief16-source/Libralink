import { useState } from 'react';
import { FiMail, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';
import api from '../utils/api';

function EmailVerificationModal({ isOpen, onClose, onSuccess, recoveryEmail }) {
  const [email, setEmail] = useState(recoveryEmail || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('input'); // input, verify, success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/send-verification-code', {
        recovery_email: email
      });

      if (response.data.success) {
        setStep('verify');
        setCode('');
        // Start countdown for resend (60 seconds)
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Show code in development
        if (response.data.code) {
          console.log('Verification code:', response.data.code);
        }
      } else {
        setError(response.data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = code.trim();
      const response = await api.post('/auth/verify-code', {
        recovery_email: normalizedEmail,
        code: normalizedCode
      });

      if (response.data.success) {
        setStep('success');
        if (onSuccess) {
          onSuccess(email);
        }
      } else {
        setError(response.data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/send-verification-code', {
        recovery_email: email
      });

      if (response.data.success) {
        setCode('');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        if (response.data.code) {
          console.log('Verification code:', response.data.code);
        }
      } else {
        setError(response.data.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setEmail(recoveryEmail || '');
    setCode('');
    setError('');
    setCountdown(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
            {step === 'success' ? 'Email Verified' : step === 'verify' ? 'Enter Verification Code' : 'Verify Email'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {step === 'input' && (
          <>
            <p className="text-sm text-[#64748B] mb-6 sm:text-base">
              Enter your recovery email address. We'll send you a verification code to confirm your email.
            </p>

            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">Recovery Email</label>
                <input
                  id="recovery-email"
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12 sm:text-base"
                  required
                />
              </div>

              {error && (
                <div className="border-l-4 border-red-500 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-[#64748B] mb-6 sm:text-base">
              We've sent a 6-digit verification code to <span className="font-medium text-[#0F172A]">{email}</span>. 
              Enter the code below to verify your email.
            </p>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="verification-code" className="mb-2 block text-sm font-medium">Verification Code</label>
                <input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="min-h-11 w-full border border-slate-200 bg-[#F8FAFC] px-3 text-center text-lg font-mono tracking-widest outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:min-h-12"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="border-l-4 border-red-500 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] disabled:cursor-wait disabled:opacity-60 sm:min-h-12"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || countdown > 0}
                  className="text-sm text-[#0077B6] hover:underline disabled:text-slate-400 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {resendLoading ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-[#64748B] mb-6 sm:text-base">
              Your email <span className="font-medium text-[#0F172A]">{email}</span> has been successfully verified.
            </p>
            <button
              onClick={handleClose}
              className="w-full min-h-11 bg-[#0077B6] px-4 text-sm font-semibold text-white transition hover:bg-[#00669d] sm:min-h-12"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailVerificationModal;
