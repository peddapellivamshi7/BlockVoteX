import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { Database, ShieldAlert, LogOut, CheckCircle, Play, Square, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RepresentativeManager from '../components/RepresentativeManager';
import UserProfile from '../components/UserProfile';
import UserManager from '../components/UserManager';

export default function AdminDashboard() {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [stats, setStats] = useState(null);
    const [chain, setChain] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        checkStatus();
        const interval = setInterval(() => {
            fetchData();
            checkStatus();
        }, 5000); // Live updates
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const s = await api.getStats();
            const c = await api.getBlockchain();
            const l = await api.getLogs();
            setStats(s.data);
            setChain(c.data);
            setLogs(l.data);
        } catch (e) {
            console.error(e);
        }
    };

    const checkStatus = async () => {
        try {
            const res = await api.getElectionStatus();
            setIsActive(res.data.active);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleElection = async (action) => {
        await api.controlElection({ action, auditor_id: user.voter_id });
        checkStatus();
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Database className="text-blue-500" /> Admin Dashboard
                </h1>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 transition">
                    <LogOut size={16} /> Logout
                </button>
            </header>

            <UserProfile user={user} />

            {/* Admin Control Panel (Auditor Features) */}
            <div className="bg-slate-800 p-6 rounded-xl border border-purple-500/30 shadow-lg mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-500" /> Election Control
                    </h2>
                    <p className="text-slate-400 text-sm">Manage election state directly.</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`px-4 py-1 rounded-full text-sm font-bold ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isActive ? '● ACTIVE' : '● STOPPED'}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => toggleElection('start')}
                            disabled={isActive}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${isActive ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-lg'}`}
                        >
                            <Play size={16} fill="white" /> Start
                        </button>
                        <button
                            onClick={() => toggleElection('stop')}
                            disabled={!isActive}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${!isActive ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 shadow-lg'}`}
                        >
                            <Square size={16} fill="white" /> Stop
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-slate-400 text-sm">Total Voters</h3>
                    <p className="text-3xl font-bold text-white">{stats?.total_users || 0}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-slate-400 text-sm">Votes Cast</h3>
                    <p className="text-3xl font-bold text-green-400">{stats?.voted_users || 0}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg col-span-2">
                    <h3 className="text-slate-400 text-sm mb-2">Live Results</h3>
                    <div className="flex gap-4">
                        {stats?.party_data.map((p) => (
                            <div key={p.party} className="flex-1 bg-slate-900 p-3 rounded text-center">
                                <div className="text-lg font-bold">{p.party}</div>
                                <div className="text-2xl text-blue-400">{p.votes}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Blockchain Ledger */}
                <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="font-bold flex items-center gap-2"><CheckCircle className="text-green-500" size={20} /> Blockchain Ledger</h2>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-2">Index</th>
                                    <th className="p-2">Hash</th>
                                    <th className="p-2">Prev Hash</th>
                                    <th className="p-2">Timestamp</th>
                                    <th className="p-2">Data (Encrypted)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chain.map((block) => (
                                    <tr key={block.index_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                        <td className="p-2 text-blue-400">#{block.index_id}</td>
                                        <td className="p-2 font-mono text-xs text-slate-300 truncate max-w-[100px]" title={block.current_hash}>{block.current_hash.substring(0, 10)}...</td>
                                        <td className="p-2 font-mono text-xs text-slate-500 truncate max-w-[100px]" title={block.previous_hash}>{block.previous_hash.substring(0, 10)}...</td>
                                        <td className="p-2 text-slate-400">{new Date(parseFloat(block.timestamp) * 1000).toLocaleTimeString()}</td>
                                        <td className="p-2 text-xs text-slate-500">{block.block_data.substring(0, 50)}...</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden h-fit">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="font-bold flex items-center gap-2"><ShieldAlert className="text-red-500" size={20} /> Security Logs</h2>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="p-3 bg-slate-900 rounded border-l-4 border-red-500">
                                <div className="text-xs text-slate-400">{new Date(log.timestamp + "Z").toLocaleString()}</div>
                                <div className="font-semibold text-red-400">{log.event_type}</div>
                                <div className="text-sm text-slate-300">{log.description}</div>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-slate-500 text-center">No logs found.</div>}
                    </div>
                </div>
            </div>

            {/* Representative Management */}
            <RepresentativeManager />

            {/* Voter/Auditor Management */}
            <UserManager adminId={user.voter_id} />
        </div>
    );
}
