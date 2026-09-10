import { useState } from "react";
import {
  Book,
  User,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  X,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Building2,
  Calendar,
  UploadCloud,
} from "lucide-react";
import { useNotifications } from "../../../context/NotificationContext";
import api from "../../../utils/api";

function StudentBorrowingForm({ borrowingList, onSubmit, onCancel, userData, compact = false }) {
  const { addNotification } = useNotifications();

  // 3-step state: 1 = Books & Type, 2 = Personal Details, 3 = Review & Submit
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    first_name: userData?.first_name || userData?.firstname || userData?.name || '',
    middle_name: '',
    last_name: userData?.last_name || userData?.lastname || '',
    address: userData?.address || '',
    contact_number: userData?.contact_number || userData?.cellphone || '',
    purpose: '',
    id_picture: null,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, id_picture: 'Please upload a valid image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, id_picture: 'Image must be less than 5MB' }));
        return;
      }

      setFormData((prev) => ({ ...prev, id_picture: file }));
      setPreviewImage(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, id_picture: '' }));
    }
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.contact_number)) {
      newErrors.contact_number = 'Invalid contact number format';
    }
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose of borrowing is required';
    }
    if (!formData.id_picture) {
      newErrors.id_picture = 'ID picture is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    if (!agreedToTerms) {
      setErrors((prev) => ({ ...prev, terms: 'Please confirm that your submitted details are accurate' }));
      return;
    }

    setIsSubmitting(true);

    try {
      let idPictureUrl = '';
      if (formData.id_picture instanceof File) {
        const formDataUpload = new FormData();
        formDataUpload.append('id_picture', formData.id_picture);

        try {
          const uploadResponse = await api.post('/users/borrowing-id', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          idPictureUrl = uploadResponse.id_picture_url || uploadResponse.data?.id_picture_url || '';
        } catch (uploadError) {
          console.error('Error uploading ID picture:', uploadError);
          throw new Error(uploadError.message || 'Failed to upload ID picture. Please try again.');
        }
      } else {
        throw new Error('ID picture is required');
      }

      const hasInterSchoolItems = borrowingList.some(
        (item) => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE'
      );
      const requestType = hasInterSchoolItems ? 'INTER_SCHOOL' : 'HOME';

      const items = borrowingList.map((item) => ({
        book_id: item.book_id,
        owner_school_id: item.owner_school_id,
        partner_school_id: item.partner_school_id || null,
        borrow_type: item.borrow_type,
      }));

      const requestData = {
        request_type: requestType,
        purpose: formData.purpose,
        contact_number: formData.contact_number,
        address: formData.address,
        id_picture_url: idPictureUrl,
        items,
      };

      try {
        const response = await api.post('/borrow-requests', requestData);

        addNotification({
          type: 'BORROW_REQUEST_SUBMITTED',
          title: 'Request Submitted Successfully',
          message: `Your borrowing request for ${borrowingList.length} book(s) has been submitted. Please wait for librarian approval.`,
          related_request_id: response.data?.data?.request_id || response.data?.request_id,
        });

        if (onSubmit) {
          onSubmit(response);
        }
      } catch (apiError) {
        console.error('API Error details:', apiError);
        let errorMessage = 'Failed to submit borrowing request';
        if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        } else if (apiError.response?.data?.error) {
          errorMessage = apiError.response.data.error;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }

        setErrors((prev) => ({
          ...prev,
          submit: errorMessage,
        }));
      }
    } catch (error) {
      console.error('Error submitting borrowing request:', error);
      let errorMessage = 'Failed to submit borrowing request';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors((prev) => ({
        ...prev,
        submit: errorMessage,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorrowTypeSummary = () => {
    const homeItems = borrowingList.filter((item) => item.borrow_type === 'HOME').length;
    const interSchoolItems = borrowingList.filter(
      (item) => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE'
    ).length;

    if (homeItems > 0 && interSchoolItems > 0) {
      return `${homeItems} Home, ${interSchoolItems} Inter-School`;
    } else if (interSchoolItems > 0) {
      return `${interSchoolItems} Inter-School (Library Use Only)`;
    } else {
      return `${homeItems} Home Library`;
    }
  };

  const steps = [
    { num: 1, label: 'Items & Source' },
    { num: 2, label: 'Personal Info' },
    { num: 3, label: 'Review & Send' },
  ];

  return (
    <div className={`${compact ? 'min-w-0 text-sm' : 'rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm'}`}>
      {/* Compact Back Bar for Book Details Drawer */}
      {compact && onCancel && (
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Book Details</span>
          </button>
          <span className="text-[11px] font-medium text-slate-400">
            Step {currentStep} of 3
          </span>
        </div>
      )}

      {/* Stepper Header */}
      <div className="mb-5 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-2 px-1">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    currentStep === step.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                      : currentStep > step.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep > step.num ? <CheckCircle className="h-4 w-4" /> : step.num}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">Step {step.num}</p>
                  <p className={`text-xs font-semibold ${currentStep === step.num ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${
                    currentStep > step.num ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ================= STEP 1: BOOKS & SOURCES ================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 1: Confirm Borrowing Books</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review the {borrowingList.length} book(s) you are requesting.
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {borrowingList.map((item, index) => {
                const isInterSchool = item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE';
                return (
                  <div
                    key={item.book_id || index}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 transition hover:border-blue-200"
                  >
                    <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs">
                      <Book className="h-5 w-5 opacity-90" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-1 text-xs font-bold text-slate-900">{item.title}</h4>
                      <p className="line-clamp-1 text-[11px] text-slate-500">{item.author}</p>
                      
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="h-3 w-3 text-blue-600" />
                          <span className="truncate max-w-[130px]">{item.owner_school_name || 'Home Library'}</span>
                        </span>

                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                            isInterSchool
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isInterSchool ? 'Inter-School (In-Library Use)' : 'Home Loan (Take Home)'}
                        </span>

                        {isInterSchool && Number(item.visiting_fee) > 0 ? (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 border border-amber-300">
                            Fee: ₱{Number(item.visiting_fee).toFixed(2)} / {item.visiting_fee_type === 'per_day' ? 'Day' : 'Visit'}
                          </span>
                        ) : isInterSchool ? (
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                            Free Partner Access
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inter-School & Visiting Fee Notice */}
            {borrowingList.some((item) => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE') && (() => {
              const partnerItems = borrowingList.filter((item) => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE');
              const paidItems = partnerItems.filter((item) => Number(item.visiting_fee) > 0);
              const hasFee = paidItems.length > 0;

              return (
                <div className={`rounded-2xl border p-3.5 space-y-2.5 ${hasFee ? 'border-amber-200 bg-amber-50/90 text-amber-900' : 'border-blue-100 bg-blue-50/70 text-blue-900'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-4 w-4 shrink-0 ${hasFee ? 'text-amber-600' : 'text-blue-600'}`} />
                      <span className="text-xs font-bold">
                        {hasFee ? 'Partner Campus Visiting Fee & Entry Terms' : 'Inter-Library Reading Room Policy'}
                      </span>
                    </div>
                    {hasFee ? (
                      <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300 shrink-0">
                        ₱{Number(paidItems[0].visiting_fee).toFixed(2)} / {paidItems[0].visiting_fee_type === 'per_day' ? 'Day' : 'Visit'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 shrink-0">
                        Free Consortium Entry
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed">
                    {partnerItems[0].visiting_policy_notes ||
                      (hasFee
                        ? `A visitor access fee of ₱${Number(paidItems[0].visiting_fee).toFixed(2)} applies for on-site reading privileges. Please present your student ID and request confirmation upon arrival.`
                        : `Visiting students may read this book on-site inside the owning school's library premises. An electronic QR permit will be issued upon approval.`)}
                  </p>

                  {hasFee && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 pt-1.5 border-t border-amber-200/60">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Fee is payable directly at {partnerItems[0].owner_school_name || 'the partner campus'} library reception desk.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <span>Continue to Your Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PERSONAL INFO ================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 2: Borrower Verification Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure your contact information is correct for notification.
              </p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.first_name ? 'border-red-300' : 'border-slate-200'
                  }`}
                  placeholder="Juan"
                />
                {errors.first_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Dela"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.last_name ? 'border-red-300' : 'border-slate-200'
                  }`}
                  placeholder="Cruz"
                />
                {errors.last_name && <p className="text-[10px] text-red-500 mt-0.5">{errors.last_name}</p>}
              </div>
            </div>

            {/* Contact & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-white pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.contact_number ? 'border-red-300' : 'border-slate-200'
                    }`}
                    placeholder="+63 912 345 6789"
                  />
                </div>
                {errors.contact_number && <p className="text-[10px] text-red-500 mt-0.5">{errors.contact_number}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Current Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-white pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.address ? 'border-red-300' : 'border-slate-200'
                    }`}
                    placeholder="Barangay, Municipality"
                  />
                </div>
                {errors.address && <p className="text-[10px] text-red-500 mt-0.5">{errors.address}</p>}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Purpose of Borrowing <span className="text-red-500">*</span>
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={2}
                className={`w-full rounded-xl border bg-white p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none ${
                  errors.purpose ? 'border-red-300' : 'border-slate-200'
                }`}
                placeholder="E.g. Thesis research, course requirement, exam preparation..."
              />
              {errors.purpose && <p className="text-[10px] text-red-500 mt-0.5">{errors.purpose}</p>}
            </div>

            {/* ID Picture Upload */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Student / Government ID <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative rounded-2xl border-2 border-dashed p-3 text-center transition ${
                  errors.id_picture ? 'border-red-300 bg-red-50/20' : 'border-slate-200 hover:border-blue-400 bg-slate-50/40'
                }`}
              >
                {previewImage ? (
                  <div className="relative inline-block">
                    <img
                      src={previewImage}
                      alt="ID Preview"
                      className="max-h-28 rounded-lg object-contain shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, id_picture: null }));
                        setPreviewImage(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white shadow hover:bg-rose-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="mx-auto h-7 w-7 text-blue-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-700">Click or drag student ID here</p>
                    <p className="text-[10px] text-slate-400">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  name="id_picture"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              {errors.id_picture && <p className="text-[10px] text-red-500 mt-0.5">{errors.id_picture}</p>}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVIEW & SUBMIT ================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Step 3: Review & Submit Request</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all details before sending to the library system.
              </p>
            </div>

            {/* Receipt-style Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Summary</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {getBorrowTypeSummary()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Borrower</span>
                  <span className="font-semibold text-slate-800">{formData.first_name} {formData.last_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Contact</span>
                  <span className="font-semibold text-slate-800">{formData.contact_number}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Address</span>
                  <span className="text-slate-700 truncate block">{formData.address}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Purpose</span>
                  <span className="text-slate-700 italic block">{formData.purpose}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Items ({borrowingList.length})
                </span>
                <div className="space-y-1">
                  {borrowingList.map((book) => (
                    <div key={book.book_id} className="flex items-center justify-between text-xs py-1">
                      <span className="truncate max-w-[200px] font-medium text-slate-800">{book.title}</span>
                      <span className="text-[10px] text-slate-500">{book.owner_school_name || 'Home'}</span>
                    </div>
                  ))}
                </div>

                {borrowingList.some((book) => Number(book.visiting_fee) > 0) && (
                  <div className="mt-2.5 pt-2 border-t border-dashed border-amber-200 bg-amber-50/70 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                      <span>Visiting Student Fee:</span>
                      <span className="font-mono text-amber-900">
                        ₱{Number(borrowingList.find((b) => Number(b.visiting_fee) > 0)?.visiting_fee || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      {borrowingList.find((b) => Number(b.visiting_fee) > 0)?.visiting_policy_notes || "Payable upon arrival at the partner school's library counter."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs leading-5 text-slate-700">
                I hereby declare that all provided details and my uploaded student ID are authentic. I promise to abide by Libralink borrowing rules.
              </span>
            </label>
            {errors.terms && <p className="text-[10px] text-red-500 mt-0.5">{errors.terms}</p>}
            {errors.submit && <p className="text-[10px] text-red-500 mt-0.5">{errors.submit}</p>}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !agreedToTerms}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Submit Borrow Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default StudentBorrowingForm;
