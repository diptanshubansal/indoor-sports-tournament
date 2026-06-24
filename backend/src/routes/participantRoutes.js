const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Participant = require('../models/Participant');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { google } = require('googleapis');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { logAudit } = require('../middleware/auditLogger');

// Configure multer memory storage for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// Helper function to generate next Player ID
const generateNextPlayerId = async (tempIdCounter) => {
  const participants = await Participant.find({ participantId: /^P\d+$/ }, 'participantId');
  let maxIdNum = 0;
  for (const p of participants) {
    const match = p.participantId.match(/^P(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) {
        maxIdNum = num;
      }
    }
  }
  const nextNum = maxIdNum + tempIdCounter;
  return `P${String(nextNum).padStart(3, '0')}`;
};

// Helper function to generate random temporary password
const generateTempPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tempPass = '';
  for (let i = 0; i < 8; i++) {
    tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tempPass;
};

// @route   GET /api/participants
// @desc    Get all participants with filters
// @access  Private (All roles)
router.get('/', protect, async (req, res) => {
  try {
    const { search, gender, status } = req.query;
    let query = {};

    if (gender) query.gender = gender;
    if (status) query.status = status;
    if (req.query.game) {
      query.enrolledGames = req.query.game;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { participantId: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const participants = await Participant.find(query).sort({ name: 1 });
    res.json({ success: true, count: participants.length, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/participants
// @desc    Create new participant
// @access  Private (Super Admin, Admin)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, mobileNumber, email, enrolledGames, games } = req.body;

    // Check if mobileNumber already registered
    const existingMobile = await Participant.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ success: false, message: `Mobile number ${mobileNumber} already registered` });
    }

    const playerID = await generateNextPlayerId(1);
    req.body.participantId = playerID;

    // Handle games field from request
    let gamesList = [];
    const inputGames = enrolledGames || games;
    if (inputGames) {
      if (typeof inputGames === 'string') {
        gamesList = inputGames.split(',').map(g => g.trim()).filter(Boolean);
      } else if (Array.isArray(inputGames)) {
        gamesList = inputGames.map(g => String(g).trim()).filter(Boolean);
      }
    }
    req.body.enrolledGames = gamesList;

    const participant = await Participant.create(req.body);

    await logAudit({
      req,
      action: 'create',
      details: `Created participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.status(201).json({ success: true, data: participant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/participants/:id
// @desc    Update participant details
// @access  Private (Super Admin, Admin)
router.put('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    let participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Capture old ID for finding User
    const oldId = participant.participantId;

    // Handle enrolledGames / games field from request
    const { enrolledGames, games } = req.body;
    let gamesList = [];
    const inputGames = enrolledGames !== undefined ? enrolledGames : games;
    if (inputGames) {
      if (typeof inputGames === 'string') {
        gamesList = inputGames.split(',').map(g => g.trim()).filter(Boolean);
      } else if (Array.isArray(inputGames)) {
        gamesList = inputGames.map(g => String(g).trim()).filter(Boolean);
      }
      req.body.enrolledGames = gamesList;
    }

    participant = await Participant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Sync corresponding User if it exists
    const userExists = await User.findOne({ userId: oldId.toLowerCase() });
    if (userExists) {
      const userEmail = participant.email || `${participant.participantId.toLowerCase()}@icai-sports.com`;
      await User.findOneAndUpdate(
        { userId: oldId.toLowerCase() },
        {
          name: participant.name,
          email: userEmail,
          mobileNumber: participant.mobileNumber
        }
      );
    }

    await logAudit({
      req,
      action: 'update',
      details: `Updated participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/participants/:id
// @desc    Delete participant
// @access  Private (Super Admin, Admin)
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Delete corresponding User
    await User.findOneAndDelete({ userId: participant.participantId.toLowerCase() });

    await Participant.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'delete',
      details: `Deleted participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.json({ success: true, message: 'Participant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/participants/import
// @desc    Import participants from Excel sheet
// @access  Private (Super Admin, Admin)
router.post('/import', protect, authorize('super_admin', 'admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes("Participants Master")
      ? "Participants Master"
      : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    let totalRows = rows.length;
    let importedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const invalidRows = [];
    const seenPhonesInSheet = new Set();
    let tempIdCounter = 1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row numbering (1-based + headers)

      // Normalize row keys
      const normalizedRow = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      }

      const name = normalizedRow['name'] ? String(normalizedRow['name']).trim() : null;
      const phoneRaw = normalizedRow['phone'] !== undefined ? normalizedRow['phone'] : normalizedRow['phone number'] || normalizedRow['mobile'] || normalizedRow['mobile number'];
      const phone = phoneRaw !== undefined && phoneRaw !== null ? String(phoneRaw).trim() : null;
      const email = normalizedRow['email'] ? String(normalizedRow['email']).trim() : '';

      // Validation 1: Name and Phone are mandatory
      if (!name || !phone) {
        invalidRows.push({
          row: rowNum,
          name: name || 'N/A',
          phone: phone || 'N/A',
          reason: 'Name and Phone are mandatory'
        });
        invalidCount++;
        continue;
      }

      // Validation 2: Duplicate phone number in current Excel sheet
      if (seenPhonesInSheet.has(phone)) {
        duplicateCount++;
        continue;
      }
      seenPhonesInSheet.add(phone);

      // Collect Yes games
      const gamesList = [];
      const gameColumns = {
        'chess': 'Chess',
        'carrom': 'Carrom',
        'table tennis': 'Table Tennis',
        'tabletennis': 'Table Tennis',
        'ludo': 'Ludo',
        'skipping': 'Skipping',
        'spoon race': 'Spoon Race',
        'spoonrace': 'Spoon Race',
        'bgmi': 'BGMI',
        'tug of war': 'Tug of War',
        'tugofwar': 'Tug of War'
      };

      for (const colKey of Object.keys(gameColumns)) {
        const val = normalizedRow[colKey];
        if (val && String(val).trim().toLowerCase() === 'yes') {
          const gameName = gameColumns[colKey];
          if (!gamesList.includes(gameName)) {
            gamesList.push(gameName);
          }
        }
      }

      // Validation 3: Existing participants in database should be updated
      const existingParticipant = await Participant.findOne({ mobileNumber: phone });
      if (existingParticipant) {
        try {
          existingParticipant.name = name;
          existingParticipant.email = email || '';
          existingParticipant.enrolledGames = gamesList;
          await existingParticipant.save();

          // Sync with User if exists
          const userExists = await User.findOne({ userId: existingParticipant.participantId.toLowerCase() });
          if (userExists) {
            const userEmail = email || `${existingParticipant.participantId.toLowerCase()}@icai-sports.com`;
            await User.findOneAndUpdate(
              { userId: existingParticipant.participantId.toLowerCase() },
              {
                name,
                email: userEmail
              }
            );
          }

          updatedCount++;
        } catch (err) {
          invalidRows.push({
            row: rowNum,
            name,
            phone,
            reason: err.message
          });
          invalidCount++;
        }
        continue;
      }

      try {
        const playerID = await generateNextPlayerId(tempIdCounter);
        tempIdCounter++;

        // Create Participant record
        await Participant.create({
          participantId: playerID,
          name,
          mobileNumber: phone,
          email: email || '',
          enrolledGames: gamesList,
          gender: 'Not Specified',
          collegeOrInstitute: 'Not Specified'
        });

        importedCount++;
      } catch (err) {
        invalidRows.push({
          row: rowNum,
          name: name,
          phone: phone,
          reason: err.message
        });
        invalidCount++;
      }
    }

    await logAudit({
      req,
      action: 'create',
      details: `Imported participants from Excel. Total: ${totalRows}, Imported: ${importedCount}, Updated: ${updatedCount}, Duplicates: ${duplicateCount}, Invalid: ${invalidCount}`,
    });

    res.json({
      success: true,
      summary: {
        totalRows,
        importedCount,
        updatedCount,
        duplicateCount,
        invalidCount
      },
      errors: invalidRows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Failed to process Excel file: ${error.message}` });
  }
});

// @route   GET /api/participants/export-3sheets
// @desc    Export participants master, credentials, and visitor credentials to Excel (3 sheets)
// @access  Private (Super Admin, Admin)
router.get('/export-3sheets', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const participants = await Participant.find({}).sort({ participantId: 1 });
    const committeeUsers = await User.find({ role: { $in: ['super_admin', 'admin', 'viewer'] } }).sort({ userId: 1 });

    // Sheet 1: Participants Master
    const gamesList = ['Chess', 'Carrom', 'Table Tennis', 'Ludo', 'Skipping', 'Spoon Race', 'BGMI', 'Tug of War'];
    const sheet1Data = participants.map(p => {
      const row = {
        'Player ID': p.participantId,
        'Name': p.name,
        'Phone': p.mobileNumber,
        'Email': p.email || '',
      };
      gamesList.forEach(game => {
        row[game] = p.enrolledGames && p.enrolledGames.includes(game) ? 'Yes' : 'No';
      });
      return row;
    });
    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);

    // Sheet 2: Participant Credentials
    const sheet2Data = participants.map(p => ({
      'Player ID': p.participantId,
      'Name': p.name,
      'Username': 'Pending',
      'Temporary Password': 'Pending',
      'Phone': p.mobileNumber,
      'Email': p.email || '',
    }));
    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);

    // Sheet 3: Committee Credentials
    const sheet3Data = committeeUsers.map(u => ({
      'Committee ID': u.userId,
      'Name': u.name,
      'Role': u.role,
      'Username': u.userId,
      'Password': '[SECURE]',
    }));
    const ws3 = xlsx.utils.json_to_sheet(sheet3Data);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws1, 'Participants Master');
    xlsx.utils.book_append_sheet(wb, ws2, 'Participant Credentials');
    xlsx.utils.book_append_sheet(wb, ws3, 'Committee Credentials');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    await logAudit({
      req,
      action: 'export',
      details: `Exported 3-sheet Excel report containing ${participants.length} participants and ${committeeUsers.length} committee members`,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=participants_and_visitors.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/participants/:id/reset-password
// @desc    Admin reset participant password to a new temporary password
// @access  Private (Super Admin, Admin)
router.post('/:id/reset-password', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    const tempPassword = generateTempPassword();
    participant.temporaryPassword = tempPassword;
    await participant.save();

    // Reset password on corresponding User account and set isTempPassword to true
    await User.findOneAndUpdate(
      { userId: participant.participantId.toLowerCase() },
      {
        password: tempPassword,
        isTempPassword: true
      }
    );

    await logAudit({
      req,
      action: 'update',
      details: `Admin reset password for participant '${participant.name}' (ID: ${participant.participantId})`,
    });

    res.json({
      success: true,
      message: `Password reset successfully. New temporary password: ${tempPassword}`,
      data: {
        temporaryPassword: tempPassword
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/participants/my-dashboard
// @desc    Get current participant's dashboard details
// @access  Private (Participant)
router.get('/my-dashboard', protect, authorize('participant'), async (req, res) => {
  try {
    const playerID = req.user.userId.toUpperCase();
    const participant = await Participant.findOne({ participantId: playerID });

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant record not found' });
    }

    res.json({
      success: true,
      data: {
        participantId: participant.participantId,
        name: participant.name,
        phone: participant.mobileNumber,
        email: participant.email,
        games: participant.enrolledGames || [],
        enrolledGames: participant.enrolledGames || [],
        tournamentDetails: 'Indoor Sports Tournament',
        fixturesPlaceholder: 'My Fixtures: Not Scheduled Yet',
        resultsPlaceholder: 'My Results: Pending'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/participants/sync-status
// @desc    Get Google Sheet sync status
// @access  Private (Super Admin, Admin)
router.get('/sync-status', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const syncSetting = await Settings.findOne({ key: 'google_sheet_sync_info' });
    if (!syncSetting) {
      return res.json({
        success: true,
        data: {
          sheetIdOrUrl: '',
          sheetName: 'Participants Master',
          lastSyncTime: null,
          status: 'idle',
          summary: {
            totalRows: 0,
            importedCount: 0,
            updatedCount: 0,
            duplicateCount: 0,
            invalidCount: 0
          },
          errors: []
        }
      });
    }
    res.json({ success: true, data: syncSetting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/participants/sync-google-sheet
// @desc    Sync participants from Google Sheet
// @access  Private (Super Admin, Admin)
router.post('/sync-google-sheet', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { sheetIdOrUrl, sheetName } = req.body;
    
    // Fall back to env variable GOOGLE_SHEET_ID if not passed in body
    let targetInput = sheetIdOrUrl || process.env.GOOGLE_SHEET_ID;
    let targetSheetName = sheetName || 'Participants Master';

    if (!targetInput) {
      return res.status(400).json({ success: false, message: 'Google Sheet URL or Sheet ID is required' });
    }

    // Extract spreadsheet ID if a URL is provided
    let spreadsheetId = targetInput.trim();
    const urlMatch = targetInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      spreadsheetId = urlMatch[1];
    }

    // Verify service account config
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKeyRaw) {
      return res.status(500).json({
        success: false,
        message: 'Google Sheets API credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) are not configured in backend environment variables.'
      });
    }

    // Parse the private key
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1');

    // Update settings status to "syncing"
    let currentSyncSetting = await Settings.findOne({ key: 'google_sheet_sync_info' });
    const currentVal = currentSyncSetting ? currentSyncSetting.value : {};
    await Settings.findOneAndUpdate(
      { key: 'google_sheet_sync_info' },
      {
        key: 'google_sheet_sync_info',
        value: {
          ...currentVal,
          sheetIdOrUrl: targetInput,
          sheetName: targetSheetName,
          status: 'syncing',
        },
        updatedBy: req.user._id
      },
      { upsert: true }
    );

    // Initialize Google API Client
    const auth = new google.auth.JWT(
      serviceAccountEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch values from Google Sheet
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${targetSheetName}!A:Z`,
      });
    } catch (err) {
      // Update status to "failed" on read error
      const failedVal = {
        sheetIdOrUrl: targetInput,
        sheetName: targetSheetName,
        lastSyncTime: new Date(),
        status: 'failed',
        summary: {
          totalRows: 0,
          importedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          invalidCount: 0
        },
        errors: [{ row: 0, name: 'N/A', phone: 'N/A', reason: `Google Sheet fetch error: ${err.message}` }]
      };
      await Settings.findOneAndUpdate(
        { key: 'google_sheet_sync_info' },
        { value: failedVal, updatedBy: req.user._id }
      );
      return res.status(400).json({ success: false, message: `Failed to fetch Google Sheet: ${err.message}`, data: failedVal });
    }

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      const emptyVal = {
        sheetIdOrUrl: targetInput,
        sheetName: targetSheetName,
        lastSyncTime: new Date(),
        status: 'failed',
        summary: {
          totalRows: 0,
          importedCount: 0,
          updatedCount: 0,
          duplicateCount: 0,
          invalidCount: 0
        },
        errors: [{ row: 0, name: 'N/A', phone: 'N/A', reason: 'Google Sheet is empty' }]
      };
      await Settings.findOneAndUpdate(
        { key: 'google_sheet_sync_info' },
        { value: emptyVal, updatedBy: req.user._id }
      );
      return res.status(400).json({ success: false, message: 'Google Sheet is empty', data: emptyVal });
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    let totalRows = rows.length - 1; // Exclude header row
    let importedCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const invalidRows = [];
    const seenPhonesInSheet = new Set();
    let tempIdCounter = 1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // 1-based index (header is row 1)

      // Map row array to object using headers
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] !== undefined ? row[index] : undefined;
      });

      const name = rowData['name'] ? String(rowData['name']).trim() : null;
      const phoneRaw = rowData['phone'] !== undefined ? rowData['phone'] : rowData['phone number'] || rowData['mobile'] || rowData['mobile number'];
      const phone = phoneRaw !== undefined && phoneRaw !== null ? String(phoneRaw).trim() : null;
      const email = rowData['email'] ? String(rowData['email']).trim() : '';

      // Validation 1: Name and Phone are mandatory
      if (!name || !phone) {
        invalidRows.push({
          row: rowNum,
          name: name || 'N/A',
          phone: phone || 'N/A',
          reason: 'Name and Phone are mandatory'
        });
        invalidCount++;
        continue;
      }

      // Validation 2: Duplicate phone number in Google Sheet
      if (seenPhonesInSheet.has(phone)) {
        duplicateCount++;
        continue;
      }
      seenPhonesInSheet.add(phone);

      // Collect game registrations
      const gamesList = [];
      const gameColumns = {
        'chess': 'Chess',
        'carrom': 'Carrom',
        'table tennis': 'Table Tennis',
        'tabletennis': 'Table Tennis',
        'ludo': 'Ludo',
        'skipping': 'Skipping',
        'spoon race': 'Spoon Race',
        'spoonrace': 'Spoon Race',
        'bgmi': 'BGMI',
        'tug of war': 'Tug of War',
        'tugofwar': 'Tug of War'
      };

      for (const colKey of Object.keys(gameColumns)) {
        const val = rowData[colKey];
        if (val && String(val).trim().toLowerCase() === 'yes') {
          const gameName = gameColumns[colKey];
          if (!gamesList.includes(gameName)) {
            gamesList.push(gameName);
          }
        }
      }

      // Check if existing participant in database should be updated
      const existingParticipant = await Participant.findOne({ mobileNumber: phone });
      if (existingParticipant) {
        try {
          existingParticipant.name = name;
          existingParticipant.email = email || '';
          existingParticipant.enrolledGames = gamesList;
          await existingParticipant.save();

          // Sync with User if exists
          const userExists = await User.findOne({ userId: existingParticipant.participantId.toLowerCase() });
          if (userExists) {
            const userEmail = email || `${existingParticipant.participantId.toLowerCase()}@icai-sports.com`;
            await User.findOneAndUpdate(
              { userId: existingParticipant.participantId.toLowerCase() },
              {
                name,
                email: userEmail
              }
            );
          }
          updatedCount++;
        } catch (err) {
          invalidRows.push({
            row: rowNum,
            name,
            phone,
            reason: err.message
          });
          invalidCount++;
        }
        continue;
      }

      // Create new participant
      try {
        const playerID = await generateNextPlayerId(tempIdCounter);
        tempIdCounter++;

        await Participant.create({
          participantId: playerID,
          name,
          mobileNumber: phone,
          email: email || '',
          enrolledGames: gamesList,
          gender: 'Not Specified',
          collegeOrInstitute: 'Not Specified'
        });
        importedCount++;
      } catch (err) {
        invalidRows.push({
          row: rowNum,
          name: name,
          phone: phone,
          reason: err.message
        });
        invalidCount++;
      }
    }

    const successVal = {
      sheetIdOrUrl: targetInput,
      sheetName: targetSheetName,
      lastSyncTime: new Date(),
      status: 'success',
      summary: {
        totalRows,
        importedCount,
        updatedCount,
        duplicateCount,
        invalidCount
      },
      errors: invalidRows
    };

    await Settings.findOneAndUpdate(
      { key: 'google_sheet_sync_info' },
      { value: successVal, updatedBy: req.user._id }
    );

    await logAudit({
      req,
      action: 'update',
      details: `Google Sheet Sync complete. Total: ${totalRows}, Imported: ${importedCount}, Updated: ${updatedCount}, Duplicates: ${duplicateCount}, Invalid: ${invalidCount}`,
    });

    res.json({ success: true, data: successVal });
  } catch (error) {
    // Handle unhandled errors
    const errorVal = {
      sheetIdOrUrl: req.body.sheetIdOrUrl || '',
      sheetName: req.body.sheetName || 'Participants Master',
      lastSyncTime: new Date(),
      status: 'failed',
      summary: {
        totalRows: 0,
        importedCount: 0,
        updatedCount: 0,
        duplicateCount: 0,
        invalidCount: 0
      },
      errors: [{ row: 0, name: 'N/A', phone: 'N/A', reason: error.message }]
    };
    await Settings.findOneAndUpdate(
      { key: 'google_sheet_sync_info' },
      { value: errorVal, updatedBy: req.user?._id }
    );
    res.status(500).json({ success: false, message: error.message, data: errorVal });
  }
});

module.exports = router;
