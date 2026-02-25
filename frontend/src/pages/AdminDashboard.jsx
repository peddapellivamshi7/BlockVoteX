import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { ShieldAlert, LogOut, Play, Square, Activity, Vote, Settings, Users, BarChart3, List as ListIcon, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RepresentativeManager from '../components/RepresentativeManager';
import UserProfile from '../components/UserProfile';
import UserManager from '../components/UserManager';
import VoterStatusCheck from '../components/VoterStatusCheck';

const List = ListIcon;

export default function AdminDashboard() {
    const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [stats, setStats] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        checkStatus();
        const interval = setInterval(() => {
            fetchData();
            checkStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const s = await api.getStats();
            setStats(s.data);
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
        <div className="min-h-screen bg-[#f0f2f5] text-gray-800 font-sans pb-12">
            <div className="bg-[#1f4a9b] text-white text-sm py-2 px-4 flex justify-between items-center z-50">
                <div className="w-full flex justify-center text-xs md:text-sm font-semibold tracking-wide">
                    भारत निर्वाचन आयोग | Election Commission of India
                </div>
            </div>

            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-full p-0.5 shadow-sm overflow-hidden border border-gray-100">
                            <img src="/banner.png" alt="ECI Logo" className="w-full h-full object-cover scale-150" />
                        </div>
                        <div className="flex flex-col border-l-2 border-gray-300 pl-3 md:pl-4">
                            <h1 className="text-xl md:text-2xl font-bold flex gap-0">
                                <span className="text-[#f08c3a]">Block</span>
                                <span className="text-[#143250]">Vote</span>
                                <span className="text-pink-500">X</span>
                            </h1>
                            <p className="text-[10px] md:text-xs text-gray-500 font-semibold tracking-widest mt-0.5 uppercase">ELECTION COMMISSION OF INDIA</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => navigate('/voter')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#f4f7ff] text-[#1f4a9b] border border-[#aabcf7] hover:bg-[#e6ebff] rounded-md font-bold text-sm transition-colors shadow-sm">
                            <Vote size={16} /> Cast Vote
                        </button>
                        <button onClick={handleLogout} className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-md shadow-md font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Banner Image */}
            <div className="w-full relative shadow-sm mb-8">
                <img
                    src="/banner.png"
                    alt="Hero Banner"
                    className="w-full h-auto object-cover max-h-[120px] md:max-h-[180px] border-b border-gray-200"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1f4a9b]/20 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <button onClick={() => setActiveSection('profile')} className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:scale-105 hover:shadow-md group flex flex-col items-center gap-3 ${activeSection === 'profile' ? 'bg-white ring-2 ring-blue-500 border-blue-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'profile' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <ShieldAlert size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-[#143250] text-sm md:text-base">Admin Profile</h3>
                            <p className="hidden md:block text-[10px] text-gray-500 font-medium tracking-tight">Account details</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveSection('election')} className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:scale-105 hover:shadow-md group flex flex-col items-center gap-3 ${activeSection === 'election' ? 'bg-white ring-2 ring-purple-500 border-purple-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'election' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'}`}>
                            <Activity size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-[#143250] text-sm md:text-base">Election State</h3>
                            <p className="hidden md:block text-[10px] text-gray-500 font-medium tracking-tight">Active voting</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveSection('users')} className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:scale-105 hover:shadow-md group flex flex-col items-center gap-3 ${activeSection === 'users' ? 'bg-white ring-2 ring-emerald-500 border-emerald-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'users' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                            <Users size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-[#143250] text-sm md:text-base">User & Auditor</h3>
                            <p className="hidden md:block text-[10px] text-gray-500 font-medium tracking-tight">Registrations</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveSection('reps')} className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:scale-105 hover:shadow-md group flex flex-col items-center gap-3 ${activeSection === 'reps' ? 'bg-white ring-2 ring-orange-500 border-orange-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'reps' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'}`}>
                            <List size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-[#143250] text-sm md:text-base">Representatives</h3>
                            <p className="hidden md:block text-[10px] text-gray-500 font-medium tracking-tight">Manage candidates</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveSection('voter-status')} className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-300 hover:scale-105 hover:shadow-md group flex flex-col items-center gap-3 ${activeSection === 'voter-status' ? 'bg-white ring-2 ring-blue-400 border-blue-100 shadow-md' : 'bg-white border-gray-100'}`}>
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${activeSection === 'voter-status' ? 'bg-blue-400 text-white' : 'bg-blue-50 text-blue-400 group-hover:bg-blue-400 group-hover:text-white'}`}>
                            <Search size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-black text-[#143250] text-sm md:text-base">Voter Status</h3>
                            <p className="hidden md:block text-[10px] text-gray-500 font-medium tracking-tight">Search profiles</p>
                        </div>
                    </button>
                </div>

                <div className="mt-8 transition-all duration-500 min-h-[400px]">
                    {!activeSection && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-700">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                                <Settings size={40} className="text-gray-300 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-[#143250] mb-2">Welcome to Admin Panel</h2>
                            <p className="text-gray-500 font-medium max-w-sm">Please select a section from the cards above to manage the election system.</p>
                        </div>
                    )}

                    <div className="max-w-5xl mx-auto">
                        {activeSection === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <UserProfile user={user} />
                            </div>
                        )}

                        {activeSection === 'election' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h2 className="text-lg font-bold text-[#143250] mb-4 flex items-center gap-2">
                                            <Activity className="text-purple-500" size={20} /> Election State
                                        </h2>
                                        <div className="flex flex-col items-center gap-6 py-4">
                                            <div className={`w-full py-3 rounded-xl text-center font-black border-2 ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {isActive ? '● ELECTION ACTIVE' : '● ELECTION STOPPED'}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <button onClick={() => toggleElection('start')} disabled={isActive} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-sm ${isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                                                    <Play size={18} /> Start
                                                </button>
                                                <button onClick={() => toggleElection('stop')} disabled={!isActive} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-sm ${!isActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                                    <Square size={18} /> Stop
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <div className="bg-[#143250] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden h-full">
                                        <div className="relative z-10">
                                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <BarChart3 size={20} className="text-blue-400" /> Quick Stats
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-white/10 p-4 rounded-xl">
                                                    <p className="text-xs text-blue-200 uppercase font-black">Total Registered</p>
                                                    <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                                                </div>
                                                <div className="bg-white/10 p-4 rounded-xl">
                                                    <p className="text-xs text-orange-200 uppercase font-black">Total Votes Cast</p>
                                                    <p className="text-2xl font-bold">{stats?.voted_users || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12">
                                            <Settings size={120} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'users' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <UserManager adminId={user.voter_id} />
                            </div>
                        )}

                        {activeSection === 'reps' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <RepresentativeManager />
                            </div>
                        )}

                        {activeSection === 'voter-status' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <VoterStatusCheck requesterId={user.voter_id} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
