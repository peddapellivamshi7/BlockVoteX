import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

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
                            <h1 className="text-xl md:text-2xl font-bold flex gap-1">
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