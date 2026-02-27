import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { UserPlus, Users, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UserManager({ admin }) {
    const adminId = admin?.voter_id;
    const isAuditor = admin?.role === 'Auditor';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [newUser, setNewUser] = useState({
        aadhaar: '',
        first_name: '',
        last_name: '',
        district_id: isAuditor ? admin.district : '',
        voter_id: '',
        role: 'Voter',
        password: '',
    });

    useEffect(() => {
        if (adminId) {
            fetchUsers();
        }
    }, [adminId]);

    const fetchUsers = async () => {
        try {
            const res = await api.getManagedUsers(adminId);
            setUsers(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setError('');
        setMessage('');
        try {
            const res = await api.syncDataset(adminId);
            setMessage(res.data.message);
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to sync dataset');
        } finally {
            setSyncing(false);
        }
    };

    const handleChange = (e) => {
        setNewUser({ ...newUser, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const payload = { ...newUser, admin_id: adminId };
            await api.addManagedUser(payload);
            setMessage('User created in master dataset. They can now register biometrics.');
            setNewUser({
                aadhaar: '',
                first_name: '',
                last_name: '',
                district_id: isAuditor ? admin.district : '',
                voter_id: '',
                role: 'Voter',
                password: '',
            });
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to create user');
        }
    };

    const handleDelete = async (voterId) => {
        if (!window.confirm(`Delete user ${voterId}?`)) return;
        setError('');
        setMessage('');
        try {
            await api.deleteManagedUser(adminId, voterId);
            setMessage(`User ${voterId} deleted successfully.`);
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to delete user');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Sync Action */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#143250]">User & Auditor Management</h2>
                        <p className="text-sm text-gray-500 font-medium">Manage eligible voters and system auditors</p>
                    </div>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing || isAuditor}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${syncing || isAuditor
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed hidden md:flex opacity-50'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md active:scale-95'
                        }`}
                    title={isAuditor ? "Only Admins can run massive dataset syncs." : "Sync from dataset"}
                >
                    <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Refresh from Dataset'}
                </button>
            </div>

            {/* Status Messages */}
            {message && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-bold">{message}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add User Form */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="text-lg font-bold text-[#143250] mb-6 flex items-center gap-2">
                        <UserPlus size={20} className="text-emerald-500" /> Manual Entry
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">First Name</label>
                                <input type="text" name="first_name" placeholder="Akash" value={newUser.first_name} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">Last Name</label>
                                <input type="text" name="last_name" placeholder="Singh" value={newUser.last_name} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase ml-1">Aadhaar (12 digits)</label>
                            <input type="text" name="aadhaar" placeholder="123456789012" value={newUser.aadhaar} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">District ID {isAuditor && '(Locked)'}</label>
                                <input type="text" name="district_id" placeholder="234" value={newUser.district_id} onChange={handleChange} required disabled={isAuditor} className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none ${isAuditor ? 'text-gray-400 cursor-not-allowed font-bold' : 'text-gray-800'}`} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">Role {isAuditor && '(Locked)'}</label>
                                <select name="role" value={newUser.role} onChange={handleChange} disabled={isAuditor} className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none ${isAuditor ? 'text-gray-400 cursor-not-allowed font-bold' : 'text-gray-800 appearance-none cursor-pointer'}`}>
                                    <option value="Voter">Voter</option>
                                    {!isAuditor && <option value="Auditor">Auditor</option>}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black text-gray-400 uppercase ml-1">Voter ID</label>
                            <input type="text" name="voter_id" placeholder="AAA999999" value={newUser.voter_id} onChange={handleChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none uppercase" />
                        </div>
                        <button type="submit" className="w-full bg-[#143250] hover:bg-[#1f4a9b] text-white font-black py-4 rounded-xl transition-all shadow-md active:scale-95 mt-2">
                            Add to Master List
                        </button>
                    </form>
                </div>

                {/* User Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="text-lg font-bold text-[#143250] mb-6 flex items-center gap-2">
                        <List size={20} className="text-blue-500" /> Authorized User List
                    </h3>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                                <p className="text-gray-400 font-bold">Loading users...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">District</th>
                                        <th className="px-4 py-3">Aadhaar</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#143250]">{u.first_name} {u.last_name}</span>
                                                    <span className="text-[10px] font-black text-gray-400 tracking-tighter uppercase">{u.voter_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${u.role === 'Admin' ? 'bg-purple-50 text-purple-600' :
                                                    u.role === 'Auditor' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-black text-gray-500">{u.district_id}</td>
                                            <td className="px-4 py-4 font-mono text-gray-400">XXXX-XXXX-{u.aadhaar.slice(-4)}</td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(u.voter_id)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-12 text-center text-gray-400 font-bold">
                                                No eligible voter/auditor records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Dummy List icon if not imported
import { List as ListIcon } from 'lucide-react';
const List = ListIcon;
