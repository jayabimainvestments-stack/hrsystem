import { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Search, Filter, Calendar, History, Download, ExternalLink, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        module: '',
        dateFrom: '',
        dateTo: ''
    });

    const { user } = useAuth();

    useEffect(() => {
        if (user?.role === 'Admin') {
            fetchLogs();
        }
    }, [user?.role]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const res = await api.get(`/audit/logs?${params.toString()}`);
            setLogs(res.data);
        } catch (error) {
            console.error("Error fetching audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    if (user?.role !== 'Admin') return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 max-w-sm">
                <Shield className="mx-auto text-red-100 mb-6" size={64} />
                <h2 className="text-2xl font-black text-slate-800 mb-2 underline decoration-red-500/20 decoration-4">Security Alert</h2>
                <p className="text-slate-500 font-medium">Access to system-wide audit logs is restricted to top-level administrators only.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <History className="text-blue-600" size={32} /> Immutable Ledger
                        </h1>
                        <p className="text-slate-500 font-medium">System-wide forensic activity and change tracking</p>
                    </div>
                    <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                        <Download size={18} /> Export Forensic Data
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-10 overflow-x-auto">
                    <div className="flex flex-wrap gap-4 min-w-max md:min-w-0">
                        <div className="flex-1 min-w-[150px] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                name="user"
                                value={filters.user}
                                onChange={handleFilterChange}
                                placeholder="Actor/User ID"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-sm"
                            />
                        </div>
                        <select
                            name="module"
                            value={filters.module}
                            onChange={handleFilterChange}
                            className="flex-1 min-w-[150px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none"
                        >
                            <option value="">All Modules</option>
                            <option value="Employee">Employee</option>
                            <option value="Payroll">Payroll</option>
                            <option value="Auth">Security/Auth</option>
                            <option value="Attendance">Attendance</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                name="dateFrom"
                                value={filters.dateFrom}
                                onChange={handleFilterChange}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm"
                            />
                            <span className="text-slate-300 font-black">→</span>
                            <input
                                type="date"
                                name="dateTo"
                                value={filters.dateTo}
                                onChange={handleFilterChange}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm"
                            />
                        </div>
                        <button onClick={fetchLogs} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all">Filter</button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor</th>
                                    <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Module</th>
                                    <th className="px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center text-slate-400 italic">Decrypting ledger logs...</td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center text-slate-400 italic">No activity recorded for this criteria.</td>
                                    </tr>
                                ) : logs.map(log => (
                                    <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                        <td className="px-4 py-4 text-xs text-slate-400 font-medium whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">{log.user_name?.charAt(0) || 'S'}</div>
                                                <span className="text-xs font-bold text-slate-900 leading-tight">{log.user_name || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                                log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                                                log.action === 'UPDATE' || log.action?.includes('UPDATE') ? 'bg-blue-50 text-blue-600' :
                                                log.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                                                log.action?.includes('GOVERNANCE') ? 'bg-purple-50 text-purple-600' :
                                                log.action?.includes('LEAVE') ? 'bg-amber-50 text-amber-600' :
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-slate-500 font-medium">{log.module}</td>
                                        <td className="px-4 py-4 text-xs text-slate-600 font-medium max-w-[180px] truncate">{log.description}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                                className="p-2 rounded-xl text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            ><ExternalLink size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 p-10 bg-blue-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
                    <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>
                    <div className="flex-1 relative z-10">
                        <Activity className="text-blue-400 mb-4" size={32} />
                        <h3 className="text-xl font-black mb-2">Real-time Anomaly Detection</h3>
                        <p className="text-blue-200 text-sm font-medium leading-relaxed max-w-lg">Our system continuously monitors these logs for unauthorized access patterns. Any detected anomalies are flagged and sent to system security officers immediately.</p>
                    </div>
                    <div className="bg-white/10 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm relative z-10 text-center min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1 leading-none">Total Logs (24h)</p>
                        <p className="text-4xl font-black leading-none">{logs.length}</p>
                    </div>
                </div>
            </main>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 bg-slate-950 text-white flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Forensic Detail</p>
                                <h2 className="text-xl font-black uppercase tracking-tight">{selectedLog.action}</h2>
                                <p className="text-slate-300 text-xs mt-1">{selectedLog.module} · {new Date(selectedLog.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Actor</p>
                                    <p className="font-bold text-slate-900 text-sm">{selectedLog.user_name || 'System'}</p>
                                    <p className="text-[10px] text-slate-400">{selectedLog.user_email || ''}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IP Address</p>
                                    <p className="font-bold text-slate-900 text-sm font-mono">{selectedLog.ip_address || '—'}</p>
                                </div>
                            </div>
                            {selectedLog.new_values && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">New Values</p>
                                    <pre className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs font-mono text-emerald-900 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                                </div>
                            )}
                            {selectedLog.old_values && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Old Values</p>
                                    <pre className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs font-mono text-rose-900 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                                </div>
                            )}
                            {!selectedLog.new_values && !selectedLog.old_values && (
                                <p className="text-slate-400 italic text-sm text-center py-8">No detailed payload recorded for this action.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogViewer;
