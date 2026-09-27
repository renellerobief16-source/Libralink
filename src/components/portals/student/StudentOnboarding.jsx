import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCamera, FiCheck, FiCheckCircle } from 'react-icons/fi';
import api, { updateProfilePicture, updateUserProfile, getBackendAssetUrl, API_BASE_URL } from '../../../utils/api';
import { STUDENT_COURSES, STUDENT_TOPICS, saveStudentPreferences } from '../../../utils/studentRecommendations';

function isOnboardingComplete(user) {
  if (!user) return false;
  return !!user.policy_accepted;
}

const ACADEMIC_PROGRAMS = {
  College: [
    { code: "BSIT", name: "BS in Information Technology", dept: "College of Computer Studies", relatedTopicIds: ["tech_coding", "engineering_math"] },
    { code: "BSCS", name: "BS in Computer Science", dept: "College of Computer Studies", relatedTopicIds: ["tech_coding", "engineering_math"] },
    { code: "BSN", name: "BS in Nursing", dept: "College of Nursing & Health Sciences", relatedTopicIds: ["science_health", "psychology_selfhelp"] },
    { code: "BSBA", name: "BS in Business Administration", dept: "College of Business & Management", relatedTopicIds: ["business_finance", "psychology_selfhelp"] },
    { code: "BSA", name: "BS in Accountancy", dept: "College of Accountancy", relatedTopicIds: ["business_finance", "engineering_math"] },
    { code: "BSCrim", name: "BS in Criminology", dept: "College of Criminal Justice", relatedTopicIds: ["law_criminology", "psychology_selfhelp"] },
    { code: "BSEd", name: "Bachelor of Secondary Education", dept: "College of Education", relatedTopicIds: ["education_pedagogy", "literature_fiction"] },
    { code: "BEEd", name: "Bachelor of Elementary Education", dept: "College of Education", relatedTopicIds: ["education_pedagogy", "arts_design"] },
    { code: "BSHM", name: "BS in Hospitality Management", dept: "College of Hospitality Management", relatedTopicIds: ["hospitality_tourism", "business_finance"] },
    { code: "BSTM", name: "BS in Tourism Management", dept: "College of Tourism", relatedTopicIds: ["hospitality_tourism", "history_society"] },
    { code: "BSCE", name: "BS in Civil Engineering", dept: "College of Engineering", relatedTopicIds: ["engineering_math", "tech_coding"] },
    { code: "BSPsych", name: "BS in Psychology", dept: "College of Arts & Sciences", relatedTopicIds: ["psychology_selfhelp", "science_health"] },
    { code: "OTHER", name: "Other Degree / General Studies", dept: "General Academics", relatedTopicIds: ["literature_fiction", "psychology_selfhelp"] }
  ],
  "Senior High School": [
    { code: "STEM", name: "Science, Technology, Engineering & Mathematics", dept: "SHS Academic Track", relatedTopicIds: ["engineering_math", "science_health", "tech_coding"] },
    { code: "ABM", name: "Accountancy, Business & Management", dept: "SHS Academic Track", relatedTopicIds: ["business_finance"] },
    { code: "HUMSS", name: "Humanities & Social Sciences", dept: "SHS Academic Track", relatedTopicIds: ["history_society", "literature_fiction", "law_criminology"] },
    { code: "GAS", name: "General Academic Strand", dept: "SHS Academic Track", relatedTopicIds: ["literature_fiction", "psychology_selfhelp"] },
    { code: "TVL-ICT", name: "TVL: Information & Communications Technology", dept: "SHS Technical-Vocational", relatedTopicIds: ["tech_coding"] },
    { code: "TVL-HE", name: "TVL: Home Economics", dept: "SHS Technical-Vocational", relatedTopicIds: ["hospitality_tourism"] }
  ],
  "Junior High School": [
    { code: "Grade 7", name: "Junior High School - Grade 7", dept: "Junior High Curriculum", relatedTopicIds: ["education_pedagogy", "science_health"] },
    { code: "Grade 8", name: "Junior High School - Grade 8", dept: "Junior High Curriculum", relatedTopicIds: ["education_pedagogy", "science_health"] },
    { code: "Grade 9", name: "Junior High School - Grade 9", dept: "Junior High Curriculum", relatedTopicIds: ["education_pedagogy", "science_health"] },
    { code: "Grade 10", name: "Junior High School - Grade 10", dept: "Junior High Curriculum", relatedTopicIds: ["education_pedagogy", "science_health"] },
    { code: "STE", name: "Special Program in Science, Tech & Eng. (STE)", dept: "Science Curriculum", relatedTopicIds: ["science_health", "engineering_math"] },
    { code: "SPA", name: "Special Program in the Arts (SPA)", dept: "Arts Curriculum", relatedTopicIds: ["arts_design", "literature_fiction"] },
    { code: "SPS", name: "Special Program in Sports (SPS)", dept: "Sports Curriculum", relatedTopicIds: ["science_health"] }
  ]
};

function StudentOnboarding() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [form, setForm] = useState({
    academicLevel: 'College',
    course: '',
    address: '',
    favorite_topics: [],
    username: '',
    cellphone: '',
    recoveryEmail: '',
    policyAccepted: false,
  });
  const [courseSearch, setCourseSearch] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [schoolInfo, setSchoolInfo] = useState(null);

  const steps = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'course', label: 'Academic Program' },
    { key: 'address', label: 'Residential Address' },
    { key: 'topics', label: 'Reading Interests' },
    { key: 'username', label: 'Username' },
    { key: 'cellphone', label: 'Cellphone Number' },
    { key: 'email', label: 'Gmail Account' },
    { key: 'photo', label: 'Profile Picture' },
    { key: 'policy', label: 'Policy' },
  ];

  const stepLabels = ['Welcome', 'Program', 'Address', 'Topics', 'Username', 'Cellphone', 'Recovery email', 'Photo', 'Policy'];

  const reminders = {
    welcome: 'Welcome to Libralink. Please complete these details to personalize your account and access the library system.',
    course: 'Select your Academic Level and degree program or grade level. This helps us tailor syllabus-aligned book recommendations for you.',
    address: 'Enter your residential address. This completes your official library patron record.',
    topics: 'Select the reading topics you love! We will curate your "Recommended for You" shelf with these genres.',
    username: 'Create a unique username that others can recognize.',
    cellphone: 'Enter your active mobile number in case we need to contact you.',
    email: 'Use a valid Gmail account for password recovery and account safety.',
    photo: 'Confirm your profile photo. You can use your scanned ID photo or upload a new headshot.',
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

    const storedCourse = parsedUser.course || parsedUser.position || localStorage.getItem('studentCourse') || '';
    let storedTopics = parsedUser.favorite_topics || parsedUser.interests;
    if (!Array.isArray(storedTopics)) {
      try {
        storedTopics = JSON.parse(localStorage.getItem('studentInterests') || '[]');
      } catch {
        storedTopics = [];
      }
    }

    setForm({
      academicLevel: parsedUser.academic_level || parsedUser.academicLevel || 'College',
      username: parsedUser.username || parsedUser.name || parsedUser.first_name || '',
      cellphone: parsedUser.contact_number || '',
      recoveryEmail: parsedUser.recovery_email || parsedUser.email || '',
      course: storedCourse,
      address: parsedUser.address || localStorage.getItem('studentAddress') || '',
      favorite_topics: Array.isArray(storedTopics) ? storedTopics : [],
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
    if (!form.course.trim()) {
      alert('Please select your academic course or program.');
      return;
    }

    if (!form.address.trim()) {
      alert('Please enter your residential address.');
      return;
    }

    if (!form.favorite_topics || form.favorite_topics.length === 0) {
      alert('Please select at least 1 reading topic you love.');
      return;
    }

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
      alert('Please upload or confirm your profile picture.');
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

      // Save course and favorite topics via shared recommendations helper
      await saveStudentPreferences({
        course: form.course.trim(),
        favorite_topics: form.favorite_topics || [],
      });

      const userId = userInfo?.user_id || userInfo?.id || Number(localStorage.getItem('currentUserId'));
      const cleanedEmail = form.recoveryEmail.trim();
      const payload = {
        username: form.username.trim(),
        contact_number: form.cellphone.trim(),
        recovery_email: cleanedEmail,
        position: form.course.trim(),
        academic_level: form.academicLevel,
        course: form.course.trim(),
        address: form.address.trim(),
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
        student_number: userInfo?.student_number || userInfo?.lrn || userInfo?.studentNumber || '',
        lrn: userInfo?.lrn || userInfo?.student_number || '',
        academic_level: form.academicLevel,
        course: form.course.trim(),
        position: form.course.trim(),
        address: form.address.trim(),
        favorite_topics: form.favorite_topics || [],
        interests: form.favorite_topics || [],
        username: payload.username,
        contact_number: payload.contact_number,
        recovery_email: payload.recovery_email,
        profile_picture: uploadedPicture,
        profile_image: uploadedPicture,
        policy_accepted: true,
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('studentCourse', form.course.trim());
      localStorage.setItem('studentAddress', form.address.trim());
      localStorage.setItem('studentInterests', JSON.stringify(form.favorite_topics || []));

      window.dispatchEvent(new CustomEvent('libralink-preferences-updated', {
        detail: { course: form.course.trim(), favorite_topics: form.favorite_topics || [] }
      }));

      navigate('/studentpage');
    } catch (error) {
      console.error('Student onboarding error:', error);
      alert(error.message || 'Unable to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !form.course.trim()) {
      alert('Please select your academic program or course.');
      return;
    }

    if (currentStep === 2 && !form.address.trim()) {
      alert('Please enter your residential address.');
      return;
    }

    if (currentStep === 3 && (!form.favorite_topics || form.favorite_topics.length === 0)) {
      alert('Please select at least 1 reading topic you love.');
      return;
    }

    if (currentStep === 4 && !form.username.trim()) {
      alert('Please enter your username.');
      return;
    }

    if (currentStep === 5 && !form.cellphone.trim()) {
      alert('Please enter your cellphone number.');
      return;
    }

    if (currentStep === 6 && !form.recoveryEmail.trim()) {
      alert('Please enter your Gmail account for password recovery.');
      return;
    }

    if (currentStep === 7 && !photo && !preview) {
      alert('Please upload or confirm your profile picture.');
      return;
    }

    if (currentStep === 8) {
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
    // STEP 0: Welcome
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
              Welcome to Libralink. Complete your academic level, program, residential address, and reading topics to personalize your borrowing experience.
            </p>
            <p className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
              This setup curates your "Recommended for You" library shelf and secures your account.
            </p>
          </div>
        </div>
      );
    }

    // STEP 1: Academic Level & Program Selection
    if (currentStep === 1) {
      const activeList = ACADEMIC_PROGRAMS[form.academicLevel] || ACADEMIC_PROGRAMS.College;
      const filtered = activeList.filter(
        (c) =>
          c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
          c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
          c.dept.toLowerCase().includes(courseSearch.toLowerCase())
      );

      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.course}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Choose Academic Level
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['College', 'Senior High School', 'Junior High School'].map((lvl) => {
                const isLvlSelected = form.academicLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, academicLevel: lvl, course: '' }));
                      setCourseSearch('');
                    }}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all border ${
                      isLvlSelected
                        ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'Senior High School' ? 'Senior High (SHS)' : lvl === 'Junior High School' ? 'Junior High (JHS)' : 'College'}
                  </button>
                );
              })}
            </div>

            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Select {form.academicLevel === 'College' ? 'Degree Program / Course' : form.academicLevel === 'Senior High School' ? 'Senior High Strand' : 'Grade Level / Curriculum'}
            </label>
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder={`Search in ${form.academicLevel}...`}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-[#0077B6] focus:bg-white focus:ring-4 focus:ring-[#0077B6]/10 mb-2.5"
            />

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filtered.map((c) => {
                const isSelected = form.course === c.code || form.course === c.name;
                return (
                  <div
                    key={c.code}
                    onClick={() => setForm({ ...form, course: c.code })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#0077B6] bg-[#E0F2FE]/70 shadow-xs ring-2 ring-[#0077B6]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {c.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{c.dept}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ml-2 transition-all ${
                        isSelected ? "bg-[#0077B6] text-white shadow-xs" : "border border-slate-300"
                      }`}
                    >
                      {isSelected && <FiCheck className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // STEP 2: Residential Address
    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.address}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Residential Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Blk 5 Lot 12, San Agustin, Santa Rita, Pampanga"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-sm outline-none transition focus:border-[#0077B6] focus:bg-white focus:ring-4 focus:ring-[#0077B6]/10"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Please enter your full current address for official library patron record verification.
            </p>
          </div>
        </div>
      );
    }

    // STEP 3: Favorite Reading Topics
    if (currentStep === 3) {
      const toggleTopic = (id) => {
        const prev = form.favorite_topics || [];
        const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
        setForm({ ...form, favorite_topics: next });
      };

      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.topics}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Pick reading topics you like:
            </label>
            <span className="text-xs font-bold text-[#0077B6] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {(form.favorite_topics || []).length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
            {STUDENT_TOPICS.map((topic) => {
              const isSelected = (form.favorite_topics || []).includes(topic.id);
              return (
                <div
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`group relative flex h-32 overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-sm ${
                    isSelected
                      ? "border-[#0077B6] shadow-lg ring-4 ring-[#0077B6]/25 scale-[1.01]"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <img
                    src={topic.image}
                    alt={topic.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

                  <div className="relative z-10 flex flex-col justify-between p-3 w-full">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-black/60 border border-white/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-xs">
                        {topic.badge}
                      </span>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                          isSelected
                            ? "bg-[#0077B6] text-white shadow-md ring-2 ring-white/80"
                            : "border-2 border-white/70 bg-black/40 backdrop-blur-md text-transparent"
                        }`}
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight drop-shadow-md">
                        {topic.title}
                      </h4>
                      <p className="text-[11px] font-medium text-white/90 truncate mt-0.5 drop-shadow-xs">
                        {topic.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // STEP 4: Username
    if (currentStep === 4) {
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
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
            />
          </div>
        </div>
      );
    }

    // STEP 5: Cellphone Number
    if (currentStep === 5) {
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
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
            />
          </div>
        </div>
      );
    }

    // STEP 6: Gmail Recovery Email
    if (currentStep === 6) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.email}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Gmail Account (Recovery Email)</label>
            <input
              type="email"
              value={form.recoveryEmail}
              onChange={(e) => setForm({ ...form, recoveryEmail: e.target.value })}
              placeholder="you@gmail.com"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 sm:text-sm"
              autoComplete="email"
            />
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              This Gmail will be used for <strong>password recovery</strong>. When you forget your password, a reset code will be sent here.
            </p>
          </div>
        </div>
      );
    }

    // STEP 7: Profile Picture
    if (currentStep === 7) {
      return (
        <div className="space-y-4">
          <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
            {reminders.photo}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-400 bg-white shadow-sm">
                {preview ? (
                  <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">+</span>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                {preview && !photo && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <FiCheck className="w-3.5 h-3.5" /> ID Photo Scanned by Librarian
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {preview 
                    ? "Your scanned ID photo is set as your default avatar. You can keep it or upload a new photo."
                    : "Upload a clear headshot photo for your digital borrower ID."}
                </p>
                <div>
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#0077B6] px-4 text-xs font-semibold text-[#0077B6] transition hover:bg-[#E0F2FE]">
                    <FiCamera /> {preview ? 'Change Photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // STEP 8: Policy
    return (
      <div className="space-y-4">
        <div className="border-l-4 border-[#0077B6] bg-[#E0F2FE] px-3 py-2 text-xs leading-5 text-blue-800">
          {reminders.policy}
        </div>
        <p className="text-sm font-semibold text-slate-800">Policy</p>
        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          By using this system, you agree to keep your account information accurate, use the platform responsibly, protect your login credentials, and avoid unauthorized or harmful activity. The library administration may monitor account usage for security and compliance purposes. Misuse of the system may result in restricted access or disciplinary action.
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.policyAccepted}
            onChange={(e) => setForm({ ...form, policyAccepted: e.target.checked })}
            className="h-4 w-4 accent-blue-600 rounded"
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

      <div className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col rounded-3xl bg-white px-5 py-8 shadow-2xl sm:min-h-0 sm:border sm:border-white/20 sm:px-8 sm:py-9 lg:px-10">
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
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-[#0077B6] font-semibold">{stepLabels[currentStep]}</span>
          </div>
          <div className="flex gap-1.5" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
            {stepLabels.map((label, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <span
                  key={label}
                  className={`h-1.5 rounded-full flex-1 transition-colors ${
                    isCompleted ? 'bg-[#0077B6]' : isActive ? 'bg-[#388697]' : 'bg-slate-200'
                  }`}
                />
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
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0077B6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00669d] disabled:cursor-not-allowed disabled:bg-blue-400 active:scale-95"
          >
            {loading ? 'Saving...' : currentStep === steps.length - 1 ? <>Complete setup <FiCheckCircle /></> : <>Continue <FiArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentOnboarding;
