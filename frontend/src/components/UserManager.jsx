import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import { UserPlus, Users, Trash2 } from 'lucide-react';

export default function UserManager({ adminId }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [newUser, setNewUser] = useState({
        aadhaar: '',
        first_name: '',
        last_name: '',
        district_id: '',
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
                district_id: '',
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
        <div className="bg-slate-800 p-6 rounded-xl border border-emerald-500/30 shadow-lg mt-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Users className="text-emerald-500" /> Manage Voters & Auditors
            </h2>

            {message && <div className="mb-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded">{message}</div>}
            {error && <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-3 rounded">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-900 p-4 rounded-lg border border-slate-700 h-fit">
                    <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <UserPlus size={18} className="text-emerald-500" /> Add User
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="text" name="first_name" placeholder="First Name" value={newUser.first_name} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="last_name" placeholder="Last Name" value={newUser.last_name} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="aadhaar" placeholder="Aadhaar (12 digits)" value={newUser.aadhaar} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="district_id" placeholder="District ID (e.g. 234)" value={newUser.district_id} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <input type="text" name="voter_id" placeholder="Voter ID (AAA999999)" value={newUser.voter_id} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm uppercase" />
                        <select name="role" value={newUser.role} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm">
                            <option value="Voter">Voter</option>
                            <option value="Auditor">Auditor</option>
                        </select>
                        <input type="text" name="password" placeholder="Password (optional)" value={newUser.password} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded transition">
                            Create User
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 overflow-x-auto">
                    {loading ? (
                        <p className="text-slate-400">Loading users...</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700">
                                    <th className="p-2">ID</th>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Role</th>
                                    <th className="p-2">District</th>
                                    <th className="p-2">Voter ID</th>
                                    <th className="p-2">Aadhaar</th>
                                    <th className="p-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                                        <td className="p-2 text-slate-300">{u.id}</td>
                                        <td className="p-2 text-white">{u.first_name} {u.last_name}</td>
                                        <td className="p-2 text-blue-300">{u.role}</td>
                                        <td className="p-2 text-green-400 font-bold">{u.district_id}</td>
                                        <td className="p-2 text-slate-200">{u.voter_id}</td>
                                        <td className="p-2 text-slate-400">{u.aadhaar}</td>
                                        <td className="p-2">
                                            <button
                                                onClick={() => handleDelete(u.voter_id)}
                                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition"
                                                title="Delete user"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-4 text-center text-slate-500">No voter/auditor records found.</td>
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
