import { useState, useEffect, useRef, useCallback } from "react";
import { 
  FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiUsers, 
  FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiHash, 
  FiBriefcase, FiBookOpen, FiShield, FiRefreshCw,
  FiCopy, FiCheck, FiX, FiUserCheck, FiPrinter, FiSend, FiAward, FiMapPin,
  FiCamera, FiUpload, FiZap, FiImage, FiRotateCw
} from "react-icons/fi";
import { signUp } from "../../../utils/api";
import api from "../../../utils/api";
import Button from "../../ui/Button";


function AdminAddStudent({ darkMode, onNavigateTab }) {
  const [pinSuffix, setPinSuffix] = useState(() => Math.floor(1000 + Math.random() * 9000));
  
  const [registerForm, setRegisterForm] = useState({
    firstname: "",
    middle_name: "",
    lastname: "",
    student_number: "",
    customPassword: "",
  });

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registeredStudent, setRegisteredStudent] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [schoolInfo, setSchoolInfo] = useState({ id: null, name: 'Library Institution', code: 'SRC' });

  // --- ID Scan State & Orientation ---
  const [scanPanelOpen, setScanPanelOpen] = useState(false);
  const [scanStep, setScanStep] = useState('idle'); // idle | capturing | scanning | done | error
  const [idImageDataUrl, setIdImageDataUrl] = useState(null); // base64 preview
  const [idImageFile, setIdImageFile] = useState(null);       // File for upload
  const [idOrientation, setIdOrientation] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
    return 'landscape';
  });
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRawText, setOcrRawText] = useState('');
  const [detectedCandidates, setDetectedCandidates] = useState([]);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [scanError, setScanError] = useState('');
  const [prefilledFields, setPrefilledFields] = useState({}); // which fields were auto-filled
  const [scanEngine, setScanEngine] = useState(null); // 'gemini' | 'tesseract' | null
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const frameGuideRef = useRef(null);

  // Auto-detect device orientation changes to adapt camera viewfinder
  useEffect(() => {
    const handleDeviceOrientation = () => {
      if (typeof window !== 'undefined') {
        const isPortrait = window.innerHeight > window.innerWidth;
        setIdOrientation(isPortrait ? 'portrait' : 'landscape');
      }
    };
    window.addEventListener('resize', handleDeviceOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleDeviceOrientation);
    }
    return () => {
      window.removeEventListener('resize', handleDeviceOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleDeviceOrientation);
      }
    };
  }, []);

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId');
    if (schoolId) {
      api.get(`/schools/${schoolId}`)
        .then(res => {
          if (res.data) {
            setSchoolInfo({
              id: schoolId,
              name: res.data.school_name || 'Library Institution',
              code: res.data.school_code || 'SRC'
            });
          }
        })
        .catch(err => console.warn('Could not fetch school details:', err));
    }
  }, []);

  // Flexible Student ID / LRN Handler (No enforced format)
  const handleIdChange = (e) => {
    const val = e.target.value;
    setRegisterForm(prev => ({ ...prev, student_number: val }));
    if (prefilledFields.student_number) setPrefilledFields(p => ({ ...p, student_number: false }));
  };

  // Computed Auto Credentials
  const cleanFirst = registerForm.firstname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = registerForm.lastname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const autoPortalEmail = (cleanFirst && cleanLast)
    ? `${cleanFirst}.${cleanLast}@libralink.com`
    : (cleanFirst || cleanLast ? `${cleanFirst || cleanLast}@libralink.com` : "student.name@libralink.com");

  // Auto-password: lastname + full sanitized student ID (spaces/symbols removed)
  // e.g. "Dela Cruz" + "20-22252" → "delacruz2022252", or "Santos" + "CS-101" → "santoscs101"
  const cleanLastForPw = registerForm.lastname.toLowerCase().replace(/[^a-z]/g, '');
  const cleanIdForPw = registerForm.student_number.toLowerCase().replace(/[^a-z0-9]/g, '');
  const autoPassword = registerForm.customPassword.trim()
    || ((cleanLastForPw && cleanIdForPw) ? `${cleanLastForPw}${cleanIdForPw}` : `${cleanLastForPw || 'student'}${pinSuffix}`);

  const regeneratePin = () => {
    setPinSuffix(Math.floor(1000 + Math.random() * 9000));
  };

  // ========== ID SCAN HELPERS ==========
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const openCamera = async () => {
    setScanStep('capturing');
    setScanError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setScanError('Camera access denied. Please allow camera or use "Upload Photo" instead.');
      setScanStep('idle');
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    // Smart Frame Cropping: Crop precisely what is inside the active viewfinder frame
    if (frameGuideRef.current && videoRef.current) {
      const vRect = videoRef.current.getBoundingClientRect();
      const fRect = frameGuideRef.current.getBoundingClientRect();

      if (vRect.width > 0 && vRect.height > 0 && fRect.width > 0 && fRect.height > 0) {
        // Compute object-cover scale factor & viewport offsets
        const scale = Math.max(vRect.width / video.videoWidth, vRect.height / video.videoHeight);
        const displayedW = video.videoWidth * scale;
        const displayedH = video.videoHeight * scale;
        const offsetX = (displayedW - vRect.width) / 2;
        const offsetY = (displayedH - vRect.height) / 2;

        const leftInVideo = (fRect.left - vRect.left) + offsetX;
        const topInVideo = (fRect.top - vRect.top) + offsetY;

        sx = Math.max(0, leftInVideo / scale);
        sy = Math.max(0, topInVideo / scale);
        sw = Math.min(video.videoWidth - sx, fRect.width / scale);
        sh = Math.min(video.videoHeight - sy, fRect.height / scale);
      }
    }

    // Fallback if dimensions were too small
    if (sw < 20 || sh < 20) {
      sx = 0;
      sy = 0;
      sw = video.videoWidth;
      sh = video.videoHeight;
    }

    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Auto-detect orientation of the cropped card image
    const isPortraitCard = canvas.height > canvas.width * 1.05;
    setIdOrientation(isPortraitCard ? 'portrait' : 'landscape');

    canvas.toBlob(blob => {
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setIdImageFile(file);
      setIdImageDataUrl(canvas.toDataURL('image/jpeg', 0.94));
      stopCamera();
      runOcr(file);
    }, 'image/jpeg', 0.94);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const testImg = new Image();
      testImg.onload = () => {
        // Auto-detect image aspect ratio: portrait vs landscape
        const isPortrait = testImg.height > testImg.width * 1.05;
        setIdOrientation(isPortrait ? 'portrait' : 'landscape');
      };
      testImg.src = dataUrl;
      setIdImageDataUrl(dataUrl);
      runOcr(file);
    };
    reader.readAsDataURL(file);
  };

  const preprocessImageForOcr = (imageSource) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale up to ensure clear character recognition (min width 1400px)
          const targetWidth = Math.max(img.width, 1400);
          const scale = targetWidth / img.width;
          canvas.width = targetWidth;
          canvas.height = Math.round(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          // Grayscale + Contrast Enhancement (factor 1.5)
          const contrast = 1.5;
          const intercept = 128 * (1 - contrast);

          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            let val = gray * contrast + intercept;
            val = Math.min(255, Math.max(0, val));
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
          }

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob((blob) => {
            resolve(blob || imageSource);
          }, 'image/png');
        } catch {
          resolve(imageSource);
        }
      };
      img.onerror = () => resolve(imageSource);

      if (imageSource instanceof Blob || imageSource instanceof File) {
        img.src = URL.createObjectURL(imageSource);
      } else if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        resolve(imageSource);
      }
    });
  };

  // Helper: Create rotated image blob for multi-angle OCR fallback
  const createRotatedImageBlob = (blobSource, degrees = 90) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        canvas.toBlob((b) => resolve(b || blobSource), 'image/jpeg', 0.94);
      };
      img.onerror = () => resolve(blobSource);
      img.src = (blobSource instanceof Blob || blobSource instanceof File) 
        ? URL.createObjectURL(blobSource) 
        : blobSource;
    });
  };

  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const runOcr = async (imageFile) => {
    setScanStep('scanning');
    setOcrProgress(15);
    setScanError('');
    setScanEngine(null);
    setScanStatusMsg('Preparing ID card...');

    let base64Data = null;
    try {
      if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
        base64Data = imageFile;
      } else if (imageFile instanceof Blob || imageFile instanceof File) {
        base64Data = await convertBlobToBase64(imageFile);
      }
    } catch (e) {
      console.warn('Could not convert image to base64:', e);
    }

    // Step 1: High-precision Gemini Vision AI (via Express backend)
    if (base64Data) {
      try {
        setScanStatusMsg('Analyzing with Google Gemini Vision AI...');
        setOcrProgress(40);

        const geminiRes = await api.post('/scan-id', { image: base64Data });

        if (geminiRes?.success && geminiRes?.data) {
          const { firstname, middlename, lastname, student_number } = geminiRes.data;
          const hasAny = !!(firstname || lastname || student_number);

          if (hasAny) {
            const updates = {};
            const filled = {};
            if (firstname) { updates.firstname = firstname; filled.firstname = true; }
            if (middlename) { updates.middle_name = middlename; filled.middle_name = true; }
            if (lastname) { updates.lastname = lastname; filled.lastname = true; }
            if (student_number) { updates.student_number = student_number; filled.student_number = true; }

            setRegisterForm(prev => ({ ...prev, ...updates }));
            setPrefilledFields(filled);
            setScanEngine('gemini');
            setOcrProgress(100);
            setScanStep('done');
            setScanPanelOpen(false);
            setScanStatusMsg('Gemini Vision AI extraction completed');
            return;
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini ID scan endpoint error, falling back to local OCR:', geminiErr);
      }
    }

    // Step 2: Fallback to local Tesseract OCR (offline-ready)
    try {
      setScanStatusMsg('Running local OCR fallback...');
      setOcrProgress(50);
      const preprocessedBlob = await preprocessImageForOcr(imageFile);

      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(preprocessedBlob, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(50 + Math.round(m.progress * 35));
          }
        }
      });
      let text = result?.data?.text || '';
      let extraction = applyOcrToForm(text);

      // Multi-angle Fallback: If neither name nor student ID was extracted, test 90° rotation
      if ((!extraction.foundName && !extraction.foundId) || text.trim().length < 15) {
        try {
          const rotatedBlob = await createRotatedImageBlob(preprocessedBlob, 90);
          setOcrProgress(88);
          const rotResult = await Tesseract.recognize(rotatedBlob, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setOcrProgress(88 + Math.round(m.progress * 10));
              }
            }
          });
          const rotText = rotResult?.data?.text || '';
          const rotExtraction = testOcrExtraction(rotText);
          if (rotExtraction.extractedCount > extraction.extractedCount) {
            text = rotText;
            applyOcrToForm(rotText);
            // Flip detected orientation if rotated angle yielded better OCR
            setIdOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
          }
        } catch (rotErr) {
          console.warn('[OCR] Multi-angle rotation test:', rotErr);
        }
      }

      setScanEngine('tesseract');
      setOcrProgress(100);
      setOcrRawText(text);
      setScanStep('done');
      setScanPanelOpen(false);
      setScanStatusMsg('Local OCR completed');
    } catch (err) {
      console.error('OCR error:', err);
      setScanError('Scanner failed. Please try again or fill in the fields manually.');
      setScanStep('error');
    }
  };

  const applyOcrToForm = (text) => {
    if (!text) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const filled = {};

    const cleanCandidate = (raw) => {
      if (!raw) return '';
      return raw
        .replace(/[\s_]+/g, '')
        .replace(/[–—]/g, '-')
        .replace(/^[.:#\-;,\s]+|[.:#\-;,\s]+$/g, '');
    };

    // Helper: Strictly reject school years, calendar years, and dates
    const isYearOrDatePattern = (str) => {
      if (!str) return true;
      const s = cleanCandidate(str);

      // School year: e.g. "2024-2025", "2023-2024", "2025-2026", "2022-2023", "2024-25"
      if (/^(?:19|20)\d{2}\s*[-–—/]\s*(?:19|20)?\d{2}$/.test(s)) {
        return true;
      }

      // Standalone 4-digit calendar year (e.g. 1990 - 2099)
      if (/^(?:19|20)\d{2}$/.test(s)) {
        return true;
      }

      // Standard calendar date: MM/DD/YYYY, YYYY-MM-DD, DD.MM.YYYY
      if (/^\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(s)) {
        return true;
      }

      return false;
    };

    // Label indicators for Student ID
    const labelRegex = /(?:STUDENT\s*(?:NO|NUMBER|ID|CODE|#)|ID\s*(?:NO|NUMBER|#)|I\.?D\.?\s*(?:NO|#)?|LRN|S\.?N\.?|PATRON\s*(?:ID|NO))\b/i;
    const yearIndicator = /(?:S\.?Y\.?|A\.?Y\.?|SCHOOL\s*YEAR|ACADEMIC\s*YEAR|VALID\s*(?:UNTIL|THRU|DATE)?|EXPIR|ISSUE|BIRTH|YEAR\s*LEVEL)\b/i;
    const idPattern = /([A-Z0-9]{1,8}(?:\s*[-–—]\s*[A-Z0-9]{2,10})+|\b\d{5,14}\b)/i;

    let studentNumber = '';

    // Pass 1: Look for labeled ID (same line or next 1-2 lines)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip lines that are school year or validity dates
      if (yearIndicator.test(line) && !labelRegex.test(line)) {
        continue;
      }

      if (labelRegex.test(line)) {
        // 1A: Look on the SAME line after the label
        const afterLabel = line.replace(labelRegex, '').replace(/^[:.#\-;\s]+/, '').trim();
        if (afterLabel && !yearIndicator.test(afterLabel)) {
          const matchSame = afterLabel.match(idPattern);
          if (matchSame) {
            const cleaned = cleanCandidate(matchSame[0]);
            if (cleaned.length >= 3 && /\d/.test(cleaned) && !isYearOrDatePattern(cleaned)) {
              studentNumber = cleaned;
              break;
            }
          }
        }

        // 1B: Look on the NEXT 1 or 2 lines below the label
        for (let next = i + 1; next <= Math.min(i + 2, lines.length - 1); next++) {
          const nextLine = lines[next];
          if (/^(?:NAME|COURSE|PROGRAM|BIRTH|VALID|COLLEGE|DEPARTMENT)\b/i.test(nextLine) || yearIndicator.test(nextLine)) {
            break;
          }
          const matchNext = nextLine.match(idPattern);
          if (matchNext) {
            const cleaned = cleanCandidate(matchNext[0]);
            if (cleaned.length >= 3 && /\d/.test(cleaned) && !isYearOrDatePattern(cleaned)) {
              studentNumber = cleaned;
              break;
            }
          }
        }
        if (studentNumber) break;
      }
    }

    // Pass 2: Hyphenated patterns across the whole text (e.g. 20-22252, 2023 - 00142), ignoring years
    if (!studentNumber) {
      const allHyphenMatches = text.match(/\b([A-Z0-9]{1,8}\s*[-–—]\s*[A-Z0-9]{2,10}(?:\s*[-–—]\s*[A-Z0-9]{1,8})?)\b/gi);
      if (allHyphenMatches) {
        for (const m of allHyphenMatches) {
          const cleaned = cleanCandidate(m);
          if (cleaned.length >= 4 && /\d/.test(cleaned) && !isYearOrDatePattern(cleaned)) {
            studentNumber = cleaned;
            break;
          }
        }
      }
    }

    // Pass 3: Long numeric strings (5-14 digits, strictly avoiding 4-digit years)
    if (!studentNumber) {
      const allDigits = text.match(/\b\d{5,14}\b/g);
      if (allDigits && allDigits.length > 0) {
        const nonYear = allDigits.filter(d => !isYearOrDatePattern(d));
        if (nonYear.length > 0) studentNumber = nonYear[0];
      }
    }

    // Collect all candidate tokens for one-tap librarian correction (strictly filtered from years)
    const candidates = Array.from(
      new Set(
        (text.match(/\b([A-Z0-9]{1,8}\s*[-–—]\s*[A-Z0-9]{2,10}|\d{5,14})\b/gi) || [])
          .map(t => cleanCandidate(t))
          .filter(t => t.length >= 4 && /\d/.test(t) && !isYearOrDatePattern(t))
      )
    ).slice(0, 6);
    setDetectedCandidates(candidates);

    // --- Name extraction: FIRSTNAME [MIDDLENAME] LASTNAME ---
    let firstname = '', middle_name = '', lastname = '';

    const titleCase = (w) => {
      if (!w) return '';
      if (/^[A-Za-z]\.?$/.test(w)) return w.toUpperCase().endsWith('.') ? w.toUpperCase() : `${w.toUpperCase()}.`;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    };

    const parseNameTokens = (fullNameStr) => {
      if (!fullNameStr) return { fn: '', mn: '', ln: '' };
      const cleanStr = fullNameStr
        .replace(/^(?:NAME|STUDENT NAME|FULL NAME|PANGALAN)[\s.:#-]+/i, '')
        .replace(/[^\w\s.-]/g, '')
        .trim();

      const parts = cleanStr.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return { fn: '', mn: '', ln: '' };
      if (parts.length === 1) return { fn: titleCase(parts[0]), mn: '', ln: '' };

      const compoundPrefixes = ['DE LA', 'DELA', 'DE LOS', 'DELOS', 'DE', 'DEL', 'SAN', 'SANTA', 'STA', 'STA.'];
      let fn = '', mn = '', ln = '';

      // Check if last 2 or 3 tokens form a compound surname (e.g. DELA CRUZ, DE GUZMAN)
      if (parts.length >= 3) {
        const prefixMatch2 = compoundPrefixes.some(p => p.toUpperCase() === parts[parts.length - 2].toUpperCase());
        const prefixMatch3 = parts.length >= 4 && (
          `${parts[parts.length - 3]} ${parts[parts.length - 2]}`.toUpperCase() === 'DE LOS' ||
          `${parts[parts.length - 3]} ${parts[parts.length - 2]}`.toUpperCase() === 'DE LA'
        );

        if (prefixMatch3) {
          ln = parts.slice(-3).map(titleCase).join(' ');
          const remaining = parts.slice(0, -3);
          if (remaining.length === 1) {
            fn = titleCase(remaining[0]);
          } else {
            fn = remaining.slice(0, -1).map(titleCase).join(' ');
            mn = titleCase(remaining[remaining.length - 1]);
          }
        } else if (prefixMatch2) {
          ln = parts.slice(-2).map(titleCase).join(' ');
          const remaining = parts.slice(0, -2);
          if (remaining.length === 1) {
            fn = titleCase(remaining[0]);
          } else {
            fn = remaining.slice(0, -1).map(titleCase).join(' ');
            mn = titleCase(remaining[remaining.length - 1]);
          }
        }
      }

      // Standard naming (no compound prefix detected)
      if (!ln) {
        ln = titleCase(parts[parts.length - 1]);
        if (parts.length === 2) {
          fn = titleCase(parts[0]);
        } else if (parts.length === 3) {
          fn = titleCase(parts[0]);
          mn = titleCase(parts[1]);
        } else {
          // 4+ words (e.g. John Paul Protacio Santos)
          fn = parts.slice(0, -2).map(titleCase).join(' ');
          mn = titleCase(parts[parts.length - 2]);
        }
      }

      return { fn, mn, ln };
    };

    // 1. Look for labeled name line (e.g. "NAME: JUAN P. DELA CRUZ")
    const labeledNameMatch = text.match(/(?:STUDENT\s*NAME|FULL\s*NAME|NAME|PANGALAN)\s*[:.#-]+\s*([A-Za-z][A-Za-z\s.-]{3,50})/i);
    if (labeledNameMatch && labeledNameMatch[1]) {
      const parsed = parseNameTokens(labeledNameMatch[1]);
      firstname = parsed.fn;
      middle_name = parsed.mn;
      lastname = parsed.ln;
    }

    // 2. Comma format fallback (e.g. "DELA CRUZ, JUAN PROTACIO")
    if (!firstname) {
      const commaNameMatch = text.match(/([A-Z][A-Za-z\s]+),\s*([A-Za-z][A-Za-z\s.-]+)/);
      if (commaNameMatch) {
        const lastPart = commaNameMatch[1].trim();
        const firstParts = commaNameMatch[2].trim().split(/\s+/);
        lastname = lastPart.split(/\s+/).map(titleCase).join(' ');
        firstname = firstParts[0] ? titleCase(firstParts[0]) : '';
        if (firstParts.length > 1) {
          middle_name = firstParts.slice(1).map(titleCase).join(' ');
        }
      }
    }

    // 3. Unlabeled prominent name line detector (lines with 2 to 4 name-like words)
    if (!firstname) {
      const headerFilter = /^(?:COLLEGE|UNIVERSITY|SCHOOL|INSTITUTE|STUDENT|REPUBLIC|DEPARTMENT|PHILIPPINES|LIBRARY|EDUCATION|CAMPUS|ACADEMIC|SEMESTER|GRADE|STRAND|TRACK|VALID|SIGNATURE|EXPIRES|PRINCIPAL|REGISTRAR|OFFICE|DATE|ID|NO|LRN|SN)\b/i;

      for (const line of lines) {
        // Skip header lines or lines with digits/dates
        if (headerFilter.test(line) || /\d/.test(line)) continue;

        // Check if line looks like a valid person name (2 to 4 words of alphabetic text)
        const nameCandidates = line.match(/^([A-Za-z]{2,}(?:\s+[A-Za-z.-]{1,}){1,4})$/);
        if (nameCandidates) {
          const parsed = parseNameTokens(nameCandidates[1]);
          if (parsed.fn && parsed.ln) {
            firstname = parsed.fn;
            middle_name = parsed.mn;
            lastname = parsed.ln;
            break;
          }
        }
      }
    }

    const updates = {};
    if (firstname) { updates.firstname = firstname; filled.firstname = true; }
    if (middle_name) { updates.middle_name = middle_name; filled.middle_name = true; }
    if (lastname) { updates.lastname = lastname; filled.lastname = true; }
    if (studentNumber) { updates.student_number = studentNumber; filled.student_number = true; }

    if (Object.keys(updates).length > 0) {
      setRegisterForm(prev => ({ ...prev, ...updates }));
      setPrefilledFields(filled);
    }

    return {
      foundName: !!(firstname || lastname),
      foundId: !!studentNumber,
      extractedCount: (firstname ? 1 : 0) + (lastname ? 1 : 0) + (studentNumber ? 1 : 0)
    };
  };

  // Dry-run parsing without modifying form state (for multi-angle OCR comparison)
  const testOcrExtraction = (text) => {
    if (!text) return { foundName: false, foundId: false, extractedCount: 0 };
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const labelRegex = /(?:STUDENT\s*(?:NO|NUMBER|ID|CODE|#)|ID\s*(?:NO|NUMBER|#)|I\.?D\.?\s*(?:NO|#)?|LRN|S\.?N\.?|PATRON\s*(?:ID|NO))\b/i;
    const yearIndicator = /(?:S\.?Y\.?|A\.?Y\.?|SCHOOL\s*YEAR|ACADEMIC\s*YEAR|VALID\s*(?:UNTIL|THRU|DATE)?|EXPIR|ISSUE|BIRTH|YEAR\s*LEVEL)\b/i;
    const idPattern = /([A-Z0-9]{1,8}(?:\s*[-–—]\s*[A-Z0-9]{2,10})+|\b\d{5,14}\b)/i;

    let hasId = false;
    let hasName = false;

    for (const line of lines) {
      if (labelRegex.test(line) && !yearIndicator.test(line)) {
        hasId = true;
        break;
      }
      if (idPattern.test(line) && !yearIndicator.test(line)) {
        hasId = true;
      }
      if (/^[A-Za-z]{2,}(?:\s+[A-Za-z.-]{1,}){1,4}$/.test(line)) {
        hasName = true;
      }
    }
    return {
      foundName: hasName,
      foundId: hasId,
      extractedCount: (hasName ? 1 : 0) + (hasId ? 1 : 0)
    };
  };

  const resetScan = () => {
    stopCamera();
    setIdImageDataUrl(null);
    setIdImageFile(null);
    setOcrProgress(0);
    setOcrRawText('');
    setDetectedCandidates([]);
    setShowRawOcr(false);
    setScanError('');
    setScanStep('idle');
    setScanEngine(null);
    setScanStatusMsg('');
    setPrefilledFields({});
    if (typeof window !== 'undefined') {
      setIdOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    }
  };

  const closeScanPanel = () => {
    stopCamera();
    setScanPanelOpen(false);
    setScanStep('idle');
    setScanError('');
    setOcrProgress(0);
  };

  const handleCopyText = (text, fieldKey) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(""), 2200);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!registerForm.firstname.trim()) {
      errors.firstname = 'First name is required';
    }
    
    if (!registerForm.lastname.trim()) {
      errors.lastname = 'Last name is required';
    }
    
    if (!registerForm.student_number.trim()) {
      errors.student_number = 'Student Number / ID is required';
    }
    
    return errors;
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setRegisterError(firstError);
      setRegisterLoading(false);
      return;
    }

    const finalPortalEmail = autoPortalEmail;
    const finalPassword = autoPassword;

    const formattedStudentName = [
      registerForm.firstname.trim(),
      registerForm.middle_name.trim(),
      registerForm.lastname.trim()
    ].filter(Boolean).join(' ');

    try {
      // Register through Libralink auth endpoint with initial credentials & core identity
      const { data, error: signUpError } = await signUp(
        finalPortalEmail,
        finalPassword,
        {
          role_id: 4,
          firstname: registerForm.firstname.trim(),
          middle_name: registerForm.middle_name.trim(),
          lastname: registerForm.lastname.trim(),
          student_number: registerForm.student_number.trim(),
          lrn: registerForm.student_number.trim(),
          policy_accepted: false, // will prompt for onboarding on first login
        }
      );

      if (signUpError) throw signUpError;

      const newUserId = data?.user_id;

      // Preserve captured ID photo URL for success modal display and local ID cache
      const savedPhotoUrl = idImageDataUrl;
      if (newUserId && savedPhotoUrl) {
        try {
          localStorage.setItem(`libralink_id_card_${newUserId}`, savedPhotoUrl);
        } catch (_) {}
      }

      // Upload the scanned ID card photo into the dedicated id_card_picture field (not the profile avatar)
      if (newUserId && (idImageFile || idImageDataUrl)) {
        try {
          if (idImageFile) {
            const formData = new FormData();
            formData.append('id_card_picture', idImageFile);
            await api.post(`/users/${newUserId}/id-card`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } else if (idImageDataUrl) {
            await api.post(`/users/${newUserId}/id-card`, {
              id_card_picture: idImageDataUrl
            });
          }
        } catch (picErr) {
          console.warn('[SCAN] Could not upload student ID card photo:', picErr);
        }
      }

      setRegisteredStudent({
        name: formattedStudentName,
        firstname: registerForm.firstname.trim(),
        middle_name: registerForm.middle_name.trim(),
        lastname: registerForm.lastname.trim(),
        student_number: registerForm.student_number.trim(),
        portal_email: finalPortalEmail,
        temporary_password: finalPassword,
        school_name: schoolInfo.name,
        school_code: schoolInfo.code,
        id_photo_url: savedPhotoUrl, // for success screen thumbnail
      });

      // Reset form + scan state
      setRegisterForm({
        firstname: "",
        middle_name: "",
        lastname: "",
        student_number: "",
        customPassword: "",
      });
      setPinSuffix(Math.floor(1000 + Math.random() * 9000));
      resetScan();
      setScanPanelOpen(false);
    } catch (err) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || "Student registration failed. Please verify uniqueness of credentials.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const resetFormToNew = () => {
    setRegisteredStudent(null);
    setRegisterError("");
    setRegisterForm({
      firstname: "",
      middle_name: "",
      lastname: "",
      student_number: "",
      customPassword: "",
    });
    setPinSuffix(Math.floor(1000 + Math.random() * 9000));
    resetScan();
    setScanPanelOpen(false);
  };

  const handlePrintSlip = () => {
    if (!registeredStudent) return;
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Borrower Pass - ${registeredStudent.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            color: #1e293b;
            background: #fff;
          }
          .pass-card {
            border: 2px solid #0284c7;
            border-radius: 16px;
            padding: 24px;
            max-width: 550px;
            margin: 0 auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .badge {
            background: #0284c7;
            color: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .school-title {
            font-size: 14px;
            font-weight: 800;
            color: #0369a1;
          }
          .pass-type {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
          }
          .student-name {
            font-size: 22px;
            font-weight: 900;
            margin: 0 0 6px 0;
            color: #0f172a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 16px 0;
            background: #f8fafc;
            padding: 14px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .info-item {
            font-size: 12px;
          }
          .info-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            display: block;
          }
          .info-val {
            font-weight: 700;
            color: #1e293b;
          }
          .full-width {
            grid-column: span 2;
          }
          .credentials {
            border: 1.5px dashed #0284c7;
            background: #f0f9ff;
            border-radius: 12px;
            padding: 14px;
            margin-top: 16px;
          }
          .cred-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0369a1;
            margin-bottom: 8px;
          }
          .barcode {
            text-align: center;
            margin-top: 20px;
            letter-spacing: 5px;
            font-family: monospace;
            font-weight: 900;
            color: #475569;
          }
          .footer-note {
            font-size: 10px;
            text-align: center;
            color: #94a3b8;
            margin-top: 14px;
          }
        </style>
      </head>
      <body>
        <div class="pass-card">
          <div class="header">
            <div>
              <div class="pass-type">Institutional Library Pass</div>
              <div class="school-title">${registeredStudent.school_name} (${registeredStudent.school_code})</div>
            </div>
            <div class="badge">Student Patron</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin: 16px 0;">
            ${registeredStudent.id_photo_url ? `
              <img src="${registeredStudent.id_photo_url}" style="width: 88px; height: 88px; object-fit: cover; border-radius: 16px; border: 3px solid #0284c7; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" alt="Student ID" />
            ` : `
              <div style="width: 80px; height: 80px; border-radius: 16px; background: #0284c7; color: #fff; font-size: 26px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                ${((registeredStudent.firstname?.[0] || '') + (registeredStudent.lastname?.[0] || '')).toUpperCase() || 'ID'}
              </div>
            `}
            <h1 class="student-name" style="margin: 0 0 4px 0;">${registeredStudent.name}</h1>
            <span style="display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 8px; font-family: monospace; font-size: 13px; font-weight: 800;">
              ID: ${registeredStudent.student_number}
            </span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Student ID Number</span>
              <span class="info-val">${registeredStudent.student_number}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Account Status</span>
              <span class="info-val" style="color: #059669;">Ready for Onboarding</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">First Login Instructions</span>
              <span class="info-val" style="color: #475569; font-weight: normal;">
                Log in to Libralink using the credentials below to select your degree program/course and complete your profile.
              </span>
            </div>
          </div>

          <div class="credentials">
            <div class="cred-title">Libralink Official Portal Credentials</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <div><strong>Username:</strong> <code style="color:#0369a1;">${registeredStudent.portal_email}</code></div>
              <div><strong>Initial Password:</strong> <code style="color:#059669;">${registeredStudent.temporary_password}</code></div>
            </div>
          </div>

          <div class="barcode">
            ||| | ||| || |||| | ||| || | |||<br>
            <span style="font-size: 11px; letter-spacing: 2px;">${registeredStudent.student_number}</span>
          </div>

          <div class="footer-note">
            Official borrower pass issued on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please present at the circulation counter to borrow physical books.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Modern Academic Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10 mb-3">
              <FiShield className="w-3.5 h-3.5 text-emerald-300" />
              Patron Onboarding Studio · {schoolInfo.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Register New Student Borrower</h1>
            <p className="text-blue-200/80 text-sm mt-1 max-w-xl">
              Quick patron registration. Enter the 4 student identity fields or scan their physical ID. Detailed program, address, and reading preferences will be completed by the student upon first login.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-white flex items-center justify-center font-black text-sm">
              {schoolInfo.code}
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Active Campus</p>
              <p className="text-sm font-bold text-white leading-tight">{schoolInfo.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Quick Scan / Camera Panel (Only visible when no ID is attached) ===== */}
      {!idImageDataUrl && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-sm ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/90'
        }`}>
          {/* Default State: Direct 1-Tap Action Card */}
          {scanStep === 'idle' && (
            <div className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FiCamera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Quick Register via Student ID
                    </h3>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Camera OCR automatically reads name and student number from the physical ID card.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
                  >
                    <FiCamera className="w-4 h-4" />
                    <span>Scan with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      darkMode 
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <FiUpload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Capturing State: Adaptive Live Viewfinder */}
          {scanStep === 'capturing' && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] sm:aspect-video shadow-2xl border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Top Control Bar over Live Video */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 text-white shadow-lg">
                    <span className={`w-2 h-2 rounded-full ${idOrientation === 'portrait' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
                    <span className="text-[11px] font-bold tracking-wide uppercase">
                      {idOrientation === 'portrait' ? 'Portrait ID' : 'Landscape ID'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIdOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
                    className="px-3 py-1.5 rounded-full bg-blue-600/85 hover:bg-blue-600 text-white text-xs font-bold backdrop-blur-md border border-blue-400/30 flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
                    title="Toggle between Landscape (horizontal) and Portrait (vertical) ID orientation"
                  >
                    <FiRotateCw className="w-3.5 h-3.5 text-blue-200" />
                    <span>Switch to {idOrientation === 'portrait' ? 'Landscape' : 'Portrait'}</span>
                  </button>
                </div>

                {/* Adaptive Viewfinder Frame Guide with Tech Corners & Laser Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
                  <div
                    ref={frameGuideRef}
                    className={`transition-all duration-300 ease-out relative rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
                      idOrientation === 'portrait'
                        ? 'w-[58%] sm:w-[46%] aspect-[54/85.6] max-h-[82%]'
                        : 'w-[84%] sm:w-[75%] aspect-[85.6/54] max-h-[75%]'
                    }`}
                  >
                    {/* Tech Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />

                    {/* Gentle Animated Scanner Line */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse top-1/2 -translate-y-1/2" />

                    {/* Center Target Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-25">
                      <div className="w-8 h-8 border border-dashed border-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Bottom Guidance Floating Badge */}
                <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none z-20 px-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/10 text-white text-xs font-semibold drop-shadow">
                    Position {idOrientation === 'portrait' ? 'vertical' : 'horizontal'} student ID inside frame
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer"
                >
                  <FiCamera className="w-4 h-4" /> Capture {idOrientation === 'portrait' ? 'Portrait' : 'Landscape'} ID
                </button>
                <button
                  type="button"
                  onClick={() => { stopCamera(); setScanStep('idle'); }}
                  className={`px-5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Scanning State: OCR Progress */}
          {scanStep === 'scanning' && (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FiZap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    {scanStatusMsg || `Reading ${idOrientation === 'portrait' ? 'Portrait' : 'Landscape'} ID…`}
                  </span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {scanStatusMsg.includes('Gemini') 
                    ? '✨ High-precision multimodal analysis via Google Gemini Vision AI'
                    : 'Smart auto-orientation active · Fallback local processing'}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {(scanStep === 'error' || scanError) && (
            <div className="p-4 m-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <FiAlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{scanError || 'Camera or OCR failed. Please try again.'}</span>
              </div>
              <button
                type="button"
                onClick={resetScan}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {registerError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-slide-up">
          <FiAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900">Registration Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{registerError}</p>
          </div>
        </div>
      )}


      {/* Registration Form Card */}
      <div className={`rounded-3xl border shadow-sm p-6 sm:p-8 transition-colors ${
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200/90"
      }`}>
        <form 
          onSubmit={handleRegisterStudent} 
          autoComplete="off" 
          className="space-y-7"
          data-lpignore="true"
        >
          {/* Unified Compact ID Hero Badge (When an ID photo is attached) */}
          {idImageDataUrl && (
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all animate-slide-up shadow-xs ${
              darkMode 
                ? "bg-slate-900/90 border-slate-700/80 text-slate-100" 
                : "bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border-blue-200 text-slate-900"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* ID Thumbnail with orientation tag & verified check */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={idImageDataUrl}
                      alt="Scanned Student ID Card"
                      className={`${
                        idOrientation === 'portrait' ? 'w-14 h-20' : 'w-20 h-14'
                      } rounded-xl object-cover border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20`}
                    />
                    <div 
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm"
                      title="ID Photo Attached"
                    >
                      <FiCheck className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-900/90 text-white shadow-xs">
                      {idOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </span>
                  </div>

                  {/* ID Patron Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {registerForm.firstname || registerForm.lastname 
                          ? `${registerForm.firstname} ${registerForm.middle_name ? registerForm.middle_name + ' ' : ''}${registerForm.lastname}`.trim()
                          : "Student ID Attached"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        scanEngine === 'gemini'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      }`}>
                        {scanEngine === 'gemini' ? '✨ Gemini AI Verified' : '✓ OCR Verified'}
                      </span>
                    </div>

                    {registerForm.student_number ? (
                      <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        ID: {registerForm.student_number}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Photo linked to student profile & borrower pass
                      </p>
                    )}

                    {/* Detected Field Tags */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {prefilledFields.firstname && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          ✓ Firstname
                        </span>
                      )}
                      {prefilledFields.middle_name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          ✓ Middle
                        </span>
                      )}
                      {prefilledFields.lastname && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          ✓ Lastname
                        </span>
                      )}
                      {prefilledFields.student_number && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          ✓ Student #
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Re-scan & Remove */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      resetScan();
                      openCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ${
                      darkMode 
                        ? "bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700" 
                        : "bg-white hover:bg-slate-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    <span>Re-scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Remove ID picture"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detected Alternative Numbers */}
              {detectedCandidates.length > 1 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch ID #:
                  </span>
                  {detectedCandidates.map(cand => (
                    <button
                      key={cand}
                      type="button"
                      onClick={() => {
                        setRegisterForm(prev => ({ ...prev, student_number: cand }));
                        setPrefilledFields(p => ({ ...p, student_number: true }));
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        registerForm.student_number === cand
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {cand} {registerForm.student_number === cand ? "✓" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 1: Student Identity */}
          <div>
            <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${
              darkMode ? "border-slate-700" : "border-slate-100"
            }`}>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FiUser className="w-4 h-4" />
              </div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${
                darkMode ? "text-slate-300" : "text-slate-900"
              }`}>
                1. Student Patron Identity
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`flex items-center justify-between text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_fname">
                  <span>First Name <span className="text-rose-500">*</span></span>
                  {prefilledFields.firstname && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">Scanned</span>
                  )}
                </label>
                <input
                  id="student_reg_fname"
                  name="student_first_name"
                  type="text"
                  placeholder="e.g. Juan"
                  value={registerForm.firstname}
                  onChange={(e) => {
                    setRegisterForm({...registerForm, firstname: e.target.value});
                    if (prefilledFields.firstname) setPrefilledFields(p => ({ ...p, firstname: false }));
                  }}
                  required
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    prefilledFields.firstname ? "ring-2 ring-indigo-400 border-indigo-400 " : ""
                  }${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`flex items-center justify-between text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_mname">
                  <span>Middle Name <span className="text-slate-400 font-normal text-[11px]">(Optional)</span></span>
                  {prefilledFields.middle_name && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">Scanned</span>
                  )}
                </label>
                <input
                  id="student_reg_mname"
                  name="student_middle_name"
                  type="text"
                  placeholder="e.g. Protacio"
                  value={registerForm.middle_name}
                  onChange={(e) => {
                    setRegisterForm({...registerForm, middle_name: e.target.value});
                    if (prefilledFields.middle_name) setPrefilledFields(p => ({ ...p, middle_name: false }));
                  }}
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    prefilledFields.middle_name ? "ring-2 ring-indigo-400 border-indigo-400 " : ""
                  }${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`flex items-center justify-between text-xs font-semibold mb-1.5 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_lname">
                  <span>Last Name <span className="text-rose-500">*</span></span>
                  {prefilledFields.lastname && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">Scanned</span>
                  )}
                </label>
                <input
                  id="student_reg_lname"
                  name="student_last_name"
                  type="text"
                  placeholder="e.g. Dela Cruz"
                  value={registerForm.lastname}
                  onChange={(e) => {
                    setRegisterForm({...registerForm, lastname: e.target.value});
                    if (prefilledFields.lastname) setPrefilledFields(p => ({ ...p, lastname: false }));
                  }}
                  required
                  autoComplete="off"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    prefilledFields.lastname ? "ring-2 ring-indigo-400 border-indigo-400 " : ""
                  }${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>
            </div>

            {/* Student ID / Number (Field 4) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className={`flex items-center gap-1.5 text-xs font-semibold ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`} htmlFor="student_reg_id">
                  <span>Student Number / ID <span className="text-rose-500">*</span></span>
                  {prefilledFields.student_number && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">Scanned</span>
                  )}
                </label>
                <span className={`text-[11px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Any format (alphanumeric, e.g. 20-22252, CS-001, etc.)
                </span>
              </div>
              <div className="relative">
                <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="student_reg_id"
                  name="student_id_code"
                  type="text"
                  placeholder="Enter Student ID / Number"
                  value={registerForm.student_number}
                  onChange={handleIdChange}
                  required
                  autoComplete="off"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    prefilledFields.student_number ? "ring-2 ring-indigo-400 border-indigo-400 " : ""
                  }${
                    darkMode 
                      ? "bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-900" 
                      : "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Institutional Student ID or barcode identifier</p>
            </div>
          </div>

              {/* Automatic Credentials Preview Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                darkMode 
                  ? "bg-slate-900/80 border-slate-700 shadow-inner" 
                  : "bg-slate-50 border-slate-200/90 shadow-sm"
              }`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      darkMode ? "text-emerald-400" : "text-emerald-700"
                    }`}>
                      Live Generated Portal Credentials
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={regeneratePin}
                    className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Generate new random 4-digit PIN"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Regenerate PIN
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Generated Email */}
                  <div className={`p-3 rounded-xl border ${
                    darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Institutional Portal Username
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5 select-all">
                      {autoPortalEmail}
                    </p>
                  </div>

                  {/* Generated Password */}
                  <div className={`p-3 rounded-xl border ${
                    darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"
                  }`}>
                    <span className={`text-[10px] font-bold uppercase ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Temporary Initial Password
                    </span>
                    <p className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5 select-all">
                      {autoPassword}
                    </p>
                  </div>
                </div>
              </div>

          {/* Form Action Controls */}
          <div className={`pt-4 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-3 ${
            darkMode ? "border-slate-700" : "border-slate-100"
          }`}>
            <button
              type="button"
              onClick={resetFormToNew}
              className={`w-full sm:w-auto px-5 py-2.5 border text-xs font-bold rounded-xl transition-colors ${
                darkMode 
                  ? "border-slate-700 text-slate-300 hover:bg-slate-700" 
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Reset Fields
            </button>
            <Button
              type="submit"
              disabled={registerLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all"
            >
              {registerLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Student Account...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Complete Registration
                  <FiArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* CELEBRATORY ANIMATED OVERLAY MODAL                         */}
      {/* ========================================================= */}
      {registeredStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          
          {/* Confetti / Particle Embellishments */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-1/4 w-3 h-3 bg-emerald-400 rounded-full animate-bounce opacity-80" />
            <div className="absolute top-20 right-1/4 w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse opacity-70" />
            <div className="absolute top-1/3 left-10 w-3 h-3 bg-amber-400 rotate-45 animate-ping opacity-60" />
            <div className="absolute bottom-20 right-10 w-3 h-3 bg-teal-400 rounded-full animate-bounce opacity-70" />
            <div className="absolute top-16 right-1/3 w-4 h-1.5 bg-indigo-400 rotate-12 animate-pulse opacity-75" />
          </div>

          <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-scale-up ${
            darkMode 
              ? "bg-slate-900 border-slate-700 text-slate-100" 
              : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            {/* Modal Ambient Glow */}
            <div className="absolute -right-16 -top-16 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className={`p-6 border-b flex items-start justify-between relative z-10 ${
              darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/80"
            }`}>
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <FiCheckCircle className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-extrabold tracking-tight">
                      Student Registered Successfully!
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Active Patron
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official borrower account created and circulation rights granted.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRegisteredStudent(null)}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Close overlay"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Digital Library Pass */}
            <div className="p-6 sm:p-7 space-y-6 relative z-10">
              
              {/* Digital Library Card Badge */}
              <div className={`p-6 rounded-2xl border relative overflow-hidden transition-all shadow-lg ${
                darkMode 
                  ? "bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-slate-700" 
                  : "bg-gradient-to-b from-blue-50/90 via-indigo-50/40 to-white border-blue-200"
              }`}>
                {/* School Header Row */}
                <div className={`flex items-center justify-between gap-2 pb-3.5 border-b ${
                  darkMode ? "border-slate-700/80" : "border-slate-200/80"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {registeredStudent.school_code}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                        Library Pass
                      </span>
                      <span className={`text-xs font-bold leading-none ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                        {registeredStudent.school_name}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-600 text-white tracking-wider shadow-xs">
                    Student Pass
                  </span>
                </div>

                {/* Centered Photo & Identity Badge (Top Center ID Picture) */}
                <div className="pt-5 pb-2 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    {registeredStudent.id_photo_url ? (
                      <div className="relative">
                        <img
                          src={registeredStudent.id_photo_url}
                          alt="Student ID Photo"
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-xl ring-2 ring-blue-500/40"
                        />
                        <div 
                          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm" 
                          title="Verified ID Photo"
                        >
                          <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-slate-800 shadow-xl flex flex-col items-center justify-center ${
                        darkMode ? "bg-slate-700/90 text-blue-300 ring-2 ring-slate-600" : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-2 ring-blue-300"
                      }`}>
                        <span className="text-2xl font-black tracking-tight">
                          {((registeredStudent.firstname?.[0] || "") + (registeredStudent.lastname?.[0] || "")).toUpperCase() || "ID"}
                        </span>
                        <span className="text-[10px] font-extrabold opacity-80 uppercase tracking-widest mt-0.5">
                          Patron
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Student Full Name - Explicit High Contrast Color */}
                  <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
                    darkMode ? "text-white" : "text-slate-900"
                  }`}>
                    {registeredStudent.name}
                  </h3>

                  {/* ID Pill & Status */}
                  <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg font-mono text-xs font-black border shadow-xs ${
                      darkMode 
                        ? "bg-slate-800/90 text-blue-300 border-slate-700" 
                        : "bg-white text-blue-900 border-blue-200"
                    }`}>
                      ID: {registeredStudent.student_number}
                    </span>
                    <span className={`text-xs italic ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      • Profile details to be completed on first login
                    </span>
                  </div>

                  {/* Visual Barcode Strip */}
                  <div className={`mt-4 pt-3 border-t border-dashed w-full flex flex-col items-center ${
                    darkMode ? "border-slate-700/80" : "border-slate-200"
                  }`}>
                    <div className={`font-mono text-xs tracking-[4px] font-bold select-none ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}>
                      ||| | ||| || |||| | ||| || |||
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 tracking-widest mt-0.5">
                      {registeredStudent.student_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portal Credentials Section */}
              <div className={`p-4 rounded-2xl border ${
                darkMode ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated Authentication Credentials
                  </span>
                  
                  {/* Gmail Delivery Pill */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    registeredStudent.email_sent 
                      ? (darkMode ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" : "bg-emerald-100 text-emerald-700 border-emerald-300")
                      : (darkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-300")
                  }`}>
                    <FiSend className="w-3 h-3" />
                    {registeredStudent.email_sent 
                      ? "Dispatched to Gmail" 
                      : (registeredStudent.email_skipped ? "Delivery Skipped (Optional)" : "Email Queued")}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Portal Username */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FiMail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Portal Username</span>
                        <p className={`font-mono text-xs sm:text-sm font-bold truncate ${
                          darkMode ? "text-white" : "text-slate-900"
                        }`}>
                          {registeredStudent.portal_email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(registeredStudent.portal_email, "email")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        copiedField === "email"
                          ? "bg-emerald-600 text-white"
                          : darkMode
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {copiedField === "email" ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "email" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Temporary Password */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <FiLock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Temporary Password</span>
                        <p className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                          {registeredStudent.temporary_password}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(registeredStudent.temporary_password, "password")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        copiedField === "password"
                          ? "bg-emerald-600 text-white"
                          : darkMode
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {copiedField === "password" ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "password" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                  <FiSend className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  {registeredStudent.personal_email && registeredStudent.email_sent ? (
                    <span className="truncate">Sent to student's inbox: <strong>{registeredStudent.personal_email}</strong></span>
                  ) : (
                    <span className="truncate">Account active in Libralink system. Ready for circulation and physical slip printing.</span>
                  )}
                </div>
              </div>

              {/* Security Notice: Unlock link is delivered via Gmail only */}
              {registeredStudent.email_sent && (
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  darkMode ? "bg-emerald-950/30 border-emerald-800/50" : "bg-emerald-50 border-emerald-200"
                }`}>
                  <FiShield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Secure Account Unlock Link Sent</span>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 leading-relaxed">
                      A one-time account unlock link was emailed to <strong>{registeredStudent.personal_email}</strong>. For security, this link is only accessible via the student's Gmail inbox.
                    </p>
                  </div>
                </div>
              )}
              {!registeredStudent.email_sent && (
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}>
                  <FiMail className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">No Email Provided</span>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      No Gmail was entered, so no unlock link was sent. The student can visit the library counter to access their credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className={`p-5 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 ${
              darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/80"
            }`}>
              <button
                type="button"
                onClick={handlePrintSlip}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  darkMode 
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                    : "border-slate-300 text-slate-700 hover:bg-white"
                }`}
              >
                <FiPrinter className="w-3.5 h-3.5" />
                Print Borrower Slip
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetFormToNew}
                  className={`flex-1 sm:flex-none text-xs font-bold rounded-xl ${
                    darkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
                  Register Another
                </Button>

                {onNavigateTab && (
                  <Button
                    size="sm"
                    onClick={() => onNavigateTab('list-students')}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20"
                  >
                    View Directory
                    <FiArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAddStudent;
