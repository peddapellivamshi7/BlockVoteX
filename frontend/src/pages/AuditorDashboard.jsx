import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { Play, Square, LogOut, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RepresentativeManager from '../components/RepresentativeManager';
import UserProfile from '../components/UserProfile';

export default function AuditorDashboard() {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [isActive, setIsActive] = useState(false);
    const [logs, setLogs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        checkStatus();
        api.getLogs().then(res => setLogs(res.data));
    }, []);

    const checkStatus = async () => {
        const res = await api.getElectionStatus();
        setIsActive(res.data.active);
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
        <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <header className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-purple-500" /> Auditor Control
                    </h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 transition">
                        <LogOut size={16} /> Logout
                    </button>
                </header>

                <UserProfile user={user} />

                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center mb-8">
                    <h2 className="text-xl text-slate-300 mb-6">Election Status</h2>
                    <div className={`inline-block px-6 py-2 rounded-full text-lg font-bold mb-8 ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isActive ? '● ACTIVE' : '● STOPPED'}
                    </div>

                    <div className="flex justify-center gap-6">
                        <button
                            onClick={() => toggleElection('start')}
                            disabled={isActive}
                            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all ${isActive ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-lg hover:scale-105'}`}
                        >
                            <Play fill="white" /> Start Election
                        </button>
                        <button
                            onClick={() => toggleElection('stop')}
                            disabled={!isActive}
                            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all ${!isActive ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 shadow-lg hover:scale-105'}`}
                        >
                            <Square fill="white" /> Stop Election
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-lg font-bold mb-4">Fraud Monitoring Log</h3>
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-2">Time</th>
                                    <th className="p-2">Type</th>
                                    <th className="p-2">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-700/50">
                                        <td className="p-2 text-slate-400">{new Date(log.timestamp + "Z").toLocaleTimeString()}</td>
                                        <td className="p-2 text-red-400 font-bold">{log.event_type}</td>
                                        <td className="p-2 text-slate-300">{log.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Representative Management */}
                <RepresentativeManager />
            </div>
        </div>
    );
}
