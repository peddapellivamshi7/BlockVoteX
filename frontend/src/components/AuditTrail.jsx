import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Database, Search, ShieldCheck, AlertTriangle, Fingerprint, Activity } from 'lucide-react';

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchHash, setSearchHash] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.getLogs();
            setLogs(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    const handleVerifyHash = async (e) => {
        e.preventDefault();
        if (!searchHash.trim()) return;
        try {
            const res = await api.verifyBlockHash(searchHash.trim());
            setVerifyResult(res.data);
        } catch (error) {
            setVerifyResult({ valid: false, message: "Error verifying hash." });
        }
    };

    const getLogIcon = (type) => {
        if (type.includes('FRAUD') || type.includes('ANOMALY')) return <AlertTriangle size={16} className="text-red-500" />;
        if (type === 'USER_REGISTERED') return <Fingerprint size={16} className="text-blue-500" />;
        if (type === 'USER_LOGIN') return <Activity size={16} className="text-emerald-500" />;
        if (type === 'VOTE_CAST') return <Database size={16} className="text-purple-500" />;
        return <Database size={16} className="text-gray-500" />;
    };

    const getLogColor = (type) => {
        if (type.includes('FRAUD') || type.includes('ANOMALY')) return 'bg-red-50 border-red-100 text-red-900';
        if (type === 'USER_REGISTERED') return 'bg-blue-50 border-blue-100 text-blue-900';
        if (type === 'USER_LOGIN') return 'bg-emerald-50 border-emerald-100 text-emerald-900';
        if (type === 'VOTE_CAST') return 'bg-purple-50 border-purple-100 text-purple-900';
        return 'bg-gray-50 border-gray-100 text-gray-900';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-[#143250] mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#143250] text-white rounded-xl flex items-center justify-center">
                        <ShieldCheck size={20} />
                    </div>
                    Cryptographic Hash Verifier
                </h2>

                <form onSubmit={handleVerifyHash} className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Paste Block Hash from Voter Receipt..."
                            value={searchHash}
                            onChange={(e) => setSearchHash(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 shadow-inner rounded-xl py-3 pl-12 pr-4 text-sm font-mono focus:ring-2 focus:ring-[#1f4a9b] focus:border-transparent"
                        />
                    </div>
                    <button type="submit" className="bg-[#1f4a9b] hover:bg-[#143250] text-white px-8 py-3 rounded-xl font-bold transition-colors whitespace-nowrap hidden sm:block">
                        Verify on Ledger
                    </button>
                </form>

                {verifyResult && (
                    <div className={`mt-6 p-6 rounded-xl border-2 ${verifyResult.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} animate-in fade-in slide-in-from-top-4`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${verifyResult.valid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {verifyResult.valid ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-black ${verifyResult.valid ? 'text-emerald-800' : 'text-red-800'} mb-1`}>
                                    {verifyResult.valid ? 'Valid Immutable Record' : 'Invalid or Missing Record'}
                                </h3>
                                <p className={`text-sm font-semibold ${verifyResult.valid ? 'text-emerald-700' : 'text-red-700'} mb-4`}>
                                    {verifyResult.message}
                                </p>

                                {verifyResult.valid && verifyResult.block_details && (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white/60 p-4 rounded-lg border border-emerald-100/50">
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Block Height</p>
                                            <p className="font-mono font-bold text-emerald-900">{verifyResult.block_details.index}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Timestamp</p>
                                            <p className="font-mono text-xs font-bold text-emerald-900">{new Date(verifyResult.block_details.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">District</p>
                                            <p className="font-mono font-bold text-emerald-900">#{verifyResult.block_details.district_id}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-[#143250] mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                        <Database size={20} />
                    </div>
                    System Master Audit Trail
                </h2>

                {loading ? (
                    <div className="text-center py-12 text-slate-400 font-bold">Loading immutable logs...</div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {logs.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 font-bold">No system logs recorded yet.</p>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className={`p-4 rounded-xl border ${getLogColor(log.event_type)} flex flex-col sm:flex-row gap-4 sm:items-center`}>
                                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                                        {getLogIcon(log.event_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                                            <h4 className="font-black text-sm uppercase tracking-wider">{log.event_type}</h4>
                                            <span className="text-xs font-mono font-bold opacity-60">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold opacity-90 truncate">{log.description}</p>
                                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest opacity-50">Related User ID: {log.user_id}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
