import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Vote, Fingerprint, Camera, RefreshCw, Lock } from 'lucide-react';
import Webcam from 'react-webcam';
import UserProfile from '../components/UserProfile';

// --- External Scanner Helper ---
const captureFingerprintFromDevice = async () => {
    try {
        const res = await fetch('http://localhost:8081/capture');
        if (!res.ok) throw new Error("Scanner service not responding");
        const data = await res.json();
        if (data.status !== "success") throw new Error(data.message || "Capture failed");
        return data.fingerprint_template;
    } catch (err) {
        console.error("Scanner Error:", err);
        throw new Error("Could not connect to external USB Fingerprint Scanner on port 8081.");
    }
};

export default function VoterDashboard() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [isActive, setIsActive] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedParty, setSelectedParty] = useState(null); // Stores representative_id
    const [faceImage, setFaceImage] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [voteSuccess, setVoteSuccess] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const webcamRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }

        // 1. Check Election Status
        api.get('/election/status').then(res => setIsActive(res.data.active));

        // 2. Fetch Candidates for District
        api.get(`/representatives/${user.district}`)
            .then(res => setCandidates(res.data))
            .catch(err => console.error("Failed to load candidates", err));

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
            // Find selected candidate details
            const candidate = candidates.find(c => c.representative_id === selectedParty);
            if (!candidate) return;

            // 1. Trigger Local USB Scanner Capture to Sign the Vote
            const fingerprintTemplate = await captureFingerprintFromDevice();

            // 2. Send Exact Face + Scanner Template to backend
            const res = await api.post('/vote', {
                voter_id: user.voter_id,
                district_id: user.district,
                party_id: candidate.party_name, // Backend expects party_id (names acting as IDs for now)
                face_image: faceImage,
                fingerprint_template: fingerprintTemplate
            });

            if (res.data.status === 'success') {
                setVoteSuccess(true);
            }

        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Voting Failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (voteSuccess) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl text-center border border-emerald-500/30">
                    <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-white mb-2">Vote Cast Successfully!</h1>
                    <p className="text-slate-400 mb-8">Your vote has been securely recorded on the blockchain.</p>
                    <button onClick={handleLogout} className="px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition font-bold">
                        Logout Securely
                    </button>
                </div>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold text-red-500 mb-4 text-center">Election Inactive</h1>
                <p className="text-slate-400 text-center mb-8">Please wait for the Auditor to start the election.</p>
                <button onClick={handleLogout} className="px-6 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition font-bold">
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Vote className="text-blue-500" /> Voting Terminal
                    </h1>
                    <p className="text-slate-400 text-sm">District: {user?.district} | Voter: {user?.voter_id}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded hover:bg-red-500/20 hover:text-red-400 transition font-bold">
                    <LogOut size={16} /> Quit
                </button>
            </header>

            <UserProfile user={user} />

            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: District Candidates */}
                <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-fit">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">1. Select Representative</h2>
                    <div className="space-y-4">
                        {candidates.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No candidates registered for District {user?.district}</p>
                        ) : (
                            candidates.map(candidate => (
                                <button
                                    key={candidate.representative_id}
                                    onClick={() => setSelectedParty(candidate.representative_id)}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${selectedParty === candidate.representative_id
                                        ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transform scale-[1.02]'
                                        : 'bg-slate-900/50 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-2xl shadow-inner">
                                            {candidate.party_symbol}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-white font-bold text-lg">{candidate.party_name}</h3>
                                            <p className="text-slate-400 text-sm">{candidate.name}</p>
                                        </div>
                                    </div>
                                    {selectedParty === candidate.representative_id && <CheckCircle className="text-blue-400" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Biometric Verification & Voting */}
                <div className={`transition-opacity duration-300 ${selectedParty ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 h-fit">
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2 flex items-center gap-2">
                            <Lock size={20} className="text-emerald-500" /> 2. Verify Exact Biometrics
                        </h2>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Live Face Camera */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Camera size={16} className="text-blue-400" /> Face Verification
                                </label>
                                <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video border border-slate-700 flex items-center justify-center">
                                    {!isCameraOn && !faceImage ? (
                                        <button
                                            onClick={() => setIsCameraOn(true)}
                                            className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded shadow transition font-bold"
                                        >
                                            Enable Camera
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
                                                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition font-bold"
                                            >
                                                Capture
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <img src={faceImage} alt="Face" className="w-full h-full object-cover" />
                                            <button
                                                onClick={retake}
                                                className="absolute top-2 right-2 p-2 bg-slate-800/80 text-white rounded-full hover:bg-red-500 transition"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleVote}
                                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transform hover:scale-[1.02]"
                            >
                                <Fingerprint size={20} /> Trigger Device Sensor & Vote
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
