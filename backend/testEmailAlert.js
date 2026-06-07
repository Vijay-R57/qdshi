require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');

const DEPT_FULL = {
  fgmw:  'Finished Goods Warehouse',
  pmw:   'Packing Material Warehouse',
  rmw:   'Raw Material Warehouse',
  ppp:   'Primary Packing Production',
  pop:   'Post Production',
  qcmad: 'QC & Microbiology Lab',
  pro:   'Production',
  spp:   'Secondary Packing Production',
  fac:   'Facilities',
};

const MODULE_NAMES = { Q: 'Quality', D: 'Delivery', S: 'Safety', H: 'Health' };

const runTest = async () => {
  try {
    // Check if real SMTP is provided in .env
    let transporter;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('Using real SMTP credentials from .env');
      transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false }, // bypass corporate proxy SSL interception
      });
    } else {
      console.log('No SMTP credentials in .env, using Ethereal Email for testing...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        tls: { rejectUnauthorized: false },
      });
    }

    // Connect to DB to get superadmins and supervisor
    let superAdminEmails = [];
    let supervisorName = 'Test Supervisor';
    let supervisorId = 'SUP001';
    let supervisorEmail = 'supervisor.ppp@example.com';
    
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to database successfully.');
      
      const superAdmins = await User.find({ role: 'superadmin' });
      superAdminEmails = superAdmins.map(sa => sa.gmail).filter(Boolean);
      
      const supervisor = await User.findOne({ role: 'supervisor', department: /ppp/i });
      if (supervisor) {
        supervisorName = supervisor.name;
        supervisorId = supervisor.employeeId;
        supervisorEmail = supervisor.gmail;
      }
      await mongoose.disconnect();
    } catch (dbErr) {
      console.log('⚠️ Could not connect to MongoDB (Network/DNS issue). Using mock data for testing layout...');
    }

    // Mock Data for PPP
    const hodEmail = 'hod.ppp@example.com';
    
    let toEmails = [];
    if (supervisorEmail) toEmails.push(supervisorEmail);
    if (hodEmail) toEmails.push(hodEmail);
    toEmails = [...new Set(toEmails)];

    // Superadmins go to CC, not TO
    const ccEmails = superAdminEmails.length > 0 ? superAdminEmails : [];

    // Use a generic greeting when multiple recipients get the same email
    const recipientName =
      toEmails.length === 1
        ? (supervisorEmail ? supervisorName : 'HOD User')
        : 'Supervisor / HOD Team';
    
    const dept = 'ppp';
    const shift = '1';
    const missedModules = ['Q', 'S'];
    const date = new Date().toISOString().split('T')[0];
    const startTime = '06:00';
    const endTime = '14:00';

    const deptName    = DEPT_FULL[dept] || dept.toUpperCase();
    const moduleList  = missedModules.map(m => `${m} — ${MODULE_NAMES[m] || m}`).join(', ');
    const subject     = `[Arcolab] Missed Shift Update — ${deptName} | Shift ${shift} | ${date}`;

    const moduleRows = missedModules
      .map(m => `<tr><td style="padding:4px 0;color:#64748b;width:130px;">Module:</td><td style="color:#dc2626;font-weight:bold;">${m} — ${MODULE_NAMES[m] || m}</td></tr>`)
      .join('');

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#059669;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <img src="cid:arcolablogo" alt="Arcolab Logo" style="max-height: 50px; margin-bottom: 12px; background: white; padding: 4px; border-radius: 4px;" />
        <h1 style="color:white;margin:0;font-size:20px;">Arcolab Quality Management</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px;">Automated Shift Alert</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#334155;font-size:14px;">Dear <strong>${recipientName}</strong>,</p>
        <p style="color:#334155;font-size:14px;">
          This is an automated notification informing you that the supervisor responsible for
          <strong>${deptName}</strong> has <strong style="color:#dc2626;">failed to submit
          the required shift update(s) on time</strong> for Shift ${shift} on ${date}.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
          <h3 style="color:#dc2626;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Missed Update Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:4px 0;color:#64748b;width:130px;">Department:</td><td style="color:#1e293b;font-weight:bold;">${deptName}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;width:130px;">Supervisor:</td><td style="color:#1e293b;font-weight:bold;">${supervisorName || 'Not Assigned'} ${supervisorId ? `(${supervisorId})` : ''}</td></tr>
            ${supervisorEmail ? `<tr><td style="padding:4px 0;color:#64748b;width:130px;">Sup. Email:</td><td style="color:#1e293b;font-weight:bold;">${supervisorEmail}</td></tr>` : ''}
            ${moduleRows}
            <tr><td style="padding:4px 0;color:#64748b;">Shift:</td><td style="color:#1e293b;font-weight:bold;">Shift ${shift}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Date:</td><td style="color:#1e293b;font-weight:bold;">${date}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Shift Window:</td><td style="color:#1e293b;font-weight:bold;">${startTime} – ${endTime} IST</td></tr>
          </table>
        </div>
        <p style="color:#334155;font-size:14px;">
          The following module updates were expected by <strong>${endTime} IST</strong>
          but no records were submitted: <strong>${moduleList}</strong>.
        </p>
        <p style="color:#334155;font-size:14px;">Please follow up with the responsible supervisor immediately. <em>(A copy of this alert has been sent to the Superadmin team for visibility.)</em></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
        <p style="color:#94a3b8;font-size:11px;margin:0;">
          This is an automated message from the Arcolab Quality Management System. Do not reply to this email.
        </p>
      </div>
    </div>`;

    console.log(`Sending test email...\nTO:  ${toEmails.join(', ')}\nCC:  ${ccEmails.join(', ') || '(none)'}`);

    const mailOptions = {
      from: process.env.SMTP_FROM || `"Arcolab QMS" <${process.env.SMTP_USER || 'test@arcolab.com'}>`,
      to:   toEmails.join(', '),
      subject,
      html,
      attachments: [
        {
          filename: 'arcolabLogo.jpg',
          path: path.join(__dirname, '../frontend/src/assest/arcolabLogo.jpg'),
          cid: 'arcolablogo'
        }
      ],
      ...(ccEmails.length > 0 ? { cc: ccEmails.join(', ') } : {})
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully!');
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('Error:', err);
  }
};

runTest();
