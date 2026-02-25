import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { loginOptions, loginVerify, registerOptions, registerVerify } from '../services/api';
import { User, Lock, Fingerprint, Camera, RefreshCw } from 'lucide-react';
import Webcam from 'react-webcam';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(location.state?.isRegister ? false : true);
    const [formData, setFormData] = useState({ voter_id: '', aadhaar: '' });
    const [faceImage, setFaceImage] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [error, setError] = useState('');
    const webcamRef = useRef(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const capture = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFaceImage(imageSrc);
        setIsCameraOn(false);
    };

    const retake = () => setFaceImage(null);

    const handleRegister = async () => {
        if (!faceImage) { setError("Please capture your face!"); return; }

        try {
            setError('');
            const { data: options } = await registerOptions(formData);
            const registrationResponse = await startRegistration(options);

            await registerVerify({
                ...formData,
                face_image: faceImage,
                registration_response: registrationResponse
            });

            alert('Registration Successful!');
            setIsLogin(true);
            setFaceImage(null);

        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Registration Failed');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!faceImage) { setError("Please capture your face!"); return; }

        try {
            setError('');
            const { data: options } = await loginOptions(formData);
            const authenticationResponse = await startAuthentication(options);

            const res = await loginVerify({
                ...formData,
                face_image: faceImage,
                authentication_response: authenticationResponse
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">

            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-white rounded-full p-0.5 shadow-md overflow-hidden border border-gray-100">
                        <img src="/banner.png" alt="ECI Logo" className="w-full h-full object-cover scale-150" />
                    </div>
                    <h1 className="text-2xl font-black flex justify-center gap-1">
                        <span className="text-[#f08c3a]">Voters'</span>
                        <span className="text-[#143250]">Services</span>
                        <span className="text-pink-500">Portal</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Election Commission of India</p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-300 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-semibold">
                        {error}
                    </div>
                )}

                <form onSubmit={isLogin ? handleLogin : (e) => { e.preventDefault(); handleRegister(); }} className="space-y-6">

                    <div className="space-y-4">

                        <div className="relative">
                            <User className="absolute left-3 top-3 text-purple-400" size={20} />
                            <input
                                name="voter_id"
                                type="text"
                                required
                                placeholder="Voter ID"
                                className="w-full bg-purple-50 text-gray-800 rounded-lg pl-10 pr-4 py-3 border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                onChange={handleChange}
                                value={formData.voter_id}
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-purple-400" size={20} />
                            <input
                                name="aadhaar"
                                type="text"
                                required
                                placeholder="Aadhaar Number"
                                className="w-full bg-purple-50 text-gray-800 rounded-lg pl-10 pr-4 py-3 border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                onChange={handleChange}
                                value={formData.aadhaar}
                            />
                        </div>

                    </div>

                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl space-y-4">

                        <h3 className="text-sm font-bold text-purple-600 flex items-center gap-2">
                            <Camera size={16} /> Face Verification
                        </h3>

                        <div className="relative rounded-lg overflow-hidden bg-black/10 aspect-video flex items-center justify-center">

                            {!isCameraOn && !faceImage ? (
                                <button
                                    type="button"
                                    onClick={() => setIsCameraOn(true)}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-full shadow hover:scale-105 transition"
                                >
                                    Enable Camera
                                </button>
                            ) : isCameraOn ? (
                                <>
                                    <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={capture}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-pink-500 text-white rounded-full shadow hover:scale-105 transition"
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
                                        className="absolute top-2 right-2 p-2 bg-white text-purple-600 rounded-full shadow hover:bg-red-100"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </>
                            )}

                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-full shadow hover:scale-105 transition"
                    >
                        <Fingerprint size={20} />
                        {isLogin ? 'Login' : 'Register'}
                    </button>

                </form>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); setFaceImage(null); }}
                        className="text-pink-500 font-bold hover:underline"
                    >
                        {isLogin ? 'Register Here' : 'Login Here'}
                    </button>
                </p>

            </div>
        </div>
    );
}