import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Shield, CheckCircle, XCircle, Clock, Search, Filter, AlertCircle, Info, User, ArrowRight, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const Governance = () => {
    const [pendingChanges, setPendingChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPendingChanges();
    }, []);

    const fetchPendingChanges = async () => {
        try {
            const { data } = await api.get('/governance/pending');
            setPendingChanges(data || []);
        } catch (error) {
            toast.error('Failed to fetch pending changes');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action, type) => {
        const reason = window.prompt(`Enter reason for ${action}:`);
        if (reason === null) return;

        try {
            await api.post('/governance/act', { id, action, approval_reason: reason, type });
            toast.success(`Change ${action} successfully`);
            fetchPendingChanges();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const renderChangeDetails = (change) => {
        try {
            const payload = typeof change.new_value === 'string'
                ? JSON.parse(change.new_value)
                : change.new_value;

            if (change.type === 'ATTENDANCE') {
                return (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100/20">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600/50 uppercase tracking-widest leading-none mb-1">Proposed Correction</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">
                                {payload.status}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                                {payload.clock_in} — {payload.clock_out || '??:??'}
                            </p>
                        </div>
                        <div className="space-y-1 border-l border-blue-100/30 pl-4">
                            <p className="text-[10px] font-black text-blue-600/50 uppercase tracking-widest leading-none mb-1">Current State</p>
                            <p className="text-sm font-black text-slate-400 leading-tight uppercase line-through">{change.old_value}</p>
                        </div>
                    </div>
                );
            }

            if (change.type === 'LEAVE') {
                return (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/20">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1">Duration</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">
                                {new Date(payload.start_date).toLocaleDateString()} — {new Date(payload.end_date).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">{payload.no_of_days} Day(s) • {payload.is_unpaid ? 'Unpaid' : 'Paid'}</p>
                        </div>
                        <div className="space-y-1 border-l border-emerald-100/30 pl-4">
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1">Leave Category</p>
                            <p className="text-sm font-black text-slate-900 leading-tight uppercase">{change.field_name}</p>
                        </div>
                    </div>
                );
            }

            if (change.type === 'LOAN') {
                return (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100/20">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600/50 uppercase tracking-widest leading-none mb-1">Principal Amount</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">
                                LKR {(Number(payload.total_amount) || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">{(payload.num_installments || 0)} Installments of LKR {(Number(payload.installment_amount) || 0).toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 border-l border-blue-100/30 pl-4">
                            <p className="text-[10px] font-black text-blue-600/50 uppercase tracking-widest leading-none mb-1">Loan Identity</p>
                            <p className="text-sm font-black text-slate-900 leading-tight uppercase">Staff Loan Record</p>
                        </div>
                    </div>
                );
            }

            if (change.type === 'FINANCIAL') {
                const entries = Array.isArray(payload) ? payload : [];
                const isAdvance = change.field_name === 'Salary Advance';

                return (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                {isAdvance ? '💸 Salary Advance Request' : '⛽ Fuel Allowance Request'} ({entries.length} Employees)
                            </p>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {entries.map((entry, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-4 border rounded-2xl transition-all shadow-sm ${isAdvance ? 'bg-emerald-50/20 border-emerald-100/50' : 'bg-blue-50/20 border-blue-100/50'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isAdvance ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {entry.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 leading-tight">{entry.name || `ID: ${entry.employee_id}`}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {entry.employee_id} {entry.liters ? `• ${entry.liters} Liters` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Proposed Amount</p>
                                        <p className={`text-sm font-black ${isAdvance ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            LKR {(Number(entry.amount) || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            if (change.type === 'PERFORMANCE') {
                return (
                    <div className="mt-4 p-5 bg-amber-50/30 rounded-2xl border border-amber-100/20">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest leading-none mb-1">Performance Month</p>
                                <p className="text-sm font-black text-slate-900 uppercase">{payload.month}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest leading-none mb-1">Proposed Amount</p>
                                <p className="text-lg font-black text-amber-600 tracking-tight">LKR {(Number(payload.amount) || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                );
            }

            if (change.type === 'RESIGNATION') {
                return (
                    <div className="mt-4 p-5 bg-rose-50/30 rounded-2xl border border-rose-100/20">
                        <p className="text-[10px] font-black text-rose-600/50 uppercase tracking-widest leading-none mb-1">Proposed Effective Date</p>
                        <p className="text-sm font-black text-slate-900">{new Date(payload.desired_last_day).toLocaleDateString()}</p>
                    </div>
                );
            }

            if (change.field_name === 'MULTIPLE_COMPONENTS') {
                return (
                    <div className="mt-4 space-y-3">
                        {payload.map((comp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:shadow-xl transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                                        #{comp.component_id}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Proposed Modification</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-900 uppercase">Comp: {comp.component_id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">New Amount</p>
                                        <p className="text-sm font-black text-slate-900">LKR {(Number(comp.amount) || 0).toLocaleString()}</p>
                                    </div>
                                    {(comp.quantity > 0 || String(comp.component_id) === '109') && (
                                        <div className="text-right border-l border-slate-200 pl-8">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Qty</p>
                                            <p className="text-sm font-black text-blue-600">{comp.quantity || 0}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-3 gap-6 mt-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight">LKR {Number(payload.amount).toLocaleString()}</p>
                    </div>
                    {(payload.quantity > 0) && (
                        <div className="space-y-1 border-x border-slate-200 px-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity / Liters</p>
                            <p className="text-lg font-black text-blue-600 tracking-tight">{(payload.quantity || 0)}L</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">Standard Fixed Component</p>
                    </div>
                </div>
            );
        } catch (e) {
            return (
                <p className="text-sm font-medium text-slate-500 mt-2">
                    New Value: {typeof change.new_value === 'object' ? JSON.stringify(change.new_value) : String(change.new_value)}
                </p>
            );
        }
    };

    const filteredChanges = pendingChanges.filter(c =>
        c.requester_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.field_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans antialiased pb-32">
            <Navbar />

            {/* Header Section */}
            <div className="relative overflow-hidden bg-slate-950 pt-32 pb-64 px-4 sm:px-6 lg:px-8 text-white">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative max-w-7xl mx-auto z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
                                <Shield size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Request Approvals</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
                                Pending <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-100 italic">Approvals</span>
                            </h1>
                            <p className="max-w-xl text-slate-400 font-medium text-lg leading-relaxed">
                                Review and authorize sensitive fixed component modifications before they are applied.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-3xl p-3 border border-white/5 rounded-[2rem] w-full md:w-96 group focus-within:border-blue-500/30 transition-all">
                            <Search className="text-white/20 ml-3" size={20} />
                            <input
                                type="text"
                                placeholder="Search by requester or entity..."
                                className="bg-transparent border-none outline-none text-sm font-bold w-full text-white placeholder:text-white/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40">
                {loading ? (
                    <div className="bg-white rounded-[3rem] p-32 shadow-2xl flex flex-col items-center justify-center gap-6">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Loading Approvals...</p>
                    </div>
                ) : filteredChanges.length === 0 ? (
                    <div className="bg-white rounded-[4rem] p-24 shadow-2xl border border-slate-50 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                            <CheckCircle size={64} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">No Pending Approvals</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto">All modification requests have been processed.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="flex items-center justify-between mb-8 px-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Queue ({filteredChanges.length})</h2>
                            </div>
                        </div>

                        {filteredChanges.map((change) => (
                            <div key={change.id} className="group bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 hover:border-blue-100 transition-all relative overflow-hidden">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${change.type === 'SALARY' ? 'bg-indigo-500 shadow-indigo-200' :
                                            change.type === 'LEAVE' ? 'bg-emerald-500 shadow-emerald-200' :
                                                change.type === 'LOAN' ? 'bg-blue-500 shadow-blue-200' :
                                                    change.type === 'FINANCIAL' ? 'bg-amber-500 shadow-amber-200' :
                                                        change.type === 'PERFORMANCE' ? 'bg-amber-600 shadow-amber-200' :
                                                            'bg-rose-500 shadow-rose-200'
                                            }`}>
                                            {change.type === 'SALARY' && <Filter size={20} />}
                                            {change.type === 'LEAVE' && <Clock size={20} />}
                                            {change.type === 'LOAN' && <Shield size={20} />}
                                            {change.type === 'FINANCIAL' && <AlertCircle size={20} />}
                                            {change.type === 'PERFORMANCE' && <Trophy size={20} />}
                                            {change.type === 'RESIGNATION' && <XCircle size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Request Type</p>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{change.type} Request</h3>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${change.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        change.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                        {change.status}
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subject / Employee</p>
                                                <p className="text-sm font-black text-blue-600 uppercase italic">
                                                    {change.target_name || change.requester_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4 border-l-2 border-slate-100 pl-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Requested By</p>
                                                <p className="text-xs font-bold text-slate-500">{change.requester_name}</p>
                                            </div>
                                        </div>
                                        {change.reason && (
                                            <div className="bg-slate-50 rounded-2xl p-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Justification</p>
                                                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{change.reason}"</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-4">Modification Details</p>
                                        {renderChangeDetails(change)}
                                    </div>
                                </div>

                                {change.status === 'Pending' && (
                                    <div className="mt-8 flex items-center justify-end gap-4 border-t border-slate-100 pt-8">
                                        <button
                                            onClick={() => handleAction(change.id, 'Reject', change.type)}
                                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-colors"
                                        >
                                            Reject Request
                                        </button>
                                        <button
                                            onClick={() => handleAction(change.id, 'Approve', change.type)}
                                            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-200 transition-all flex items-center gap-2 group/btn"
                                        >
                                            Authorize Change
                                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Governance;