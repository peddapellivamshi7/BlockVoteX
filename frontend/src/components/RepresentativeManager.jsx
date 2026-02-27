import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { RefreshCw, Trash2, PlusCircle, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RepresentativeManager({ admin }) {
    const adminId = admin?.voter_id;
    const isAuditor = admin?.role === 'Auditor';

    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRep, setNewRep] = useState({
        representative_id: '',
        name: '',
        party_name: '',
        party_symbol: '',
        district_id: isAuditor ? admin.district : ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchReps();
    }, [admin]);

    const fetchReps = async () => {
        setLoading(true);
        try {
            const res = isAuditor
                ? await api.getRepresentativesByDistrict(admin.district)
                : await api.getRepresentatives();
            setReps(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch reps", error);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setNewRep({ ...newRep, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.addRepresentative(newRep, adminId);
            setSuccess(`Candidate ${newRep.name} added successfully!`);
            setNewRep({ representative_id: '', name: '', party_name: '', party_symbol: '', district_id: isAuditor ? admin.district : '' });
            fetchReps();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError(error.response?.data?.detail || "Failed to add representative");
        }
    };

    const handleDelete = async (repId) => {
        if (!window.confirm("Are you sure you want to remove this candidate?")) return;
        try {
            await api.deleteRepresentative(repId, adminId);
            fetchReps();
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to delete representative");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-[#143250] flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1f4a9b] text-white rounded-xl flex items-center justify-center shadow-inner">
                            <Users size={20} />
                        </div>
                        Candidate Roster
                    </h2>
                    <button onClick={fetchReps} className="text-gray-400 hover:text-[#1f4a9b] hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Refresh Roster">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={18} />
                        <span className="font-bold text-sm">{success}</span>
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <PlusCircle size={18} className="text-[#1f4a9b]" />
                        <h3 className="text-base font-black text-[#143250]">Register New Candidate</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                        <div className="lg:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rep ID (Unique)</label>
                            <input type="text" name="representative_id" value={newRep.representative_id} onChange={handleChange} required className="w-full bg-white border border-slate-300 shadow-sm rounded-lg p-2.5 text-sm font-bold text-[#143250] focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent transition-all" placeholder="ID (e.g. REP-01)" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                            <input type="text" name="name" value={newRep.name} onChange={handleChange} required className="w-full bg-white border border-slate-300 shadow-sm rounded-lg p-2.5 text-sm font-bold text-[#143250] focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent transition-all" placeholder="Candidate Name" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Party Name</label>
                            <input type="text" name="party_name" value={newRep.party_name} onChange={handleChange} required className="w-full bg-white border border-slate-300 shadow-sm rounded-lg p-2.5 text-sm font-bold text-[#143250] focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent transition-all" placeholder="Party Affiliation" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Symbol</label>
                            <input type="text" name="party_symbol" value={newRep.party_symbol} onChange={handleChange} required className="w-full bg-white border border-slate-300 shadow-sm rounded-lg p-2.5 text-sm font-bold text-[#143250] focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent transition-all" placeholder="Symbol (Emoji/Text)" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">District ID</label>
                            <input type="text" name="district_id" value={newRep.district_id} onChange={handleChange} required disabled={isAuditor} className={`w-full bg-white border border-slate-300 shadow-sm rounded-lg p-2.5 text-sm font-bold text-[#143250] focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent transition-all ${isAuditor ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} placeholder="Target District" />
                        </div>
                        <div className="md:col-span-2 lg:col-span-5 flex justify-end mt-2">
                            <button type="submit" className="bg-[#1f4a9b] hover:bg-[#143250] text-white px-8 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
                                <PlusCircle size={16} /> Enroll Candidate
                            </button>
                        </div>
                    </form>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-400 font-bold flex flex-col items-center gap-4">
                        <RefreshCw size={32} className="animate-spin text-[#1f4a9b] opacity-50" />
                        Loading candidate roster...
                    </div>
                ) : reps.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                        <Users size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-600 mb-1">No Candidates Enrolled</h3>
                        <p className="text-sm text-slate-400 font-medium">Use the form above to add representatives.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reps.map((rep) => (
                            <div key={rep.representative_id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:border-[#1f4a9b] group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-slate-200">
                                                {rep.party_symbol}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-[#143250] text-lg leading-tight">{rep.name}</h4>
                                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{rep.party_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">ID: {rep.representative_id}</span>
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">Dist #{rep.district_id}</span>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 pt-4 flex justify-end">
                                    <button onClick={() => handleDelete(rep.representative_id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold opacity-0 group-hover:opacity-100 focus:opacity-100">
                                        <Trash2 size={16} /> Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
