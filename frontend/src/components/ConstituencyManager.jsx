import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Map, Trash2, PlusCircle } from 'lucide-react';

export default function ConstituencyManager() {
    const [constituencies, setConstituencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDistrict, setNewDistrict] = useState({ district_id: '', region_name: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.getConstituencies();
            setConstituencies(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load constituencies", error);
        }
    };

    const handleChange = (e) => {
        setNewDistrict({ ...newDistrict, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.addConstituency(newDistrict);
            setNewDistrict({ district_id: '', region_name: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to add constituency");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this constituency?")) return;
        try {
            await api.deleteConstituency(id);
            fetchData();
        } catch (error) {
            alert("Failed to delete constituency");
        }
    };

    if (loading) return <div className="text-center py-10">Loading constituencies...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-[#143250] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#143250] text-white rounded-xl flex items-center justify-center">
                    <Map size={20} />
                </div>
                Constituency Management
            </h2>

            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">District ID</label>
                    <input type="text" name="district_id" placeholder="e.g. 234" value={newDistrict.district_id} onChange={handleChange} required className="w-full bg-white border border-gray-300 shadow-sm rounded-lg p-3 text-sm font-bold text-[#143250]" />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Region Name</label>
                    <input type="text" name="region_name" placeholder="City or Zone name" value={newDistrict.region_name} onChange={handleChange} required className="w-full bg-white border border-gray-300 shadow-sm rounded-lg p-3 text-sm font-bold text-[#143250]" />
                </div>
                <button type="submit" className="bg-[#143250] hover:bg-[#1f4a9b] text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 h-fit">
                    <PlusCircle size={18} /> Add Region
                </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-white uppercase bg-[#143250]">
                        <tr>
                            <th className="px-6 py-4">District ID</th>
                            <th className="px-6 py-4">Region Name</th>
                            <th className="px-6 py-4 text-center">Registered Users</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {constituencies.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-bold">No constituencies configured.</td>
                            </tr>
                        ) : (
                            constituencies.map((c) => (
                                <tr key={c.district_id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-black text-[#143250]">#{c.district_id}</td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{c.region_name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-xs">
                                            {c.user_count} Users
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(c.district_id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-block">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
