import React, { useEffect, useState, useRef } from 'react';
import * as api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Vote, Fingerprint, Camera, RefreshCw, Lock, AlertCircle, Send, Trophy, Bell } from 'lucide-react';
import Webcam from 'react-webcam';
import UserProfile from '../components/UserProfile';

import { startAuthentication } from '@simplewebauthn/browser';

export default function VoterDashboard() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [isActive, setIsActive] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null); // Stores representative_id
    const [faceImage, setFaceImage] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [voteSuccess, setVoteSuccess] = useState(false);
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [webauthnData, setWebauthnData] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeNotification, setActiveNotification] = useState(null);
    const [receipt, setReceipt] = useState(null);
    const navigate = useNavigate();
    const webcamRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }

        // 1. Check Election Status
        api.getElectionStatus().then(res => setIsActive(res.data.active));

        // Fetch overall stats for district winners
        api.getStats().then(res => setStats(res.data)).catch(err => console.error("Failed to load stats", err));

        // 2. Fetch Candidates for District
        api.getRepresentatives(user.district)
            .then(res => {
                const districtCandidates = res.data.filter(c => c.district_id === user.district);
                const finalCandidates = [...(districtCandidates.length > 0 ? districtCandidates : res.data)];
                finalCandidates.push({
                    representative_id: 'NOTA',
                    name: 'None of the Above',
                    party_name: 'NOTA',
                    party_symbol: '🚫',
                    district_id: user.district
                });
                setCandidates(finalCandidates);
            })
            .catch(err => console.error("Failed to load candidates", err));

        // 3. Fetch Active Notification
        api.getActiveNotification()
            .then(res => setActiveNotification(res.data.message))
            .catch(err => console.error("Failed to load notifications", err));

        // 4. Fetch Receipt if voted
        if (user.has_voted) {
            api.getVoterReceipt(user.voter_id)
                .then(res => setReceipt(res.data))
                .catch(err => console.error("Failed to load receipt", err));
        }

    }, []);

    const capture = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setFaceImage(imageSrc);
            setIsCameraOn(false);
        }
    };

    const retake = () => {
        setFaceImage(null);
    };

    const handleVote = async () => {
        setError('');
        if (!faceImage) { setError("Please capture Face first!"); return; }

        try {
            const candidate = candidates.find(c => c.representative_id === selectedParty);
            if (!candidate) return;

            const { data: options } = await api.voteOptions({
                voter_id: user.voter_id,
                aadhaar: user.aadhaar_masked || ""
            });

            let authenticationResponse;
            try {
                authenticationResponse = await startAuthentication(options);
            } catch (authErr) {
                console.error("WebAuthn Error:", authErr);
                if (authErr.name === 'NotAllowedError') {
                    throw new Error("Biometric verification was canceled.");
                }
                throw new Error("Biometric authentication failed or is not supported.");
            }

            setWebauthnData(authenticationResponse);
            await api.generateOtp({ voter_id: user.voter_id });
            setShowOtpModal(true);

        } catch (err) {
            console.error("Voting failed:", err);
            setError(err.response?.data?.detail || err.message || 'Voting Failed');
        }
    };

    const confirmVote = async () => {
        try {
            setError('');
            const candidate = candidates.find(c => c.representative_id === selectedParty);

            const res = await api.voteVerify({
                voter_id: user.voter_id,
                district_id: user.district,
                party_id: candidate.representative_id,
                face_image: faceImage,
                authentication_response: webauthnData,
                otp: otp
            });

            if (res.data.status === 'success') {
                setVoteSuccess(true);
                setShowOtpModal(false);
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "OTP verification failed");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (voteSuccess) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-12 rounded-3xl shadow-xl text-center border border-gray-100 max-w-md w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                    <h1 className="text-3xl font-black text-[#143250] mb-4">Vote Cast Successfully!</h1>
                    <p className="text-gray-500 mb-8 font-medium">Your vote has been securely recorded on the immutable blockchain ledger.</p>
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-gradient-to-r from-[#143250] to-[#1f4a9b] text-white rounded-xl shadow-lg font-black hover:opacity-90 transition-opacity"
                    >
                        Logout Securely
                    </button>
                </div>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-12 rounded-3xl shadow-xl text-center border border-red-100 max-w-md w-full">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={48} className="text-red-600" />
                    </div>
                    <h1 className="text-3xl font-black text-[#143250] mb-4">Election Inactive</h1>
                    <p className="text-gray-500 mb-8 font-medium">The election window is currently closed. Please wait for an official announcement.</p>

                    {stats?.district_winners && stats.district_winners.length > 0 && (
                        <div className="mb-8 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <h3 className="text-lg font-bold text-[#143250] mb-4 flex items-center gap-2 justify-center">
                                <Trophy className="text-amber-500" size={20} /> Official Election Results
                            </h3>
                            <div className="space-y-3">
                                {stats.district_winners.map((winner, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-[#143250] transition-colors">
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 block mb-0.5">District {winner.district_id}</span>
                                            <span className="font-bold text-[#143250]">{winner.winner_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="flex items-center gap-1.5 px-2 bg-gray-50 rounded-md text-xs font-bold text-gray-600 border border-gray-100 mb-1">
                                                {winner.symbol} {winner.party}
                                            </span>
                                            <span className="text-sm font-black text-emerald-600 block">{winner.votes} Votes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    if (user?.has_voted && !voteSuccess) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={36} className="text-blue-600" />
                    </div>
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-[#143250] mb-2">Digital Voting Receipt</h1>
                        <p className="text-sm text-gray-500 font-medium">Your ballot has been securely recorded on the immutable blockchain ledger. You cannot vote again.</p>
                    </div>

                    {receipt && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Lock size={120} />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time of Vote</p>
                                    <p className="font-bold text-slate-800 font-mono text-sm">{new Date(receipt.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Constituency</p>
                                    <p className="font-bold text-slate-800 text-sm">District #{receipt.district_id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cryptographic Hash</p>
                                    <p className="font-bold text-emerald-600 font-mono text-xs break-all bg-emerald-50 p-2 rounded border border-emerald-100">{receipt.block_hash}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {stats?.district_winners && stats.district_winners.length > 0 && !isActive && (
                        <div className="mb-8 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <h3 className="text-lg font-bold text-[#143250] mb-4 flex items-center gap-2 justify-center">
                                <Trophy className="text-amber-500" size={20} /> Official Election Results
                            </h3>
                            <div className="space-y-3">
                                {stats.district_winners.map((winner, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-[#143250] transition-colors">
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 block mb-0.5">District {winner.district_id}</span>
                                            <span className="font-bold text-[#143250]">{winner.winner_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="flex items-center gap-1.5 px-2 bg-gray-50 rounded-md text-xs font-bold text-gray-600 border border-gray-100 mb-1">
                                                {winner.symbol} {winner.party}
                                            </span>
                                            <span className="text-sm font-black text-emerald-600 block">{winner.votes} Votes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-gradient-to-r from-[#143250] to-[#1f4a9b] text-white rounded-xl shadow-lg font-black hover:opacity-90 transition-opacity"
                    >
                        Logout Securely
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f2f5] text-gray-800 font-sans pb-12">

            {/* Top Dark Blue Bar */}
            <div className="bg-[#1f4a9b] text-white text-sm py-2 px-4 flex justify-between items-center z-50">
                <div className="w-full flex justify-center text-xs md:text-sm font-semibold tracking-wide">
                    भारत निर्वाचन आयोग | Election Commission of India
                </div>
            </div>

            {/* Main Header / Nav */}
            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

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
                            onClick={handleLogout}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-md shadow-md font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <LogOut size={16} /> Exit
                        </button>
                    </div>
                </div>
            </header>

            {/* Live Notification Banner */}
            {activeNotification && (
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 mt-6 max-w-5xl mx-auto rounded-r-xl shadow-sm flex items-center gap-4 animate-in slide-in-from-top-4 relative z-30">
                    <div className="bg-amber-200 p-2 rounded-lg text-amber-600">
                        <Bell size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="font-black text-xs uppercase tracking-wider text-amber-600 mb-0.5">Official Announcement</p>
                        <p className="font-bold text-sm leading-snug">{activeNotification}</p>
                    </div>
                </div>
            )}

            {/* Hero Banner Image */}
            <div className="w-full relative shadow-sm mb-8">
                <img
                    src="/banner.png"
                    alt="Hero Banner"
                    className="w-full h-auto object-cover max-h-[120px] md:max-h-[180px] border-b border-gray-200"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1f4a9b]/20 to-transparent"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                <UserProfile user={user} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

                    {/* Left Column: District Candidates */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <h2 className="text-2xl font-black text-[#143250] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#143250] text-white rounded-full flex items-center justify-center text-sm">1</span>
                                Select Candidate
                            </h2>
                            <div className="space-y-4">
                                {candidates.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-400 font-bold">No candidates registered for District {user?.district}</p>
                                    </div>
                                ) : (
                                    candidates.map(candidate => (
                                        <button
                                            key={candidate.representative_id}
                                            onClick={() => setSelectedParty(candidate.representative_id)}
                                            className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 ${selectedParty === candidate.representative_id
                                                ? 'bg-[#f0f9ff] border-[#0ea5e9] shadow-md transform scale-[1.02]'
                                                : 'bg-white border-gray-100 hover:border-[#bae6fd] hover:bg-gray-50/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-5 text-left">
                                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                                                    {candidate.party_symbol}
                                                </div>
                                                <div>
                                                    <h3 className="text-[#143250] font-black text-xl">{candidate.party_name}</h3>
                                                    <p className="text-gray-500 font-bold text-sm tracking-wide">{candidate.name}</p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${selectedParty === candidate.representative_id ? 'bg-[#0ea5e9] border-[#0ea5e9]' : 'border-gray-200'}`}>
                                                {selectedParty === candidate.representative_id && <CheckCircle size={20} className="text-white" />}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Biometric Verification & Voting */}
                    <div className={`transition-all duration-500 ${selectedParty ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none'}`}>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
                            <h2 className="text-2xl font-black text-[#143250] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-[#143250] text-white rounded-full flex items-center justify-center text-sm">2</span>
                                Identity Verification
                            </h2>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-black flex items-center gap-3">
                                    <AlertCircle size={20} /> {error}
                                </div>
                            )}

                            <div className="space-y-8">
                                {/* Live Face Camera */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Camera size={16} /> Live Face Authentication
                                    </label>
                                    <div className="relative rounded-3xl overflow-hidden bg-gray-100 aspect-video border-2 border-gray-100 flex items-center justify-center group">
                                        {!isCameraOn && !faceImage ? (
                                            <button
                                                onClick={() => setIsCameraOn(true)}
                                                className="px-8 py-3 bg-white text-[#143250] rounded-full shadow-lg hover:shadow-xl transition-all font-black border border-gray-100 flex items-center gap-3"
                                            >
                                                <Camera size={20} /> Open Camera
                                            </button>
                                        ) : isCameraOn ? (
                                            <>
                                                <Webcam
                                                    audio={false}
                                                    ref={webcamRef}
                                                    screenshotFormat="image/jpeg"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={capture}
                                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-10 py-4 bg-[#143250] text-white rounded-full shadow-[0_10px_25px_rgba(20,50,80,0.4)] hover:scale-105 transition-transform font-black"
                                                >
                                                    Capture Photo
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <img src={faceImage} alt="Face" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={retake}
                                                    className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm text-[#143250] rounded-full hover:bg-red-500 hover:text-white transition-all shadow-md"
                                                >
                                                    <RefreshCw size={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleVote}
                                    className="w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all bg-gradient-to-r from-[#0f8b65] to-[#10b981] hover:opacity-90 text-white shadow-[0_15px_30px_rgba(16,185,129,0.3)] transform hover:-translate-y-1 active:scale-95 text-lg"
                                >
                                    <Fingerprint size={24} /> Authenticate & Cast Vote
                                </button>
                                <p className="text-center text-xs text-gray-400 font-bold px-4">
                                    By clicking above, you trigger the hardware biometric sensor on your device for final cryptographic signing.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* OTP Modal */}
            {showOtpModal && (
                <div className="fixed inset-0 bg-[#143250]/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-10 rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                            <Send size={32} className="text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-black text-[#143250] mb-4">Two-Factor Authentication</h2>
                        <p className="text-gray-500 mb-8 font-medium">
                            A high-security verification code has been sent to your registered credentials.
                            <br />
                            <span className="text-[#0ea5e9] text-xs font-black mt-2 inline-block bg-[#f0f9ff] px-2 py-1 rounded">CHECK BACKEND CONSOLE FOR SIMULATED SMS</span>
                        </p>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black">
                                {error}
                            </div>
                        )}

                        <div className="relative mb-8">
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="0 0 0 0 0 0"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full text-center text-4xl font-black tracking-[0.5em] bg-gray-50 border-2 border-gray-100 text-[#143250] rounded-2xl p-6 focus:border-[#0ea5e9] focus:bg-white outline-none transition-all"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowOtpModal(false)}
                                className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-black hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmVote}
                                className="flex-1 py-4 bg-[#143250] text-white rounded-xl font-black hover:opacity-90 transition-opacity shadow-lg"
                            >
                                Finalize Vote
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
