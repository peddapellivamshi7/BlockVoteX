import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Users, Trash2, PlusCircle } from 'lucide-react';

export default function RepresentativeManager() {
    const [reps, setReps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRep, setNewRep] = useState({
        representative_id: '',
        name: '',
        party_name: '',
        party_symbol: '',
        district_id: ''
    });

    useEffect(() => {
        fetchReps();
    }, []);

    const fetchReps = async () => {
        try {
            const res = await api.getRepresentatives();
            setReps(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch representatives", error);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setNewRep({ ...newRep, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.addRepresentative(newRep);
            setNewRep({ representative_id: '', name: '', party_name: '', party_symbol: '', district_id: '' });
            fetchReps();
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to add representative");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this representative?")) return;
        try {
            await api.deleteRepresentative(id);
            fetchReps();
        } catch (error) {
            alert("Failed to delete representative");
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-blue-500/30 shadow-lg mt-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Users className="text-blue-500" /> Manage Representatives
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Representative Form */}
                <div className="lg:col-span-1 bg-slate-900 p-4 rounded-lg border border-slate-700 h-fit">
                    <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <PlusCircle size={18} className="text-green-500" /> Add Candidate
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="text" name="representative_id" placeholder="ID (e.g. BJP-234)" value={newRep.representative_id} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="name" placeholder="Candidate Name" value={newRep.name} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="party_name" placeholder="Party Name" value={newRep.party_name} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="party_symbol" placeholder="Party Symbol Emoji" value={newRep.party_symbol} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="district_id" placeholder="District ID (e.g. 234)" value={newRep.district_id} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition">
                            Save Candidate
                        </button>
                    </form>
                </div>

                {/* List of Representatives */}
                <div className="lg:col-span-2 overflow-x-auto">
                    {loading ? (
                        <p className="text-slate-400">Loading candidates...</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-2">District</th>
                                    <th className="p-2">ID</th>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Party</th>
                                    <th className="p-2">Symbol</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reps.map((rep) => (
                                    <tr key={rep.representative_id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                                        <td className="p-2 text-green-400 font-bold">{rep.district_id}</td>
                                        <td className="p-2 text-slate-300">{rep.representative_id}</td>
                                        <td className="p-2 text-white">{rep.name}</td>
                                        <td className="p-2 text-slate-300">{rep.party_name}</td>
                                        <td className="p-2 text-xl">{rep.party_symbol}</td>
                                        <td className="p-2">
                                            <button onClick={() => handleDelete(rep.representative_id)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {reps.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-4 text-center text-slate-500">No candidates registered.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
