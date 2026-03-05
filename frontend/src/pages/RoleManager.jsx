import { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, ShieldAlert, Users, Save, X, Edit2, Trash2, Plus } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const RoleManager = () => {
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [activeRole, setActiveRole] = useState(null);
    const [rolePermissions, setRolePermissions] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/security/roles'),
                api.get('/security/permissions')
            ]);
            setRoles(rolesRes.data);
            setAllPermissions(permsRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = (id) => {
        const newSet = new Set(rolePermissions);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setRolePermissions(newSet);
    };

    const handleSaveRole = async (e) => {
        e.preventDefault();
        const roleData = {
            ...activeRole,
            permissions: Array.from(rolePermissions)
        };

        try {
            if (activeRole.id) {
                await api.put(`/security/roles/${activeRole.id}`, roleData);
            } else {
                await api.post('/security/roles', roleData);
            }
            setActiveRole(null);
            fetchData();
        } catch (error) {
            alert('Failed to save role');
        }
    };

    const startEdit = (role) => {
        setActiveRole(role);
        setRolePermissions(new Set(role.permissions?.map(p => p.id) || []));
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Roles</h1>
                        <p className="text-slate-500 font-medium">Define access control and system permissions</p>
                    </div>
                    <button
                        onClick={() => { setActiveRole({ name: '', description: '' }); setRolePermissions(new Set()); }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
                    >
                        <Plus size={20} /> New Role
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Shield size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(role)} className="h-10 w-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"><Edit2 size={16} /></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">{role.name}</h3>
                            <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">{role.description}</p>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                <Users size={14} /> {role.permissions?.length || 0} Permissions
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {activeRole && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-widest">{activeRole.id ? 'Edit Role' : 'New Role'}</h2>
                                <p className="text-blue-100 font-medium">Define access control and permissions</p>
                            </div>
                            <button onClick={() => setActiveRole(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSaveRole} className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Name</label>
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                            placeholder="Administrator"
                                            value={activeRole.name}
                                            onChange={e => setActiveRole({ ...activeRole, name: e.target.value })}
                                            required
                                        />
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold h-32"
                                            placeholder="Description of access level..."
                                            value={activeRole.description}
                                            onChange={e => setActiveRole({ ...activeRole, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permissions</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-4 h-64 overflow-y-auto space-y-2">
                                            {allPermissions.map(p => (
                                                <label
                                                    key={p.id}
                                                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${rolePermissions.has(p.id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-white'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={rolePermissions.has(p.id)}
                                                        onChange={() => handleTogglePermission(p.id)}
                                                    />
                                                    <Shield size={16} />
                                                    <span className="text-xs font-bold">{p.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setActiveRole(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                        <Save size={18} /> Apply Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManager;
