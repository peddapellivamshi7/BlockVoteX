import React from 'react';
import { User, Shield, MapPin, Hash, CheckCircle, Fingerprint, ShieldCheck, Phone, Calendar, Users, Activity } from 'lucide-react';

export default function UserProfile({ user }) {
    if (!user) return null;

    const getRoleStyles = (role) => {
        switch (role) {
            case 'Admin': return 'text-purple-600 bg-purple-50 border-purple-100';
            case 'Auditor': return 'text-orange-600 bg-orange-50 border-orange-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-10">
                <div className="relative">
                    <div className="w-28 h-28 bg-gradient-to-tr from-[#1f4a9b] to-[#143250] rounded-full flex items-center justify-center shadow-xl border-4 border-white mb-4">
                        <span className="text-4xl font-black text-white">{user.name ? user.name.charAt(0) : '?'}</span>
                    </div>
                    <div className="absolute bottom-6 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm">
                        <ShieldCheck size={16} />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-[#143250]">{user.name}</h3>
                <div className={`mt-3 px-6 py-1.5 rounded-full text-xs font-black border uppercase tracking-widest flex items-center gap-2 ${getRoleStyles(user.role)}`}>
                    <Shield size={14} /> {user.role} Authorization
                </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voter ID Detail */}
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                        <Hash size={16} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Voter ID</span>
                    </div>
                    <span className="text-lg font-black text-[#143250]">{user.voter_id}</span>
                </div>

                {/* District Detail */}
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-orange-200 transition-colors">
                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                        <MapPin size={16} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Voting District</span>
                    </div>
                    <span className="text-lg font-black text-[#143250]">Zone {user.district}</span>
                </div>


                {/* Status Card */}
                <div className="md:col-span-2 p-5 bg-[#143250] rounded-2xl border border-gray-100 shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Fingerprint size={20} className="text-blue-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Aadhaar Mapping</p>
                                <p className="text-base font-bold text-white">{user.aadhaar_masked || 'XXXXXXXX7832'}</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-emerald-400 uppercase border border-emerald-500/30">
                            Verified
                        </div>
                    </div>
                </div>

                {/* Additional Details */}
                {user.phone && (
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3 text-gray-400 mb-2">
                            <Phone size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Phone Number</span>
                        </div>
                        <span className="text-sm font-bold text-[#143250]">{user.phone}</span>
                    </div>
                )}

                {user.birthday && user.age && (
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-pink-200 transition-colors">
                        <div className="flex items-center gap-3 text-gray-400 mb-2">
                            <Calendar size={16} className="text-pink-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Date of Birth (Age)</span>
                        </div>
                        <span className="text-sm font-bold text-[#143250]">{user.birthday} ({user.age} yrs) / {user.sex}</span>
                    </div>
                )}

                {user.father_name && (
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 text-gray-400 mb-2">
                            <Users size={16} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Father's Name</span>
                        </div>
                        <span className="text-sm font-bold text-[#143250]">{user.father_name}</span>
                    </div>
                )}

                {user.mother_name && (
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3 text-gray-400 mb-2">
                            <Users size={16} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Mother's Name</span>
                        </div>
                        <span className="text-sm font-bold text-[#143250]">{user.mother_name}</span>
                    </div>
                )}
            </div>

            {/* Security Clearances */}
            <div className="mt-8 pt-8 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">System Clearances</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[11px] font-bold">
                        <CheckCircle size={14} className="text-emerald-500" /> Biometric Identity Locked
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-[11px] font-bold">
                        <CheckCircle size={14} className="text-emerald-500" /> Hardware Token Active
                    </div>
                </div>
            </div>
        </div>
    );
}
