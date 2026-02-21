import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { User, Lock, Fingerprint, Camera, RefreshCw } from 'lucide-react';
import Webcam from 'react-webcam';

// --- External Scanner Helper ---
const captureFingerprintFromDevice = async () => {
    try {
        // Contact the local background service running the SDK
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

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ voter_id: '', aadhaar: '' });
    const [faceImage, setFaceImage] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [error, setError] = useState('');
    const webcamRef = useRef(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const capture = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFaceImage(imageSrc);
        setIsCameraOn(false); // Turn off camera after capture
    };

    const retake = () => {
        setFaceImage(null);
    };

    // --- Registration Flow ---
    const handleRegister = async () => {
        if (!faceImage) { setError("Please capture your face!"); return; }

        try {
            setError('');

            // 1. Trigger Local USB Scanner Capture
            const fingerprintTemplate = await captureFingerprintFromDevice();

            // 2. Send Face + Scanner Template + Aadhaar
            await api.post('/auth/register/verify', {
                voter_id: formData.voter_id,
                aadhaar: formData.aadhaar,
                face_image: faceImage,
                fingerprint_template: fingerprintTemplate
            });

            alert('Registration Successful! External Device Fingerprint Saved.');
            setIsLogin(true);
            setFaceImage(null);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Registration Failed');
        }
    };

    // --- Login Flow ---
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            setError('');
            if (!faceImage) { setError("Please capture your face!"); return; }

            // 1. Trigger Local USB Scanner Capture
            const fingerprintTemplate = await captureFingerprintFromDevice();

            // 2. Verify Face + Scanner Template + Aadhaar against Server
            const res = await api.post('/auth/login/verify', {
                voter_id: formData.voter_id,
                aadhaar: formData.aadhaar,
                face_image: faceImage,
                fingerprint_template: fingerprintTemplate
            });

            const user = res.data.user;
            localStorage.setItem('user', JSON.stringify(user));

            if (user.role === 'Admin') navigate('/admin');
            else if (user.role === 'Auditor') navigate('/auditor');
            else navigate('/voter');

        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Login Failed');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        SecureVote
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Dynamic Device Biometrics</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-semibold">
                        {error}
                    </div>
                )}

                <form onSubmit={isLogin ? handleLogin : (e) => { e.preventDefault(); handleRegister(); }} className="space-y-6">
                    {/* Identity Inputs */}
                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                name="voter_id"
                                type="text"
                                required
                                placeholder="Voter ID"
                                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-3 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                onChange={handleChange}
                                value={formData.voter_id}
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                name="aadhaar"
                                type="text"
                                required
                                placeholder={isLogin ? "Aadhaar Number" : "Aadhaar Number (Master Verification)"}
                                className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-3 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                onChange={handleChange}
                                value={formData.aadhaar}
                            />
                        </div>
                    </div>

                    {/* Biometrics Section */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Camera size={16} className="text-blue-400" /> Primary Verification
                        </h3>

                        {/* Camera */}
                        <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video border border-slate-700 flex items-center justify-center">
                            {!isCameraOn && !faceImage ? (
                                <button
                                    type="button"
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
                                        type="button"
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
                                        type="button"
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
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg shadow-lg hover:from-blue-500 hover:to-emerald-500 transition-all transform hover:scale-[1.02]"
                    >
                        <Fingerprint size={20} />
                        {isLogin ? 'Trigger Device Sensor & Login' : 'Trigger Device Sensor & Register'}
                    </button>
                </form>

                <p className="mt-8 text-center text-slate-400 text-sm">
                    {isLogin ? "Don't have an identity?" : "Already registered?"}{' '}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); setFaceImage(null); }}
                        className="text-blue-400 font-bold hover:underline"
                    >
                        {isLogin ? 'Register Here' : 'Login Here'}
                    </button>
                </p>
            </div>
        </div>
    );
}
