import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lightbulb, Send, CheckCircle, Loader2, AlertCircle, Download } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const BENEFIT_OPTIONS = ['Safety', 'Quality', 'Cost', 'Delivery', 'Morale'];

const Idea = ({ shift }) => {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('userInfo') || 'null');

  const [config, setConfig]           = useState(null);
  const [configError, setConfigError] = useState(false);

  const [form, setForm] = useState({
    empId:      user?.employeeId || '',
    problem:    '',
    solution:   '',
    benefits:   [],
    department: user?.department || '',
  });

  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ideation/config`)
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfigError(true));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.empId.trim())         e.empId      = 'Employee ID is required';
    if (!form.problem.trim())       e.problem    = 'Problem statement is required';
    if (!form.solution.trim())      e.solution   = 'Proposed solution is required';
    if (form.benefits.length === 0) e.benefits   = 'Select at least one benefit';
    if (!form.department.trim())    e.department = 'Area / Department is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearErr = (key) => setErrors(prev => ({ ...prev, [key]: null }));

  const toggleBenefit = (b) => {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.includes(b)
        ? prev.benefits.filter(x => x !== b)
        : [...prev.benefits, b],
    }));
    clearErr('benefits');
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus('submitting');
    try {
      console.log('Submitting form data:', {
        empId: form.empId.trim(),
        problem: form.problem.trim(),
        solution: form.solution.trim(),
        benefits: form.benefits,
        department: form.department.trim(),
      });

      const res = await fetch(`${API_BASE_URL}/api/ideation/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId: form.empId.trim(),
          problem: form.problem.trim(),
          solution: form.solution.trim(),
          benefits: form.benefits,
          department: form.department.trim(),
        }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      const data = await res.json();
      console.log('Response data:', data);

      if (data.success) {
        setStatus('success');
      } else {
        console.error('Submission failed:', data.message);
        setStatus('error');
      }
    } catch (err) {
      console.error('Network error:', err);
      console.error('Error details:', err.message, err.stack);
      setStatus('error');
    }
  };

  const handleReset = () => {
    setForm({ empId: user?.employeeId || '', problem: '', solution: '', benefits: [], department: user?.department || '' });
    setErrors({});
    setStatus('idle');
  };

  // ── Success ─────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Idea Submitted!</h2>
          <p className="text-slate-400 text-sm font-medium mb-2">
            Your idea has been recorded. Our HOD team will review it shortly.
          </p>
          <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-8">
            Ref: {form.empId} · {new Date().toLocaleDateString('en-GB')}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={handleReset} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95">
              Submit Another Idea
            </button>
            <a
              href="http://localhost:5000/api/ideation/download"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              View Ideas Sheet
            </a>
            <button onClick={() => navigate('/')} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase tracking-widest transition-all">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans">
      <nav className="flex justify-between items-center px-6 py-4">
        <button onClick={() => navigate(shift ? `/shift${shift}` : '/')} className="flex items-center gap-1 text-slate-500 font-bold text-xs uppercase hover:text-emerald-600 transition-colors">
          <ChevronLeft size={20} /> Back
        </button>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ideation</span>
      </nav>

      {/* Shift Header */}
      {shift && (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Ideation — Shift {shift}
            </h1>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">
              Arcolab Continuous Improvement System
            </p>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 pb-16">
        <div className="flex items-center gap-4 mb-8 mt-2">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Lightbulb size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">Share Your Idea</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Arcolab Continuous Improvement</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="text-sm text-slate-500">
            View the current ideation spreadsheet from your Google Sheet.
          </div>
          <a
            href="http://localhost:5000/api/ideation/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
          >
            <Download size={16} />
            <span className="ml-2">View Ideas Sheet</span>
          </a>
        </div>

        {configError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-xs font-bold">Could not load form configuration. Please contact your administrator.</p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">

          <Field label="Employee ID" required error={errors.empId}>
            <input type="text" value={form.empId} placeholder="e.g. ARC-0042"
              onChange={e => { setForm(p => ({ ...p, empId: e.target.value })); clearErr('empId'); }}
              className={inputCls(errors.empId)} />
          </Field>

          <Field label="Problem Statement" required error={errors.problem}
            hint="Describe the issue or inefficiency you've observed.">
            <textarea rows={3} value={form.problem} placeholder="What problem have you identified?"
              onChange={e => { setForm(p => ({ ...p, problem: e.target.value })); clearErr('problem'); }}
              className={inputCls(errors.problem) + ' resize-none'} />
          </Field>

          <Field label="Proposed Solution" required error={errors.solution}
            hint="How do you suggest we fix or improve it?">
            <textarea rows={3} value={form.solution} placeholder="Describe your proposed solution..."
              onChange={e => { setForm(p => ({ ...p, solution: e.target.value })); clearErr('solution'); }}
              className={inputCls(errors.solution) + ' resize-none'} />
          </Field>

          <Field label="Expected Benefit" required error={errors.benefits} hint="Select all that apply.">
            <div className="flex flex-wrap gap-2 mt-1">
              {BENEFIT_OPTIONS.map(b => {
                const active = form.benefits.includes(b);
                return (
                  <button key={b} type="button" onClick={() => toggleBenefit(b)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95
                      ${active
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                    {b}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Area / Department" required error={errors.department}
            hint="Which area or department does this idea relate to?">
            <input type="text" value={form.department} placeholder="e.g. Production, Packaging, QA Lab..."
              onChange={e => { setForm(p => ({ ...p, department: e.target.value })); clearErr('department'); }}
              className={inputCls(errors.department)} />
          </Field>

          <button onClick={handleSubmit} disabled={status === 'submitting' || configError || !config}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 mt-2">
            {status === 'submitting'
              ? <><Loader2 size={18} className="animate-spin" /> Submitting...</>
              : <><Send size={18} /> Submit Idea</>
            }
          </button>

          {status === 'error' && (
            <p className="text-center text-red-500 text-xs font-bold uppercase tracking-widest">
              Submission failed. Check your connection and try again.
            </p>
          )}
        </div>

        <p className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-6">
          All submissions are timestamped and logged automatically
        </p>
      </main>
    </div>
  );
};

const inputCls = (err) =>
  `w-full bg-slate-50 border-2 rounded-xl p-3.5 text-sm font-medium outline-none transition-all
   focus:bg-white focus:border-emerald-400 ${err ? 'border-red-300 bg-red-50' : 'border-slate-100'}`;

const Field = ({ label, required, error, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {hint && <p className="text-[10px] text-slate-400 font-medium -mt-0.5">{hint}</p>}
    {children}
    {error && (
      <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
        <AlertCircle size={10} /> {error}
      </p>
    )}
  </div>
);

export default Idea;