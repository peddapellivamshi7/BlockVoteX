import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Bell, Trash2, Send } from 'lucide-react';

export default function NotificationManager() {
    const [message, setMessage] = useState('');
    const [activeNotification, setActiveNotification] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.getActiveNotification();
            setActiveNotification(res.data.message);
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    const handlePublish = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        try {
            await api.createNotification({ message });
            setMessage('');
            fetchData();
        } catch (error) {
            alert("Failed to publish notification");
        }
    };

    const handleClear = async () => {
        if (!window.confirm("Clear active notification?")) return;
        try {
            await api.clearNotifications();
            fetchData();
        } catch (error) {
            alert("Failed to clear notification");
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-[#143250] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#143250] text-white rounded-xl flex items-center justify-center">
                    <Bell size={20} />
                </div>
                Live Notifications
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Broadcast New Alert</h3>
                    <form onSubmit={handlePublish} className="space-y-4">
                        <textarea
                            placeholder="Enter announcement to broadcast to all Voter Dashboards..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-[#143250] focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-none"
                        ></textarea>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all flex justify-center items-center gap-2">
                            <Send size={18} /> Publish to Voters
                        </button>
                    </form>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Currently Active Alert</h3>
                    {activeNotification ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 relative">
                            <div className="absolute top-4 right-4">
                                <button onClick={handleClear} className="text-amber-700 hover:bg-amber-100 p-2 rounded-lg transition-colors" title="Clear Notification">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <Bell className="text-amber-500 mt-1 shrink-0" size={24} />
                                <div>
                                    <h4 className="font-black text-amber-900 mb-2 mt-1">Live Broadcast Running</h4>
                                    <p className="text-sm font-semibold text-amber-800 leading-relaxed pr-8">
                                        "{activeNotification}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center h-[180px]">
                            <Bell className="text-gray-300 mb-2" size={32} />
                            <p className="text-gray-400 font-bold">No active notifications broadcasting.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
