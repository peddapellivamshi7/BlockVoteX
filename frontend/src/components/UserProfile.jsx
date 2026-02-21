import React from 'react';
import { User, Shield, MapPin, Hash, CheckCircle, Fingerprint } from 'lucide-react';

export default function UserProfile({ user }) {
    if (!user) return null;

    const getRoleColor = (role) => {
        switch (role) {
            case 'Admin': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
            case 'Auditor': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
            default: return 'text-green-500 bg-green-500/10 border-green-500/30';
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-fit mb-8">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2 flex items-center gap-2">
                <User className="text-blue-400" /> Identity Profile
            </h2>

            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-800 mb-4">
                    <span className="text-3xl font-bold text-white">{user.name ? user.name.charAt(0) : '?'}</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{user.name}</h3>
                <div className={`mt-2 px-4 py-1 rounded-full text-xs font-bold border ${getRoleColor(user.role)} flex items-center gap-1`}>
                    <Shield size={12} /> {user.role.toUpperCase()} ACCESS
                </div>
            </div>

            <div className="space-y-4">
                {/* Voter ID Detail */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Hash size={18} className="text-slate-500" />
                        <span className="text-sm">Voter ID</span>
                    </div>
                    <span className="font-mono font-bold text-slate-200">{user.voter_id}</span>
                </div>

                {/* Aadhaar Detail */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Fingerprint size={18} className="text-slate-500" />
                        <span className="text-sm">Aadhaar Map</span>
                    </div>
                    <span className="font-mono font-bold text-slate-200">{user.aadhaar_masked || 'Not Verified'}</span>
                </div>

                {/* District Detail */}
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3 text-slate-400">
                        <MapPin size={18} className="text-slate-500" />
                        <span className="text-sm">Voting District</span>
                    </div>
                    <span className="font-bold text-green-400">Zone {user.district}</span>
                </div>

                {/* Clearances */}
                <div className="pt-4 mt-4 border-t border-slate-700 space-y-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Security Clearances</p>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle size={14} className="text-green-500" /> Biometric Face Hash Locked
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle size={14} className="text-green-500" /> Hardware Token Verified
                    </div>
                </div>
            </div>
        </div>
    );
}
