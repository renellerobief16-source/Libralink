const express = require('express');
const router = express.Router();
const Library = require('../models/Library');
const User = require('../models/User');
const Notification = require('../models/Notification');
const supabase = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const { sendDirectLibrarianEmail } = require('../utils/email');
const bcrypt = require('bcryptjs');

// @route   GET /api/libraries/school/:school_id
// @desc    Get all libraries belonging to a school
// @access  Public (or Authenticated)
router.get('/school/:school_id', async (req, res) => {
  try {
    const { school_id } = req.params;
    const { status, library_type } = req.query;
    const libraries = await Library.findBySchool(school_id, { status, library_type });
    res.json({ success: true, data: libraries });
  } catch (error) {
    console.error('Error fetching libraries for school:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve libraries' });
  }
});

// @route   GET /api/libraries/school/:school_id/stats
// @desc    Get libraries with statistics (books, students, librarians count)
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.get('/school/:school_id/stats', auth, async (req, res) => {
  try {
    const { school_id } = req.params;
    const stats = await Library.getStats(school_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching library stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve library statistics' });
  }
});

// @route   GET /api/libraries/:id
// @desc    Get single library by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const library = await Library.findById(req.params.id);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }
    res.json({ success: true, data: library });
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve library' });
  }
});

// @route   GET /api/libraries/:id/analytics
// @desc    Get 360-degree analytics for a library (books, users, librarians, categories, circulation trends)
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const libraryId = Number(req.params.id);
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    // 1. Fetch assigned librarians
    const { data: librarians, error: libErr } = await supabase
      .from('users')
      .select('user_id, firstname, lastname, email, role_id, position, employee_number, profile_image, status, created_at')
      .eq('library_id', libraryId)
      .in('role_id', [2, 3, 5]);

    if (libErr) console.warn('[LIBRARIES] Could not fetch librarians:', libErr.message);

    // 2. Fetch patrons / students assigned to this library
    const { data: patrons, error: patronErr } = await supabase
      .from('users')
      .select('user_id, firstname, lastname, email, student_number, role_id, status, created_at, profile_image')
      .eq('library_id', libraryId)
      .in('role_id', [4, 6])
      .order('created_at', { ascending: false });

    if (patronErr) console.warn('[LIBRARIES] Could not fetch patrons:', patronErr.message);

    // 3. Fetch books belonging to this library
    const { data: books, error: bookErr } = await supabase
      .from('books')
      .select('book_id, title, author, category, genre, total_copies, available_copies, status')
      .eq('library_id', libraryId);

    if (bookErr) console.warn('[LIBRARIES] Could not fetch books:', bookErr.message);

    const safeBooks = books || [];
    const totalTitles = safeBooks.length;
    let totalCopies = 0;
    let availableCopies = 0;
    let borrowedCopies = 0;

    // Category distribution for Pie Chart
    const categoryMap = {};

    safeBooks.forEach(b => {
      const tot = Number(b.total_copies) || 1;
      const avail = Number(b.available_copies) || 0;
      totalCopies += tot;
      availableCopies += avail;
      borrowedCopies += Math.max(0, tot - avail);

      const catName = (b.category || b.genre || 'General Academic').trim();
      categoryMap[catName] = (categoryMap[catName] || 0) + tot;
    });

    const categoryDistribution = Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
      percent: totalCopies > 0 ? Math.round((count / totalCopies) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // 4. Fetch circulation transactions / borrow requests
    let circulationTrends = [];
    let activeBorrows = 0;
    let overdueCount = 0;

    try {
      // Query borrow_requests or borrow_transactions
      const { data: txList } = await supabase
        .from('borrow_requests')
        .select('request_id, created_at, status, borrow_date, return_date, due_date, home_library_id, source_library_id')
        .or(`home_library_id.eq.${libraryId},source_library_id.eq.${libraryId}`);

      const now = new Date();
      (txList || []).forEach(tx => {
        const s = (tx.status || '').toLowerCase();
        if (s === 'active' || s === 'approved' || s === 'borrowed') {
          activeBorrows += 1;
          if (tx.due_date && new Date(tx.due_date) < now) {
            overdueCount += 1;
          }
        }
      });

      // Build 6-month circulation trend
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const pastMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        pastMonths.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          month: monthNames[d.getMonth()],
          year: d.getFullYear(),
          borrows: 0,
          returns: 0
        });
      }

      (txList || []).forEach(tx => {
        if (tx.created_at) {
          const txDate = new Date(tx.created_at);
          const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          const m = pastMonths.find(p => p.key === key);
          if (m) {
            m.borrows += 1;
            if (tx.status === 'returned') {
              m.returns += 1;
            }
          }
        }
      });

      circulationTrends = pastMonths;
    } catch (cErr) {
      console.warn('[LIBRARIES] Could not aggregate circulation:', cErr.message);
    }

    res.json({
      success: true,
      data: {
        library,
        summary: {
          total_books: totalCopies,
          total_titles: totalTitles,
          available_books: availableCopies,
          borrowed_books: borrowedCopies,
          total_librarians: (librarians || []).length,
          total_patrons: (patrons || []).length,
          active_borrows: activeBorrows,
          overdue_borrows: overdueCount
        },
        librarians: librarians || [],
        patrons: patrons || [],
        category_distribution: categoryDistribution,
        circulation_trends: circulationTrends
      }
    });
  } catch (error) {
    console.error('Error fetching library analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve library analytics' });
  }
});

// @route   POST /api/libraries/:id/email-librarian
// @desc    Send direct email memo and in-app notification to assigned librarian
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.post('/:id/email-librarian', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const libraryId = Number(req.params.id);
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    const { recipient_user_id, recipient_email, recipient_name, subject, message, priority = 'normal' } = req.body;

    if (!recipient_email && !recipient_user_id) {
      return res.status(400).json({ success: false, message: 'Recipient librarian is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const schoolName = library.schools?.school_name || 'Guagua National College';
    const senderFullName = `${req.user.firstname} ${req.user.lastname || ''}`.trim() || 'Library Administrator';
    const memoTitle = subject?.trim() || `Staff Memo: ${library.name}`;

    // 1. Create In-App Notification in database for the Librarian
    if (recipient_user_id) {
      try {
        await Notification.create({
          user_id: Number(recipient_user_id),
          school_id: library.school_id,
          type: 'staff_memo',
          title: `[${priority.toUpperCase()}] ${memoTitle}`,
          message: `${message}\n\n— From: ${senderFullName} (${req.user.role_name || 'Administration'})`,
          is_admin_notification: true
        });
      } catch (notifErr) {
        console.warn('[LIBRARIES] Could not record staff memo notification:', notifErr.message);
      }
    }

    // 2. Dispatch Email through unified email service
    let emailDispatched = false;
    if (recipient_email) {
      try {
        const mailRes = await sendDirectLibrarianEmail({
          toEmail: recipient_email.trim(),
          recipientName: recipient_name || 'Librarian',
          subject: `[${schoolName}] ${memoTitle}`,
          messageBody: message.trim(),
          schoolName: schoolName,
          senderName: senderFullName,
          senderRole: req.user.role_name || 'Library Administrator',
          senderProfilePicture: req.user.profile_image || null
        });
        emailDispatched = !!(mailRes && mailRes.success);
      } catch (mailErr) {
        console.warn('[LIBRARIES] Email dispatch failed (will rely on in-app notification):', mailErr.message);
      }
    }

    // 3. Log Activity
    ActivityLog.create({
      user_id: req.user.user_id,
      school_id: library.school_id,
      activity_type: 'staff_memo_sent',
      action: 'send',
      description: `Sent staff memo to librarian (${recipient_email || recipient_name}) regarding "${library.name}"`,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[ACTIVITY LOG] Non-fatal error:', err.message));

    res.json({
      success: true,
      message: 'Staff memo sent successfully!',
      email_dispatched: emailDispatched
    });
  } catch (error) {
    console.error('Error sending staff memo:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send memo' });
  }
});

// @route   POST /api/libraries/:id/users
// @desc    Add a student patron or librarian staff assigned directly to this library unit
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.post('/:id/users', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const libraryId = Number(req.params.id);
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    const targetSchoolId = library.school_id || req.user.school_id;
    const {
      user_type = 'student', // 'student' | 'librarian'
      firstname,
      lastname,
      email,
      password,
      student_number,
      employee_number,
      position,
      role_id,
      contact_number,
      gender
    } = req.body;

    if (!firstname || !email) {
      return res.status(400).json({ success: false, message: 'First name and email are required' });
    }

    let resolvedRoleId = 4; // Default Student
    let defaultPosition = 'Student Patron';

    if (user_type === 'librarian') {
      resolvedRoleId = Number(role_id) === 2 ? 2 : 3;
      defaultPosition = resolvedRoleId === 2 ? 'Chief Librarian' : 'Unit Librarian';
    } else {
      resolvedRoleId = Number(role_id) || 4;
    }

    const defaultPw = password || `libra${Math.floor(1000 + Math.random() * 9000)}`;

    const userId = await User.create({
      school_id: targetSchoolId,
      library_id: libraryId,
      role_id: resolvedRoleId,
      firstname: firstname.trim(),
      lastname: (lastname || '').trim(),
      email: email.trim().toLowerCase(),
      password: defaultPw,
      student_number: student_number ? student_number.trim() : null,
      employee_number: employee_number ? employee_number.trim() : null,
      position: position || defaultPosition,
      contact_number: contact_number || null,
      gender: gender || 'other',
      status: 'active'
    });

    // Log Activity
    ActivityLog.create({
      user_id: req.user.user_id,
      school_id: targetSchoolId,
      activity_type: user_type === 'librarian' ? 'librarian_assigned' : 'patron_enrolled',
      action: 'create',
      description: `Added ${user_type} "${firstname} ${lastname || ''}" to library "${library.name}"`,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[ACTIVITY LOG] Non-fatal error:', err.message));

    res.status(201).json({
      success: true,
      message: `${user_type === 'librarian' ? 'Librarian' : 'Patron'} registered successfully!`,
      data: {
        user_id: userId,
        firstname,
        lastname,
        email: email.trim().toLowerCase(),
        role_id: resolvedRoleId,
        library_id: libraryId,
        library_name: library.name,
        temporary_password: defaultPw
      }
    });
  } catch (error) {
    console.error('Error creating user for library:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
});

// @route   POST /api/libraries
// @desc    Create a new library under a school (and optionally create an assigned librarian)
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.post('/', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const { name, library_type, description, status, school_id, librarian } = req.body;
    const targetSchoolId = school_id || req.user.school_id;

    if (!name || !targetSchoolId) {
      return res.status(400).json({
        success: false,
        message: 'Library name and school ID are required'
      });
    }

    const library = await Library.create({
      school_id: targetSchoolId,
      name,
      library_type: library_type || 'college',
      description,
      status: status || 'active'
    });

    // Retrieve school info for intelligent domain/email generation
    let schoolDomain = 'gnc.edu.ph';
    try {
      const { data: schoolRow } = await supabase
        .from('schools')
        .select('school_name, school_code')
        .eq('school_id', targetSchoolId)
        .limit(1)
        .single();
      if (schoolRow?.school_code) {
        schoolDomain = `${schoolRow.school_code.toLowerCase().trim()}.edu.ph`;
      }
    } catch (sErr) {
      console.warn('[LIBRARIES] Could not load school code for domain, fallback used:', sErr.message);
    }

    // Determine clean slug for the library (e.g. jhs, shs, elem, college)
    const rawType = (library_type || '').toLowerCase();
    const rawLibName = (name || '').toLowerCase();
    let slug = 'lib';
    if (rawType.includes('junior') || rawLibName.includes('junior') || rawLibName.includes('jhs')) {
      slug = 'jhs';
    } else if (rawType.includes('senior') || rawLibName.includes('senior') || rawLibName.includes('shs')) {
      slug = 'shs';
    } else if (rawType.includes('elementary') || rawLibName.includes('elem')) {
      slug = 'elem';
    } else if (rawType.includes('college')) {
      slug = 'college';
    } else {
      slug = rawLibName.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'unit';
    }

    // Prepare Librarian Credentials
    const librarianRoleId = Number(librarian?.role_id) === 2 ? 2 : 3;
    const finalFirstname = (librarian?.firstname && librarian.firstname.trim())
      ? librarian.firstname.trim()
      : `${name.replace(/library/i, '').trim() || 'Unit'}`;
    const finalLastname = (librarian?.lastname && librarian.lastname.trim())
      ? librarian.lastname.trim()
      : 'Librarian';
    
    // Auto-generate unique email if none provided
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const defaultEmail = `librarian.${slug}${randSuffix}@${schoolDomain}`;
    const finalEmail = (librarian?.email && librarian.email.trim())
      ? librarian.email.trim().toLowerCase()
      : defaultEmail;

    // Auto-generate clean, readable password
    const defaultPw = `${slug.toUpperCase()}lib${Math.floor(1000 + Math.random() * 9000)}`;
    const finalPassword = (librarian?.password && librarian.password.trim())
      ? librarian.password.trim()
      : defaultPw;

    let createdLibrarian = null;
    try {
      const librarianUserId = await User.create({
        school_id: targetSchoolId,
        library_id: library.library_id,
        role_id: librarianRoleId,
        firstname: finalFirstname,
        lastname: finalLastname,
        email: finalEmail,
        password: finalPassword,
        employee_number: librarian?.employee_number ? librarian.employee_number.trim() : `LIB-${Math.floor(10000 + Math.random() * 90000)}`,
        position: librarian?.position || (librarianRoleId === 2 ? 'Chief Librarian' : 'Unit Librarian'),
        status: 'active'
      });

      createdLibrarian = {
        user_id: librarianUserId,
        email: finalEmail,
        password: finalPassword,
        name: `${finalFirstname} ${finalLastname}`.trim(),
        role_id: librarianRoleId,
        role_name: librarianRoleId === 2 ? 'Librarian Admin' : 'Unit Librarian',
        library_name: library.name,
        library_type: library.library_type
      };
    } catch (libErr) {
      console.warn('[LIBRARIES] Could not auto-create librarian during library creation:', libErr.message);
    }

    // Log activity
    ActivityLog.create({
      user_id: req.user.user_id,
      school_id: targetSchoolId,
      activity_type: 'library_created',
      action: 'create',
      description: `Created new library: "${library.name}" (${library.library_type}) with dedicated librarian account "${finalEmail}"`,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[ACTIVITY LOG] Non-fatal error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Library and new librarian set created successfully',
      data: library,
      created_librarian: createdLibrarian
    });
  } catch (error) {
    console.error('Error creating library:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create library' });
  }
});

// @route   POST /api/libraries/:id/librarians
// @desc    Create a new librarian account assigned directly to this library unit
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.post('/:id/librarians', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const libraryId = Number(req.params.id);
    const library = await Library.findById(libraryId);
    if (!library) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    const targetSchoolId = library.school_id || req.user.school_id;
    const { firstname, lastname, email, password, employee_number, position, role_id } = req.body;

    if (!firstname || !email) {
      return res.status(400).json({ success: false, message: 'First name and email are required' });
    }

    const librarianRoleId = Number(role_id) === 2 ? 2 : 3;
    const userId = await User.create({
      school_id: targetSchoolId,
      library_id: libraryId,
      role_id: librarianRoleId,
      firstname: firstname.trim(),
      lastname: (lastname || '').trim(),
      email: email.trim().toLowerCase(),
      password: password || 'libralink123',
      employee_number: employee_number ? employee_number.trim() : null,
      position: position || (librarianRoleId === 2 ? 'Chief Librarian' : 'Unit Librarian'),
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Librarian account created and assigned to library successfully',
      data: {
        user_id: userId,
        firstname,
        lastname,
        email: email.trim().toLowerCase(),
        role_id: librarianRoleId,
        library_id: libraryId,
        library_name: library.name
      }
    });
  } catch (error) {
    console.error('Error creating librarian for library:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create librarian' });
  }
});

// @route   PUT /api/libraries/:id
// @desc    Update a library
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.put('/:id', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const libraryId = req.params.id;
    const existing = await Library.findById(libraryId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    // Verify school ownership if not Super Admin
    const isSuperAdmin = req.user.role_name === 'Super Admin' || req.user.role === 'Super Admin';
    if (!isSuperAdmin && String(existing.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify library of another school' });
    }

    const updated = await Library.update(libraryId, req.body);

    // Log activity
    ActivityLog.create({
      user_id: req.user.user_id,
      school_id: existing.school_id,
      activity_type: 'library_updated',
      action: 'update',
      description: `Updated library: "${updated.name}" (${updated.status})`,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[ACTIVITY LOG] Non-fatal error:', err.message));

    res.json({
      success: true,
      message: 'Library updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating library:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update library' });
  }
});

// @route   DELETE /api/libraries/:id
// @desc    Delete or deactivate a library with admin password verification
// @access  Private (Librarian Admin, Super Admin, Librarian)
router.delete('/:id', auth, requireRole(['Librarian Admin', 'Super Admin', 'Librarian']), async (req, res) => {
  try {
    const libraryId = req.params.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Admin password is required to delete this library' });
    }

    // Verify admin-librarian password against current user
    const { data: adminUser, error: userErr } = await supabase
      .from('users')
      .select('user_id, password')
      .eq('user_id', req.user.user_id)
      .single();

    if (userErr || !adminUser || !adminUser.password) {
      return res.status(401).json({ success: false, message: 'Could not verify admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect admin password. Deletion cancelled.' });
    }

    const existing = await Library.findById(libraryId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Library not found' });
    }

    const isSuperAdmin = req.user.role_name === 'Super Admin' || req.user.role === 'Super Admin';
    if (!isSuperAdmin && String(existing.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete library of another school' });
    }

    const result = await Library.delete(libraryId);

    if (result && result.blocked) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Log activity
    ActivityLog.create({
      user_id: req.user.user_id,
      school_id: existing.school_id,
      activity_type: 'library_deleted',
      action: 'delete',
      description: `Permanently deleted library unit: "${existing.name}" (Admin verified)`,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('[ACTIVITY LOG] Non-fatal error:', err.message));

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting library:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete library' });
  }
});

module.exports = router;
