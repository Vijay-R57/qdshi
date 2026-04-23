import React, { useState } from 'react';
import { UserPlus, ShieldCheck, Users, X, Mail, Hash, Calendar, Lock, Briefcase, Clock, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';

const SuperAdminDashboard = () => {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', role: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    employeeId: '',
    gmail: '',
    password: '',
    department: 'Q', 
    shift: '1'      
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (title, role) => {
    setFormData({
        name: '',
        dob: '',
        employeeId: '',
        gmail: '',
        password: '',
        // If it's an HOD, we default to ALL/NONE immediately
        department: role === 'hod' ? 'ALL' : 'Q',
        shift: role === 'hod' ? 'NONE' : '1'
    });
    setModalConfig({ isOpen: true, title, role });
  };

  const handleCreateUser = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // HODs get 'ALL' department and 'NONE' shift to satisfy the Database Enum
      const payload = { 
        ...formData, 
        role: modalConfig.role,
        department: modalConfig.role === 'hod' ? 'ALL' : formData.department,
        shift: modalConfig.role === 'hod' ? 'NONE' : formData.shift
      };
      
      await axios.post(`${API_BASE_URL}/api/users/register`, payload, config);
      alert(`${modalConfig.role.toUpperCase()} Created Successfully!`);
      setModalConfig({ ...modalConfig, isOpen: false });
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Internal Server Error"));
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-emerald-100 pb-6">
          <h1 className="text-3xl md:text-4xl font-black text-emerald-900 tracking-tighter uppercase">Administration</h1>
          <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">Arcolab QDSHI Management Portal</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AdminCard title="Manage HODs" desc="Global Access for Q, D, S, H, I" icon={<ShieldCheck size={28}/>} color="bg-emerald-700" onClick={() => openModal("Register HOD", "hod")} />
          <AdminCard title="Supervisors" desc="Shift & Floor level tracking" icon={<UserPlus size={28}/>} color="bg-emerald-900" onClick={() => openModal("Register Supervisor", "supervisor")} />
          <AdminCard title="Employees" desc="General staff members" icon={<Users size={28}/>} color="bg-green-500" onClick={() => openModal("Register Employee", "employee")} />
        </div>

        {modalConfig.isOpen && (
          <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
                <h3 className="text-lg font-black uppercase tracking-widest">{modalConfig.title}</h3>
                <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="hover:bg-emerald-800 p-2 rounded-full transition-colors"><X size={24} /></button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { icon: <UserPlus />, name: "name", placeholder: "Full Name", type: "text", fullWidth: true },
                    { icon: <Calendar />, name: "dob", placeholder: "", type: "date" },
                    { icon: <Hash />, name: "employeeId", placeholder: "Emp ID", type: "text" },
                    { icon: <Mail />, name: "gmail", placeholder: "Gmail Address", type: "email", fullWidth: true },
                    { icon: <Lock />, name: "password", placeholder: "Set Password", type: "password", fullWidth: true },
                  ].map((field, idx) => (
                    <div key={idx} className={`relative ${field.fullWidth ? 'md:col-span-2' : ''}`}>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">{React.cloneElement(field.icon, { size: 20 })}</div>
                      <input name={field.name} type={field.type} value={formData[field.name]} placeholder={field.placeholder} onChange={handleChange} style={{ paddingLeft: "50px" }} className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold" />
                    </div>
                  ))}

                  {/* ONLY SHOW SHIFT/DEPT IF NOT HOD */}
                  {modalConfig.role !== 'hod' && (
                    <>
                      <div className="md:col-span-2 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600"><Clock size={20} /></div>
                        <select name="shift" value={formData.shift} onChange={handleChange} style={{ paddingLeft: "50px" }} className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-sm font-semibold appearance-none">
                          <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600"><Briefcase size={20} /></div>
                        <select name="department" value={formData.department} onChange={handleChange} style={{ paddingLeft: "50px" }} className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-sm font-semibold appearance-none">
                          <option value="Q">Quality (Q)</option><option value="D">Delivery (D)</option><option value="S">Safety (S)</option><option value="H">Health (H)</option><option value="I">Idea (I)</option>
                        </select>
                      </div>
                    </>
                  )}

                  <button onClick={handleCreateUser} className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl mt-4 uppercase tracking-widest transition-all shadow-lg active:scale-95">Confirm Registration</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminCard = ({ title, desc, icon, color, onClick }) => (
  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-xl transition-all group cursor-pointer flex flex-col justify-between" onClick={onClick}>
    <div>
        <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>{icon}</div>
        <h2 className="text-lg md:text-xl font-black text-emerald-950 mb-2 uppercase tracking-tighter">{title}</h2>
        <p className="text-emerald-600/70 mb-6 text-[10px] md:text-xs font-bold leading-relaxed">{desc}</p>
    </div>
    <div className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Launch Form <ChevronRight size={14} /></div>
  </div>
);

export default SuperAdminDashboard;