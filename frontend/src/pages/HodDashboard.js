import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  UserPlus,
  X,
  Save,
  Key,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Mail,
  Calendar,
  Hash,
  User
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';

const HodDashboard = () => {
  const user = JSON.parse(localStorage.getItem('userInfo'));
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

   const [editData, setEditData] = useState({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const deptOptions = ["QUALITY (Q)", "DELIVERY (D)", "SAFETY (S)", "HEALTH (H)", "IDEA (I)"];
  const [newSv, setNewSv] = useState({
    name: '',
    dob: '',
    employeeId: '',
    gmail: '',
    password: '',
    department: 'QUALITY (Q)', // Changed to Uppercase
    shift: '1',
    role: 'supervisor'
  });

  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const fetchAllSupervisors = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/users/supervisors/ALL`);
      setSupervisors(data);
    } catch (err) {
      showNotify("Connection Error", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllSupervisors(); }, [fetchAllSupervisors]);

   const handleLocalChange = (id, field, value) => {
    setEditData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

   // HodDashboard.js
const handleRowUpdate = async (svId, svName) => {
  const rawUpdates = editData[svId];

  if (!rawUpdates) {
    showNotify("No changes to update", "error");
    return;
  }

   const updates = Object.fromEntries(
    Object.entries(rawUpdates).filter(([_, value]) => value !== "")
  );

  try {
    const response = await axios.put(`${API_BASE_URL}/api/users/update/${svId}`, updates);
    if (response.data.success) {
      showNotify(`${svName} updated!`, "success");
      setEditData(prev => {
        const newState = { ...prev };
        delete newState[svId];
        return newState;
      });
      fetchAllSupervisors();
    }
  } catch (err) {
    showNotify(err.response?.data?.message || "Update failed", "error");
  }
};

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/users/register`, newSv);
      showNotify("Supervisor Registered Successfully", "success");
      setIsAddModalOpen(false);
      setNewSv({ name: '', dob: '', employeeId: '', gmail: '', password: '', department: 'Quality (Q)', shift: '1', role: 'supervisor' });
      fetchAllSupervisors();
    } catch (err) {
      showNotify(err.response?.data?.message || "Registration Failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FDFB] p-4 md:p-10 font-sans">

      {notification.show && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white animate-bounce ${notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-900'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <header className="mb-10">
        <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-tighter">Global QDSHI Monitor</h1>
        <p className="text-emerald-600 font-bold text-xs uppercase opacity-70 tracking-[0.2em]">HOD Console: {user?.name}</p>
      </header>

      <div className="mb-12">
        <div className="bg-white border border-emerald-100 rounded-[2rem] p-8 w-full max-w-sm shadow-sm hover:shadow-xl transition-all group cursor-pointer" onClick={() => setIsAddModalOpen(true)}>
          <div className="bg-emerald-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform">
            <UserPlus size={28} />
          </div>
          <h2 className="text-2xl font-black text-emerald-950 uppercase mb-1">Add Supervisor</h2>
          <p className="text-emerald-400 font-bold text-[10px] mb-8 uppercase tracking-widest">Register new staff members</p>
          <button className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
            Launch Form <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden">
        <div className="bg-emerald-900 p-6 text-white flex justify-between items-center">
          <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2"><Briefcase size={16} /> Active Supervisory Staff</h3>
          <span className="bg-emerald-800 px-4 py-1 rounded-full text-[10px] font-bold">COUNT: {supervisors.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-emerald-50/50 text-emerald-900 text-[10px] font-black uppercase tracking-widest border-b border-emerald-100">
                <th className="px-8 py-5">Profile</th>
                <th className="px-8 py-5">Department</th>
                <th className="px-8 py-5">Shift</th>
                <th className="px-8 py-5">Password Management</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center font-black text-emerald-200 uppercase tracking-widest animate-pulse">Syncing Database...</td>
                </tr>
              ) : supervisors.map((sv) => (
                <tr key={sv._id} className="hover:bg-emerald-50/20 transition-colors">
                  <td className="px-8 py-4">
                    <div className="font-black text-emerald-950 text-sm uppercase">{sv.name}</div>
                    <div className="text-[10px] text-emerald-400 font-bold tracking-tight">{sv.gmail}</div>
                  </td>
                  <td className="px-8 py-4">
                    <select
                      className="bg-emerald-50 border-none rounded-lg px-3 py-2 text-[10px] font-black uppercase text-emerald-900 cursor-pointer focus:ring-2 ring-emerald-500 outline-none"
                      value={editData[sv._id]?.department || sv.department}
                      onChange={(e) => handleLocalChange(sv._id, 'department', e.target.value)}
                    >
                      {deptOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex gap-1">
                      {['1', '2', '3'].map(num => {
                        const activeShift = editData[sv._id]?.shift || sv.shift;
                        return (
                          <button
                            key={num}
                            onClick={() => handleLocalChange(sv._id, 'shift', num)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${activeShift === num ? 'bg-emerald-900 text-white' : 'bg-white text-emerald-200 border border-emerald-100 hover:text-emerald-500'}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 max-w-[140px]">
                      <Key size={12} className="text-emerald-300 mr-2" />
                      <input
                        type="password"
                        placeholder="NEW PWD"
                        className="bg-transparent border-none outline-none text-[10px] font-black w-full placeholder:text-emerald-200"
                        value={editData[sv._id]?.password || ''}
                        onChange={(e) => handleLocalChange(sv._id, 'password', e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button
                      onClick={() => handleRowUpdate(sv._id, sv.name)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all flex items-center justify-center mx-auto shadow-md active:scale-95"
                    >
                      <Save size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
            <div className="bg-emerald-900 p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="font-black uppercase tracking-[0.2em] text-sm">New Staff Member</h2>
                <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Personnel Registration Office</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>

            <form onSubmit={handleRegister} className="p-10 space-y-5">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="text" placeholder="FULL NAME" className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all uppercase"
                  value={newSv.name} onChange={(e) => setNewSv({ ...newSv, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center bg-[#F5FBF9] rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-emerald-500 transition-all">
                  <Calendar className="text-emerald-300 mr-3" size={18} />
                  <input required type="date" className="bg-transparent font-bold text-[10px] outline-none w-full"
                    value={newSv.dob} onChange={(e) => setNewSv({ ...newSv, dob: e.target.value })} />
                </div>
                <div className="flex items-center bg-[#F5FBF9] rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-emerald-500 transition-all">
                  <Hash className="text-emerald-300 mr-3" size={18} />
                  <input required type="text" placeholder="EMP ID" className="bg-transparent font-bold text-[10px] outline-none w-full uppercase"
                    value={newSv.employeeId} onChange={(e) => setNewSv({ ...newSv, employeeId: e.target.value })} />
                </div>
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="email" placeholder="GMAIL ADDRESS" className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all lowercase"
                  value={newSv.gmail} onChange={(e) => setNewSv({ ...newSv, gmail: e.target.value })} />
              </div>

              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="password" placeholder="SECURITY KEY" className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all"
                  value={newSv.password} onChange={(e) => setNewSv({ ...newSv, password: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-emerald-50 rounded-2xl px-4 py-4">
                  <label className="block text-[8px] font-black text-emerald-900 uppercase mb-1 ml-1 opacity-50">Shift Assignment</label>
                  <select className="bg-transparent font-black text-[10px] outline-none w-full uppercase text-emerald-900"
                    value={newSv.shift} onChange={(e) => setNewSv({ ...newSv, shift: e.target.value })}>
                    <option value="1">Shift 01</option>
                    <option value="2">Shift 02</option>
                    <option value="3">Shift 03</option>
                  </select>
                </div>
                <div className="bg-emerald-50 rounded-2xl px-4 py-4">
                  <label className="block text-[8px] font-black text-emerald-900 uppercase mb-1 ml-1 opacity-50">Department</label>
                  <select className="bg-transparent font-black text-[10px] outline-none w-full uppercase text-emerald-900"
                    value={newSv.department} onChange={(e) => setNewSv({ ...newSv, department: e.target.value })}>
                    {deptOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-900/20 mt-4">
                Verify & Save Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;