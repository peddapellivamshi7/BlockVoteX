import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { Trophy, AlertCircle } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isActive, setIsActive] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        api.getElectionStatus()
            .then(res => setIsActive(res.data.active))
            .catch(err => console.error(err));

        api.getStats()
            .then(res => setStats(res.data))
            .catch(err => console.error("Failed to load stats", err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

            {/* Top Dark Blue Bar */}
            <div className="bg-[#1f4a9b] text-white text-sm py-2 px-4 flex justify-between items-center z-50">
                <div className="w-full flex justify-center text-xs md:text-sm font-semibold tracking-wide">
                    भारत निर्वाचन आयोग | Election Commission of India
                </div>
            </div>

            {/* Main Header / Nav */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">

                    {/* Logo & Brand */}
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

                    {/* Buttons */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-1.5 md:px-6 md:py-2 bg-[#f4f7ff] text-[#1f4a9b] border border-[#aabcf7] hover:bg-[#e6ebff] rounded-md font-bold text-sm transition-colors shadow-sm"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/login', { state: { isRegister: true } })}
                            className="px-4 py-1.5 md:px-6 md:py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-md shadow-md font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Register
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Banner Image */}
            <div className="w-full relative shadow-md">
                <img
                    src="/banner.png"
                    alt="Hero Banner"
                    className="w-full h-auto object-cover max-h-[400px]"
                />
            </div>

            {/* Public Election Results (Only visible when election is closed) */}
            {!isActive && stats?.district_winners && stats.district_winners.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-amber-100 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">

                        {/* Left Header */}
                        <div className="md:w-1/3 text-center md:text-left z-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl mb-4 shadow-inner">
                                <Trophy size={32} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-[#143250] mb-2">Official Results</h2>
                            <p className="text-gray-500 font-medium text-sm">The election window has closed. The cryptographic tally is complete and verified.</p>
                        </div>

                        {/* Right Winners List */}
                        <div className="md:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 z-10">
                            {stats.district_winners.map((winner, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-0 right-0 p-2 text-gray-200 group-hover:text-amber-100 transition-colors pointer-events-none">
                                        <Trophy size={64} className="opacity-20" />
                                    </div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">District {winner.district_id}</span>
                                    <h3 className="text-lg font-black text-[#143250] mb-1">{winner.winner_name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-600 shadow-sm">
                                            {winner.symbol} {winner.party}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-black">
                                            {winner.votes} Votes
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}

            {/* Services Section */}
            <main className="flex-1 max-w-6xl mx-auto px-4 py-12 w-full">

                <div className="flex justify-center items-center gap-3 mb-10">
                    <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div></div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-[#143250]">
                        Explore Our <span className="text-red-500">Voter Services</span>
                    </h3>
                    <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 justify-items-center">

                    {/* Card 1: Cast Live Vote */}
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden text-center max-w-sm w-full flex flex-col border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
                        <div className="h-40 bg-green-100 relative overflow-hidden">
                            <img src="/eci_card_vote.png" alt="Cast Vote" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h4 className="text-xl font-black text-[#0f8b65] mb-2 border-b-2 border-green-100 pb-2 inline-block mx-auto">Cast Live Vote</h4>
                            <p className="text-gray-600 text-sm mb-6 flex-1">Cast your ballot securely and verify your identity.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-[#143250] rounded-md font-extrabold shadow-md hover:opacity-90 transition-opacity"
                            >
                                Access Terminal
                            </button>
                        </div>
                    </div>

                    {/* Card 2: New Voter Registration */}
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden text-center max-w-sm w-full flex flex-col border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
                        <div className="h-40 bg-purple-100 relative overflow-hidden">
                            <img src="/eci_card_register.png" alt="Register" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h4 className="text-xl font-black text-[#7a2a90] mb-2 border-b-2 border-purple-100 pb-2 inline-block mx-auto">New Voter Registration</h4>
                            <p className="text-gray-600 text-sm mb-6 flex-1">Enroll as a new voter with ease.</p>
                            <button
                                onClick={() => navigate('/login', { state: { isRegister: true } })}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md font-extrabold shadow-md hover:opacity-90 transition-opacity"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>

                    {/* Card 3: Check Voter Status */}
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden text-center max-w-sm w-full flex flex-col border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
                        <div className="h-40 bg-orange-100 relative overflow-hidden">
                            <img src="/eci_card_status.png" alt="Status" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h4 className="text-xl font-black text-[#d96725] mb-2 border-b-2 border-orange-100 pb-2 inline-block mx-auto">Check Voter Status</h4>
                            <p className="text-gray-600 text-sm mb-6 flex-1">Verify your electoral details.</p>
                            <button
                                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-md font-extrabold shadow-md hover:opacity-90 transition-opacity opacity-70 cursor-not-allowed"
                            >
                                Check Now &gt;
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#f0f2f5] border-t border-gray-200 py-6 mt-auto">
                <div className="max-w-6xl mx-auto px-4 flex justify-center items-center">
                    <div className="h-[1px] bg-gray-300 flex-1 hidden md:block"></div>
                    <p className="text-gray-500 text-xs font-semibold px-4 text-center">© Election Commission of India</p>
                    <div className="h-[1px] bg-gray-300 flex-1 hidden md:block"></div>
                </div>
            </footer>
        </div>
    );
}