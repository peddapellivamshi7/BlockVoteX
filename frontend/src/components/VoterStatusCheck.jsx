import React, { useState } from 'react';
import { Search, MapPin, Hash, User, ShieldCheck, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { getVoterStatus } from '../services/api';

export default function VoterStatusCheck({ requesterId }) {
    const [query, setQuery] = useState('');
    const [voterData, setVoterData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError('');
        setVoterData(null);

        try {
            const res = await getVoterStatus(query.trim(), requesterId);
            setVoterData(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Voter not found or error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-[#143250] mb-6 flex items-center gap-3">
                    <Search className="text-blue-500" /> Check Voter Status
                </h2>

                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Enter Voter ID or Aadhaar Number"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-[#143250] text-white rounded-2xl font-black hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 translate-y-0.5">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}
            </div>

            {voterData && (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Status Icon */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border-4 border-white shadow-md relative overflow-hidden">
                                <span className="text-3xl font-black text-[#143250]">
                                    {voterData.name.charAt(0)}
                                </span>
                                {voterData.is_registered && (
                                    <div className="absolute bottom-4 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                                        <ShieldCheck size={12} />
                                    </div>
                                )}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${voterData.has_voted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                voterData.is_registered ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                {voterData.status}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <User size={12} /> Full Name
                                </p>
                                <p className="text-lg font-black text-[#143250]">{voterData.name}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Hash size={12} /> Voter ID
                                </p>
                                <p className="text-lg font-black text-[#143250]">{voterData.voter_id}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <MapPin size={12} /> District
                                </p>
                                <p className="text-lg font-black text-[#143250]">Zone {voterData.district}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Hash size={12} /> Aadhaar
                                </p>
                                <p className="text-lg font-black text-[#143250]">{voterData.aadhaar_masked}</p>
                            </div>

                            {voterData.phone && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <User size={12} /> Phone
                                    </p>
                                    <p className="text-lg font-black text-[#143250]">{voterData.phone}</p>
                                </div>
                            )}

                            {voterData.birthday && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Clock size={12} /> Birthday / Age / Sex
                                    </p>
                                    <p className="text-lg font-black text-[#143250]">{voterData.birthday} (Age {voterData.age}) - {voterData.sex}</p>
                                </div>
                            )}

                            {voterData.father_name && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <User size={12} /> Father's Name
                                    </p>
                                    <p className="text-lg font-black text-[#143250]">{voterData.father_name}</p>
                                </div>
                            )}

                            {voterData.mother_name && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <User size={12} /> Mother's Name
                                    </p>
                                    <p className="text-lg font-black text-[#143250]">{voterData.mother_name}</p>
                                </div>
                            )}

                            {/* Verification Summary */}
                            <div className="md:col-span-2 mt-4 p-6 bg-[#143250] text-white rounded-3xl relative overflow-hidden">
                                <div className="relative z-10 flex flex-wrap gap-4 justify-center">
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-4 py-2 rounded-xl">
                                        {voterData.is_registered ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                                        Registration: {voterData.is_registered ? 'Complete' : 'Pending'}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-4 py-2 rounded-xl">
                                        {voterData.has_voted ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Clock size={16} className="text-orange-400" />}
                                        Voting Status: {voterData.has_voted ? 'Voted' : 'Not Cast'}
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-2 opacity-5">
                                    <ShieldCheck size={80} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
