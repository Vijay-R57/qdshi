require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dns      = require('dns');

// Set DNS to avoid lookup issues in certain environments
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const metricRoutes   = require('./routes/metricRoutes');
const userRoutes     = require('./routes/userRoutes');
const healthRoutes   = require('./routes/healthRoutes');
const ideationRoutes = require('./routes/IdeationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/metrics',  metricRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/health',   healthRoutes);
app.use('/api/ideation', ideationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

// Helper for Migration Labels
const getLabel = (letter, dept) => {
  const deptMap = { fg: 'Finished Good', pm: 'Packing Material', rm: 'Raw Material' };
  const dName = deptMap[dept] || 'General';
  const typeMap = { Q: 'Quality', D: 'Dispatch', S: 'Safety', H: 'Health' };
  return `${dName} ${typeMap[letter] || 'Metric'}`;
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    const Metric = require('./models/Metrics');
    const Health = require('./models/Health');

    // ── Migration 1: Drop old index ──────────────────────────────────────────
    try {
      await Metric.collection.dropIndex('letter_1');
      console.log('✅ [Metric] Dropped legacy letter_1 index');
    } catch (_) { /* Index already gone */ }

    // ── Migration 2: Backfill dept='fg' on legacy Metric docs ────────────────
    try {
      const r = await Metric.collection.updateMany(
        { $or: [{ dept: { $exists: false } }, { dept: null }, { dept: '' }] },
        { $set: { dept: 'fg' } }
      );
      if (r.modifiedCount > 0)
        console.log(`✅ [Metric] Backfilled dept='fg' on ${r.modifiedCount} docs`);
    } catch (e) { console.error('⚠️ Metric dept backfill error:', e.message); }

    // ── Migration 3: Pre-initialise (Letter × Dept) Stubs with Labels ────────
    const LETTERS = ['Q', 'D', 'S', 'H'];
    const DEPTS   = ['fg', 'pm', 'rm'];
    let created = 0;

    for (const letter of LETTERS) {
      for (const dept of DEPTS) {
        try {
          const result = await Metric.collection.updateOne(
            { letter, dept },
            { 
              $setOnInsert: { 
                letter, 
                dept, 
                label: getLabel(letter, dept),
                shifts: { '1': {}, '2': {}, '3': {} } // Pre-structure shifts
              } 
            },
            { upsert: true }
          );
          if (result.upsertedCount > 0) created++;
        } catch (_) { /* Ignore compound-key conflicts */ }
      }
    }
    if (created > 0) console.log(`✅ [Metric] Initialised ${created} new dept stubs`);

    // ── Migration 4: Backfill Health dept ────────────────────────────────────
    try {
      const h = await Health.collection.updateMany(
        { $or: [{ dept: 'COMMON' }, { dept: { $exists: false } }, { dept: null }, { dept: '' }] },
        { $set: { dept: 'fg' } }
      );
      if (h.modifiedCount > 0)
        console.log(`✅ [Health] Backfilled dept='fg' on ${h.modifiedCount} docs`);
    } catch (e) { console.error('⚠️ Health dept backfill error:', e.message); }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Graceful Shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed via app termination');
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;