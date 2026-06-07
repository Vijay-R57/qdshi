const cron     = require('node-cron');
const TimeLock = require('../models/TimeLock');
const AuditLog = require('../models/AuditLog');
const AlertLog = require('../models/AlertLog');
const User     = require('../models/User');
const { sendShiftMissedAlert, verifyTransporter } = require('../utils/emailService');
const { nowIST, formatISTTime, formatISTDate } = require('../utils/saveHelpers');

const MODULES = ['Q', 'D', 'S', 'H'];

/**
 * Checks all active time locks. If the lock's end time was within the last
 * 10 minutes (IST) and no audit log entry exists for that dept/shift today,
 * sends a single email to the HOD listing all missed modules.
 */
const checkAndSendAlerts = async () => {
  try {
    const ist         = nowIST();
    const currentTime = formatISTTime(ist);
    const today       = formatISTDate(ist);

    const [curH, curM] = currentTime.split(':').map(Number);
    const curMins      = curH * 60 + curM;

    const locks = await TimeLock.find({ enabled: true });

    for (const lock of locks) {
      const [endH, endM] = lock.endTime.split(':').map(Number);
      const endMins      = endH * 60 + endM;

      // Only trigger within 10 minutes after end time
      if (curMins < endMins || curMins > endMins + 10) continue;

      const { dept, shift } = lock;

      // Skip if we already sent an alert for this dept/shift/day
      const alreadySent = await AlertLog.findOne({ dept, shift, date: today });
      if (alreadySent) continue;

      // Check which modules were NOT updated today for this dept/shift
      const missedModules = [];
      for (const module of MODULES) {
        const updated = await AuditLog.findOne({ dept, shift, module, date: today });
        if (!updated) missedModules.push(module);
      }

      // Mark this dept/shift/day as checked (prevents duplicate runs)
      await AlertLog.create({ dept, shift, date: today }).catch(() => {});

      if (missedModules.length === 0) continue; // all modules were updated

      // Find HOD for this department
      const deptRegex = new RegExp(`(^|,)\\s*${dept}\\s*(,|$)`, 'i');
      const hod = await User.findOne({ role: 'hod', department: { $regex: deptRegex } });

      const superAdmins = await User.find({ role: 'superadmin' });
      const superAdminEmails = superAdmins.map(sa => sa.gmail).filter(Boolean);

      // Find Supervisor for this department and shift
      const shiftRegex = new RegExp(`(^|,)\\s*${shift}\\s*(,|$)`, 'i');
      const supervisor = await User.findOne({
        role: 'supervisor',
        department: { $regex: deptRegex },
        shift: { $regex: shiftRegex }
      });

      const supervisorEmail = supervisor?.gmail;
      const hodEmail = hod?.gmail;

      let toEmails = [];
      if (supervisorEmail) toEmails.push(supervisorEmail);
      if (hodEmail) toEmails.push(hodEmail);
      const ccEmails = superAdminEmails && superAdminEmails.length > 0 ? superAdminEmails : [];

      if (toEmails.length === 0) {
        console.log(`⚠️  No email found for Supervisor or HOD for dept ${dept} — skipping alert`);
        continue;
      }

      // Remove duplicates just in case
      toEmails = [...new Set(toEmails)];

      // Use a generic greeting when multiple recipients get the same email
      const recipientName =
        toEmails.length === 1
          ? (supervisorEmail ? supervisor?.name : hod?.name)
          : 'Supervisor / HOD Team';

      try {
        await sendShiftMissedAlert({
          toEmails,
          ccEmails,
          recipientName:  recipientName,
          supervisorName: supervisor?.name,
          supervisorId:   supervisor?.employeeId,
          supervisorEmail: supervisor?.gmail,
          dept,
          shift,
          missedModules,
          date:          today,
          startTime:     lock.startTime,
          endTime:       lock.endTime,
        });
        console.log(`📧 Shift alert sent → TO: ${toEmails.join(', ')} | CC: ${ccEmails.join(', ')} | Dept: ${dept} | Shift: ${shift} | Missed: ${missedModules.join(',')}`);
      } catch (emailErr) {
        console.error(`❌ Email failed for ${dept} Shift ${shift}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('Shift alert job error:', err.message);
  }
};

const startShiftAlertJob = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️  SMTP credentials not set — shift alert emails disabled. Add SMTP_USER and SMTP_PASS to .env to enable.');
    return;
  }

  // Verify SMTP connection at startup so misconfig is caught early
  verifyTransporter();

  // Runs every 5 minutes
  cron.schedule('*/5 * * * *', checkAndSendAlerts);
  console.log('✅ Shift alert job started (every 5 min, IST-aware)');
};

module.exports = { startShiftAlertJob };
