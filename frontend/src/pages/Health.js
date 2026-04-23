import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Save, ChevronLeft, ChevronRight, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';

const DEPT_FULL = { fg: 'Finished Good Material Warehouse', pm: 'Packing Material Warehouse', rm: 'Raw Material Warehouse' };

const Health = () => {
  const { shift, dept } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('userInfo')) || { role: 'supervisor' };
  const isSuperAdmin = user.role === 'superadmin';
  const isHOD = user.role === 'hod';
  const isSupervisor = user.role === 'supervisor';
  const userDept = user?.department?.toUpperCase() || "";
  const isHealthSupervisor = isSupervisor && (userDept.includes('HEALTH') || userDept === 'H');
  const canUpdate = isHealthSupervisor || isSuperAdmin;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const currentMonthName = months[currentMonthIndex];

  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const [allMonthsData, setAllMonthsData] = useState(() => {
    const initialData = {};
    months.forEach(month => {
      initialData[month] = Array.from({ length: 31 }, (_, i) => ({
        date: i + 1, status: null, keypoints: '', attendance: '',
        attendees: null, totalStrength: null
      }));
    });
    return initialData;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
    keypoints: '',
    attendees: '',
    totalStrength: ''
  });

  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    const resetToEmptyMonth = () => {
      setAllMonthsData(prev => ({
        ...prev,
        [currentMonthName]: Array.from({ length: 31 }, (_, i) => ({
          date: i + 1, status: null, keypoints: '', attendance: '',
          attendees: null, totalStrength: null
        }))
      }));
    };

    const fetchMonthData = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/health`, {
          params: { month: currentMonthName, year: 2026, dept: dept || "fg", shift: shift || "1", }
        });
        if (data?.days?.length > 0) {
          setAllMonthsData(prev => ({ ...prev, [currentMonthName]: data.days }));
        } else {
          resetToEmptyMonth();
        }
      } catch (err) {
        resetToEmptyMonth();
      }
    };
    fetchMonthData();
  }, [currentMonthName, shift, dept]);

  // Calculate attendance % from attendees / totalStrength
  const calcAttendance = (attendees, totalStrength) => {
    const a = Number(attendees);
    const t = Number(totalStrength);
    if (!a || !t || t === 0) return null;
    return Math.round((a / t) * 100);
  };

  const handleSave = async () => {
    if (!canUpdate) return;

    const attendancePct = formData.status !== 'holiday'
      ? calcAttendance(formData.attendees, formData.totalStrength)
      : null;

    const payload = {
      month: currentMonthName,
      year: 2026,
      dept: dept || "fg",
      shift: shift || "1",
      date: selectedDay.date,
      status: formData.status,
      keypoints: formData.keypoints,
      attendance: attendancePct != null ? String(attendancePct) : '',
      attendees: formData.attendees !== '' ? Number(formData.attendees) : null,
      totalStrength: formData.totalStrength !== '' ? Number(formData.totalStrength) : null,
    };

    try {
      await axios.post(`${API_BASE_URL}/api/health/update`, payload);
      const updatedMonthArray = allMonthsData[currentMonthName].map(item =>
        item.date === selectedDay.date
          ? {
              ...item,
              status: formData.status,
              keypoints: formData.keypoints,
              attendance: attendancePct != null ? String(attendancePct) : '',
              attendees: payload.attendees,
              totalStrength: payload.totalStrength,
            }
          : item
      );
      setAllMonthsData({ ...allMonthsData, [currentMonthName]: updatedMonthArray });
      setIsModalOpen(false);
      showNotify("Entry Secured & Locked Successfully", "success");
    } catch (err) {
      console.error("Save error details:", err.response?.data || err.message);
      showNotify(err.response?.data?.message || "System Error: Unable to Save", "error");
    }
  };

  const openEntryModal = (day) => {
    if (!canUpdate) {
      showNotify("Access Denied: You are not the Health Supervisor", "error");
      return;
    }
    if (day.status && !isSuperAdmin) {
      showNotify("Security Lock: Only Super Admin can modify entries", "error");
      return;
    }
    setSelectedDay(day);
    setFormData({
      status: day.status || '',
      keypoints: day.keypoints || '',
      attendees: day.attendees != null ? String(day.attendees) : '',
      totalStrength: day.totalStrength != null ? String(day.totalStrength) : '',
    });
    setIsModalOpen(true);
  };

  const isMeeting = formData.status === 'meeting';
  const attendancePctPreview = isMeeting ? calcAttendance(formData.attendees, formData.totalStrength) : null;

  const isFormInvalid = !formData.status ||
    (isMeeting && (!formData.attendees || !formData.totalStrength || !formData.keypoints.trim()));

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900">

      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-8 duration-500">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border-t border-white/10 min-w-[320px] ${
            notification.type === 'error'
            ? 'bg-slate-900/95 border-rose-500/50 text-rose-400'
            : 'bg-slate-900/95 border-emerald-500/50 text-emerald-400'
          }`}>
            <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
              {notification.type === 'error' ? <ShieldAlert size={24}/> : <CheckCircle2 size={24}/>}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">Security System</p>
              <p className="font-bold tracking-tight text-sm text-white">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-[#475569] font-bold text-xs uppercase hover:text-emerald-600 transition-all">
          <ChevronLeft size={20} /> BACK TO DASHBOARD
        </button>
      </div>

      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Health</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2 w-2 rounded-full animate-pulse ${canUpdate ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
            <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]">
              {isSuperAdmin ? "Administrative Master" : isHOD ? "HOD Audit Mode" : isHealthSupervisor ? "Supervisor Entry" : "View Only Mode"}
            </p>
          </div>
        </div>
        <div className="flex items-center bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1.5 transition-all hover:shadow-2xl">
          <button onClick={() => setCurrentMonthIndex(prev => (prev === 0 ? 11 : prev - 1))} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronLeft size={20}/></button>
          <span className="px-10 font-black uppercase tracking-widest text-xs w-44 text-center">{currentMonthName}</span>
          <button onClick={() => setCurrentMonthIndex(prev => (prev === 11 ? 0 : prev + 1))} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight size={20}/></button>
        </div>
      </header>

      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Health — Shift {shift}</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{DEPT_FULL[dept] || dept?.toUpperCase()}</p>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-0.5">Arcolab Continuous Improvement System</p>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
        {allMonthsData[currentMonthName].map((item) => {
          const isLocked = (item.status && !isSuperAdmin) || !canUpdate;
          let colorClass = "bg-white border-slate-100 text-slate-400";
          if (item.status === 'meeting') colorClass = "bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent";
          if (item.status === 'no-meeting') colorClass = "bg-rose-500 text-white shadow-lg shadow-rose-200 border-transparent";
          if (item.status === 'holiday') colorClass = "bg-slate-800 text-white shadow-lg shadow-slate-300 border-transparent";

          const pct = item.status === 'meeting'
            ? calcAttendance(item.attendees, item.totalStrength)
            : null;

          return (
            <div
              key={item.date}
              onClick={() => openEntryModal(item)}
              className={`group relative cursor-pointer rounded-[2rem] h-40 p-5 transition-all duration-300 border-2 hover:scale-[1.03] flex flex-col justify-between ${colorClass} ${isLocked ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-black text-2xl tracking-tighter">{item.date}</span>
                {isLocked ? <Lock size={16} className="opacity-40" /> : <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <div className="overflow-hidden">
                {item.status ? (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase leading-tight truncate tracking-wide">{item.keypoints || item.status}</p>
                    {item.status === 'meeting' && (
                      <div className="space-y-0.5">
                        {item.attendees != null && item.totalStrength != null && (
                          <p className="text-[9px] font-bold opacity-80">{item.attendees}/{item.totalStrength}</p>
                        )}
                        {pct != null && (
                          <p className="text-[10px] font-bold opacity-80 italic">{pct}%</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : <div className="h-1 w-8 bg-slate-100 rounded-full group-hover:w-12 transition-all"></div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.25)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h2 className="font-black uppercase tracking-widest text-xs text-slate-400">Data Transmission</h2>
                <p className="text-2xl font-black text-slate-900">{selectedDay?.date} {currentMonthName}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-6">
              {/* Status selector */}
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                {['meeting', 'no-meeting', 'holiday'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFormData({ ...formData, status: s })}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      formData.status === s
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Meeting fields */}
              {formData.status === 'meeting' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number" min="0" placeholder="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                        value={formData.attendees}
                        onChange={(e) => setFormData({...formData, attendees: e.target.value})}
                      />
                      <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">Attendees</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number" min="0" placeholder="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                        value={formData.totalStrength}
                        onChange={(e) => setFormData({...formData, totalStrength: e.target.value})}
                      />
                      <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">Total Strength</label>
                    </div>
                  </div>

                  {/* Live attendance % preview */}
                  {attendancePctPreview != null && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Attendance</span>
                      <span className="text-2xl font-black text-emerald-700">{attendancePctPreview}%</span>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      placeholder="Input findings..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 h-32 font-bold text-sm outline-none focus:border-slate-900 transition-all resize-none"
                      value={formData.keypoints}
                      onChange={(e) => setFormData({...formData, keypoints: e.target.value})}
                    />
                    <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Observations</label>
                  </div>
                </div>
              )}

              {/* No-meeting fields (just observations) */}
              {formData.status === 'no-meeting' && (
                <div className="animate-in slide-in-from-bottom-4">
                  <div className="relative">
                    <textarea
                      placeholder="Reason for no meeting..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 h-28 font-bold text-sm outline-none focus:border-slate-900 transition-all resize-none"
                      value={formData.keypoints}
                      onChange={(e) => setFormData({...formData, keypoints: e.target.value})}
                    />
                    <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Notes</label>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isFormInvalid}
                className={`w-full font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 ${
                  isFormInvalid
                  ? 'bg-slate-100 text-slate-300'
                  : 'bg-slate-900 text-white shadow-2xl shadow-slate-300 hover:bg-black hover:-translate-y-1'
                }`}
              >
                <Save size={16}/> {isFormInvalid ? "Incomplete Data" : "Secure Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Health;
