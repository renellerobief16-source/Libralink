import { useState } from "react";
import { Book, User, MapPin, Phone, FileText, AlertCircle, X, CheckCircle, Clock } from "lucide-react";
import { useNotifications } from "../../../context/NotificationContext";
import api from "../../../utils/api";

function StudentBorrowingForm({ borrowingList, onSubmit, onCancel, userData, compact = false }) {
  const { addNotification } = useNotifications();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, id_picture: 'Please upload a valid image file' }));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, id_picture: 'Image must be less than 5MB' }));
        return;
      }

      setFormData(prev => ({ ...prev, id_picture: file }));
      setPreviewImage(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, id_picture: '' }));
    }
  };

  const validateForm = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting borrowing request submission...');
      console.log('Borrowing list:', borrowingList);
      console.log('Form data:', formData);

      // Upload ID picture (required)
      let idPictureUrl = '';
      if (formData.id_picture instanceof File) {
        console.log('Uploading ID picture...');
        const formDataUpload = new FormData();
        formDataUpload.append('profile_picture', formData.id_picture);
        
        try {
          const uploadResponse = await api.post('/users/profile-picture', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          console.log('Upload response:', uploadResponse);
          idPictureUrl = uploadResponse.profile_picture || uploadResponse.profile_image || uploadResponse.data?.profile_picture || '';
        } catch (uploadError) {
          console.error('Error uploading ID picture:', uploadError);
          throw new Error('Failed to upload ID picture. Please try again.');
        }
      } else {
        throw new Error('ID picture is required');
      }

      // Determine request type based on borrowing list
      const hasInterSchoolItems = borrowingList.some(item => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE');
      const requestType = hasInterSchoolItems ? 'INTER_SCHOOL' : 'HOME';

      console.log('Request type:', requestType);

      // Prepare request items
      const items = borrowingList.map(item => ({
        book_id: item.book_id,
        owner_school_id: item.owner_school_id,
        partner_school_id: item.partner_school_id || null,
        borrow_type: item.borrow_type,
      }));

      console.log('Request items:', items);

      // Submit borrowing request
      const requestData = {
        request_type: requestType,
        purpose: formData.purpose,
        contact_number: formData.contact_number,
        address: formData.address,
        id_picture_url: idPictureUrl,
        items,
      };

      console.log('Submitting borrowing request with data:', requestData);

      try {
        console.log('About to call API with requestData:', JSON.stringify(requestData, null, 2));
        const response = await api.post('/borrow-requests', requestData);
        console.log('Borrowing request response:', response);
        console.log('Response data:', response.data);
        console.log('Response success:', response.data?.success);

        // Add notification for successful submission
        addNotification({
          type: 'BORROW_REQUEST_SUBMITTED',
          title: 'Request Submitted Successfully',
          message: `Your borrowing request for ${borrowingList.length} book(s) has been submitted. Please wait for librarian approval. You will be notified once your request is approved or rejected.`,
          related_request_id: response.data?.request_id
        });

        if (onSubmit) {
          onSubmit(response); // Pass full response, not just response.data
        }
      } catch (apiError) {
        console.error('API Error details:', apiError);
        console.error('API Error response:', apiError.response);
        console.error('API Error status:', apiError.response?.status);
        console.error('API Error data:', apiError.response?.data);
        console.error('API Error message:', apiError.message);
        
        // Don't re-throw, handle the error here
        let errorMessage = 'Failed to submit borrowing request';
        if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        } else if (apiError.response?.data?.error) {
          errorMessage = apiError.response.data.error;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
        
        setErrors(prev => ({ 
          ...prev, 
          submit: errorMessage
        }));
        
        alert(`Error: ${errorMessage}`);
        return; // Don't proceed to outer catch
      }
    } catch (error) {
      console.error('Error submitting borrowing request:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to submit borrowing request';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ 
        ...prev, 
        submit: errorMessage
      }));
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorrowTypeSummary = () => {
    const homeItems = borrowingList.filter(item => item.borrow_type === 'HOME').length;
    const interSchoolItems = borrowingList.filter(item => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE').length;
    
    if (homeItems > 0 && interSchoolItems > 0) {
      return `${homeItems} Home Library, ${interSchoolItems} Inter-School`;
    } else if (interSchoolItems > 0) {
      return `${interSchoolItems} Inter-School (Library Use Only)`;
    } else {
      return `${homeItems} Home Library`;
    }
  };

  return (
    <div className={`${compact ? "min-w-0 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm" : "bg-white rounded-2xl shadow-sm border border-gray-200 p-6"}`}>
      <div className={compact ? "mb-2 min-w-0" : "mb-6"}>
        <h2 className={`${compact ? "text-base" : "text-2xl"} mb-1 font-bold text-gray-900`}>
          Borrowing Information
        </h2>
        <p className={`${compact ? "text-xs leading-5" : "text-sm"} text-gray-600`}>
          Please complete the required information for your borrowing request
        </p>
      </div>

      {/* Summary */}
      <div className={`${compact ? "mb-3 rounded-lg p-2.5" : "mb-6 rounded-xl bg-blue-50 p-4"} border border-blue-200 bg-blue-50`}>
        <div className="mb-2 flex items-center gap-2">
          <Book className={`${compact ? "h-4 w-4" : "h-5 w-5"} shrink-0 text-blue-600`} />
          <span className={`${compact ? "text-xs" : ""} font-semibold text-blue-900`}>
            Request Summary
          </span>
        </div>
        <div className={`${compact ? "mb-2 text-[11px]" : "mb-3 text-xs"} grid grid-cols-2 gap-2`}>
          <div className="min-w-0">
            <span className="text-blue-700">Total Books:</span>
            <span className={`${compact ? "ml-1" : "ml-2"} font-semibold text-blue-900`}>
              {borrowingList.length}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-blue-700">Borrow Type:</span>
            <span className={`${compact ? "ml-1" : "ml-2"} font-semibold text-blue-900`}>
              {getBorrowTypeSummary()}
            </span>
          </div>
        </div>
        
        {/* School Library Availability */}
        <div className={`${compact ? "mt-2 border-t border-blue-200 pt-2" : "mt-3 border-t border-blue-200 pt-3"}`}>
          <div className={`${compact ? "mb-2 text-xs" : "mb-3 text-sm"} flex items-center gap-2`}>
            <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="font-semibold text-blue-900">School Library Availability</span>
          </div>
          <div className={compact ? "space-y-1.5" : "space-y-2"}>
            {borrowingList.map((item, index) => {
              const isInterSchool = item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE';
              return (
                <div key={item.book_id || index} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-blue-100 bg-white p-2">
                  <div className="min-w-0 flex-1">
                    <p className={`${compact ? "text-[11px]" : "text-xs"} truncate font-medium text-gray-900`}>
                      {item.title}
                    </p>
                    <div className="flex min-w-0 items-center gap-1">
                      <p className={`${compact ? "text-[10px]" : "text-xs"} min-w-0 truncate text-blue-700`}>
                        {item.owner_school_name}
                      </p>
                      {isInterSchool && (
                        <span className={`${compact ? "text-[10px]" : "text-xs"} shrink-0 rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700`}>
                          Partner School
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"} shrink-0 rounded-full bg-green-100 font-medium text-green-700`}>
                    Available
                  </span>
                </div>
              );
            })}
          </div>
          {borrowingList.some(item => item.borrow_type === 'INTER_SCHOOL_LIBRARY_USE') && (
            <div className={`${compact ? "mt-2 text-[10px] leading-4" : "mt-3 text-xs"} rounded-lg border border-orange-200 bg-orange-50 p-2`}>
              <p className="text-orange-800">
                <span className="font-semibold">Note:</span> Partner school books are for library use only.
              </p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={compact ? "space-y-2.5" : "space-y-6"}>
        {/* Name Fields */}
        <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 gap-3 md:grid-cols-3"}>
          <div className="min-w-0">
            <label
              htmlFor="borrow-first-name"
              className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
            >
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="borrow-first-name"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.first_name)}
              aria-describedby={errors.first_name ? "borrow-first-name-error" : undefined}
              className={`w-full ${compact ? "min-h-10 rounded-lg border px-2.5 py-2 text-sm" : "rounded-xl border-2 px-4 py-3"} bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.first_name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Juan"
            />
            {errors.first_name && (
              <p id="borrow-first-name-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.first_name}
              </p>
            )}
          </div>
          <div className="min-w-0">
            <label
              htmlFor="borrow-middle-name"
              className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
            >
              Middle Name
            </label>
            <input
              id="borrow-middle-name"
              type="text"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              className={`w-full ${compact ? "min-h-10 rounded-lg border px-2.5 py-2 text-sm" : "rounded-xl border-2 px-4 py-3"} border-gray-200 bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Dela"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="borrow-last-name"
              className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
            >
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="borrow-last-name"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.last_name)}
              aria-describedby={errors.last_name ? "borrow-last-name-error" : undefined}
              className={`w-full ${compact ? "min-h-10 rounded-lg border px-2.5 py-2 text-sm" : "rounded-xl border-2 px-4 py-3"} bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.last_name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Cruz"
            />
            {errors.last_name && (
              <p id="borrow-last-name-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="min-w-0">
          <label
            htmlFor="borrow-address"
            className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
          >
            Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${compact ? "left-3 h-4 w-4" : "left-4 h-5 w-5"}`} />
            <input
              id="borrow-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "borrow-address-error" : undefined}
              className={`w-full ${compact ? "min-h-10 rounded-lg border py-2 pl-9 pr-3 text-sm" : "rounded-xl border-2 py-3 pl-12 pr-4"} bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
                errors.address ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="123 Main Street, City"
            />
          </div>
          {errors.address && (
            <p id="borrow-address-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.address}
            </p>
          )}
        </div>

        {/* Contact Number */}
        <div className="min-w-0">
          <label
            htmlFor="borrow-contact-number"
            className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
          >
            Contact Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${compact ? "left-3 h-4 w-4" : "left-4 h-5 w-5"}`} />
            <input
              id="borrow-contact-number"
              type="tel"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              aria-invalid={Boolean(errors.contact_number)}
              aria-describedby={errors.contact_number ? "borrow-contact-number-error" : undefined}
              className={`w-full ${compact ? "min-h-10 rounded-lg border py-2 pl-9 pr-3 text-sm" : "rounded-xl border-2 py-3 pl-12 pr-4"} bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
                errors.contact_number ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="+63 912 345 6789"
            />
          </div>
          {errors.contact_number && (
            <p id="borrow-contact-number-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.contact_number}
            </p>
          )}
        </div>

        {/* Purpose */}
        <div className="min-w-0">
          <label
            htmlFor="borrow-purpose"
            className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
          >
            Purpose of Borrowing <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FileText className={`absolute text-gray-400 ${compact ? "left-3 top-3 h-4 w-4" : "left-4 top-4 h-5 w-5"}`} />
            <textarea
              id="borrow-purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              rows={compact ? 2 : 4}
              aria-invalid={Boolean(errors.purpose)}
              aria-describedby={errors.purpose ? "borrow-purpose-error" : undefined}
              className={`w-full ${compact ? "rounded-lg border py-2 pl-9 pr-3 text-sm" : "rounded-xl border-2 py-3 pl-12 pr-4"} resize-none bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
                errors.purpose ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Please describe the purpose of borrowing these books..."
            />
          </div>
          {errors.purpose && (
            <p id="borrow-purpose-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.purpose}
            </p>
          )}
        </div>

        {/* ID Picture */}
        <div className="min-w-0">
          <label
            htmlFor="borrow-id-picture"
            className={`${compact ? "mb-1 text-xs leading-4" : "mb-2 text-sm"} block font-medium text-gray-700`}
          >
            ID Picture <span className="text-red-500">*</span>
          </label>
          <div className={`${compact ? "rounded-lg border p-3" : "rounded-xl border-2 p-6"} relative border-dashed text-center transition-colors ${
            errors.id_picture ? 'border-red-300' : 'border-gray-300 hover:border-blue-400'
          }`}>
            {previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="ID Preview"
                  className={`${compact ? "max-h-36" : "max-h-48"} mx-auto rounded-lg object-contain`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData(prev => ({ ...prev, id_picture: null }));
                    setPreviewImage(null);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                  aria-label="Remove ID picture"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <User className={`${compact ? "mb-2 h-8 w-8" : "mb-3 h-12 w-12"} mx-auto text-gray-400`} />
                <p className={`${compact ? "mb-1 text-[11px]" : "mb-2 text-sm"} text-gray-600`}>
                  Click to upload or drag and drop
                </p>
                <p className={`${compact ? "text-[10px]" : "text-xs"} text-gray-400`}>
                  PNG, JPG up to 5MB (Required)
                </p>
              </div>
            )}
            <input
              id="borrow-id-picture"
              type="file"
              name="id_picture"
              onChange={handleImageChange}
              accept="image/*"
              aria-invalid={Boolean(errors.id_picture)}
              aria-describedby={errors.id_picture ? "borrow-id-picture-error" : undefined}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {errors.id_picture && (
            <p id="borrow-id-picture-error" role="alert" className={`${compact ? "mt-0.5 text-[10px] leading-4" : "mt-1 text-xs"} flex items-center gap-1 text-red-500`}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {errors.id_picture}
            </p>
          )}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className={`${compact ? "rounded-lg p-2" : "rounded-xl p-4"} border border-red-200 bg-red-50`}>
            <p className={`${compact ? "text-xs" : "text-sm"} flex items-center gap-2 text-red-700`} role="alert">
              <AlertCircle className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0`} />
              {errors.submit}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`${compact ? "gap-2 pt-2" : "gap-4 pt-4"} flex`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`${compact ? "min-h-10 rounded-lg border px-3 py-2 text-xs" : "rounded-xl border-2 px-6 py-3"} flex-1 border-gray-300 font-semibold text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${compact ? "min-h-10 rounded-lg px-3 py-2 text-xs" : "px-6 py-3 rounded-xl"} flex flex-1 items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <Clock className={`${compact ? "h-4 w-4" : "h-5 w-5"} animate-spin`} />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StudentBorrowingForm;
