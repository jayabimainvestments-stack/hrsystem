import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Shield, ShieldCheck, ShieldOff, Save } from 'lucide-react';

// Payroll-related permissions shown with their group labels
const PAYROLL_PERMISSION_GROUPS = {
    'Salary Configuration': ['MANAGE_SALARY_STRUCTURE'],
    'Payroll Processing': ['MANAGE_PAYROLL'],
    'HR Operations': ['MANAGE_EMPLOYEES', 'MANAGE_ATTENDANCE', 'APPROVE_LEAVE', 'MANAGE_DOCUMENTS'],
    'Reports': ['VIEW_ALL_REPORTS', 'EXPORT_REPORTS'],
};

const UserPermissionsModal = ({ user, rolePermissions = [], onClose, onSaved }) => {
    const [allPermissions, setAllPermissions] = useState([]);
    const [overrides, setOverrides] = useState({}); // { permission_id: true|false|null }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, [user]);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/security/users/${user.id}/permissions`);
            setAllPermissions(data);
            // Build initial override map
            const map = {};
            data.forEach(p => {
                if (p.user_override !== null) {
                    map[p.id] = p.user_override;
                }
            });
            setOverrides(map);
        } catch (e) {
            console.error('Failed to load user permissions', e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (permId, currentState, isRoleGranted) => {
        setOverrides(prev => {
            const newOverrides = { ...prev };
            if (currentState === true && isRoleGranted) {
                // Was explicitly granted, now revoke
                newOverrides[permId] = false;
            } else if (currentState === false) {
                // Was revoked, clear override (restore to role default)
                delete newOverrides[permId];
            } else if (currentState === true && !isRoleGranted) {
                // Was explicitly granted (not in role), remove grant
                delete newOverrides[permId];
            } else {
                // No override and role has it, add explicit grant or if role doesn't have it, grant
                newOverrides[permId] = true;
            }
            return newOverrides;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const overrideList = Object.entries(overrides).map(([permId, granted]) => ({
                permission_id: parseInt(permId),
                granted
            }));
            await api.put(`/security/users/${user.id}/permissions`, { overrides: overrideList });
            onSaved?.();
            onClose();
        } catch (e) {
            alert('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const getPermStatus = (perm) => {
        const isRoleGranted = rolePermissions.includes(perm.name);
        if (overrides[perm.id] === true) return 'granted'; // Explicitly granted
        if (overrides[perm.id] === false) return 'denied';  // Explicitly denied
        if (isRoleGranted) return 'role';                    // Inherited from role
        return 'none';                                       // Not available
    };

    const groupedPerms = PAYROLL_PERMISSION_GROUPS;
    const handledPerms = Object.values(groupedPerms).flat();
    const otherPerms = allPermissions.filter(p => !handledPerms.includes(p.name));

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-slate-950 text-white p-8 flex justify-between items-start rounded-t-[3rem]">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Shield size={20} className="text-blue-400" />
                            <h2 className="text-lg font-black uppercase tracking-[0.15em]">User Permissions</h2>
                        </div>
                        <p className="text-slate-400 text-xs font-bold">{user.name}</p>
                        <span className="mt-2 inline-block px-3 py-1 bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest rounded-full">
                            Role: {user.role}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Legend */}
                <div className="px-8 pt-5 pb-2 flex gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-emerald-600"><ShieldCheck size={12} /> Granted</span>
                    <span className="flex items-center gap-1.5 text-blue-500">● Role Default</span>
                    <span className="flex items-center gap-1.5 text-rose-500"><ShieldOff size={12} /> Denied</span>
                    <span className="flex items-center gap-1.5 text-slate-300">○ Not Available</span>
                </div>

                {/* Permissions */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                    {loading ? (
                        <div className="py-16 text-center text-slate-400">Loading...</div>
                    ) : (
                        <>
                            {Object.entries(groupedPerms).map(([groupName, groupPermNames]) => {
                                const groupPerms = allPermissions.filter(p => groupPermNames.includes(p.name));
                                if (groupPerms.length === 0) return null;
                                return (
                                    <div key={groupName}>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 pt-4 border-t border-slate-100">{groupName}</h3>
                                        <div className="space-y-2">
                                            {groupPerms.map(perm => {
                                                const status = getPermStatus(perm);
                                                const isRoleGranted = rolePermissions.includes(perm.name);
                                                return (
                                                    <button
                                                        key={perm.id}
                                                        onClick={() => handleToggle(perm.id, overrides[perm.id] ?? null, isRoleGranted)}
                                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${status === 'granted' ? 'border-emerald-200 bg-emerald-50' :
                                                                status === 'denied' ? 'border-rose-200 bg-rose-50' :
                                                                    status === 'role' ? 'border-blue-100 bg-blue-50' :
                                                                        'border-slate-100 bg-slate-50 opacity-60'
                                                            }`}
                                                    >
                                                        <div>
                                                            <p className={`font-black text-sm ${status === 'granted' ? 'text-emerald-700' :
                                                                    status === 'denied' ? 'text-rose-700' :
                                                                        status === 'role' ? 'text-blue-700' : 'text-slate-400'
                                                                }`}>{perm.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{perm.description}</p>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${status === 'granted' ? 'bg-emerald-500 text-white' :
                                                                status === 'denied' ? 'bg-rose-500 text-white' :
                                                                    status === 'role' ? 'bg-blue-500 text-white' :
                                                                        'bg-slate-200 text-slate-400'
                                                            }`}>
                                                            {status === 'granted' ? 'Granted' : status === 'denied' ? 'Denied' : status === 'role' ? 'Role' : 'None'}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50 rounded-b-[3rem]">
                    <button onClick={onClose} className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionsModal;
