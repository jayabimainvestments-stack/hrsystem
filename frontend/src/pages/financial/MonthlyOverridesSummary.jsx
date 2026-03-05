import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Table, Calendar, User, Search, Calculator, CheckCircle, Info, Zap, Trash2, Check, UserPlus } from 'lucide-react';

const MonthlyOverridesSummary = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmpForSnapshot, setSelectedEmpForSnapshot] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOverrides();
        fetchEmployees();
    }, [month]);

    const fetchOverrides = async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get(`/payroll/overrides?month=${month}`);
            setData(res || []);
        } catch (error) {
            console.error("Error fetching overrides", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees", error);
        }
    };

    const handleSnapshot = async () => {
        if (!selectedEmpForSnapshot) return alert('Please select an employee to snapshot.');
        try {
            await api.post('/payroll-settings/overrides/snapshot', {
                employeeId: selectedEmpForSnapshot,
                month: month
            });
            alert('Baseline data pulled as Draft. Please review and approve.');
            fetchOverrides();
        } catch (error) {
            alert(error.response?.data?.message || 'Snapshot failed');
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/payroll-settings/overrides/${id}/approve`);
            fetchOverrides();
        } catch (error) {
            alert('Approval failed');
        }
    };

    const handleBulkApprove = async () => {
        const empId = prompt("Enter Employee ID to bulk approve (optional) or leave blank for all in this month:");
        try {
            await api.post('/payroll-settings/overrides/bulk-approve', {
                employeeId: empId || null,
                month: month
            });
            alert('Bulk approval completed.');
            fetchOverrides();
        } catch (error) {
            alert('Bulk approval failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this override?')) return;
        try {
            await api.delete(`/payroll-settings/overrides/${id}`);
            fetchOverrides();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handlePurgeAll = async () => {
        if (!window.confirm('CRITICAL ACTION: This will delete ALL monthly overrides/snapshots for ALL employees in ALL months. Are you sure?')) return;
        if (!window.confirm('SECONDARY CONFIRMATION: This cannot be undone. All Draft and Approved items will be wiped.')) return;

        try {
            await api.delete('/payroll-settings/overrides/all');
            alert('System Reset: All monthly data purged.');
            fetchOverrides();
        } catch (error) {
            alert('Purge failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredData = data.filter(item =>
        item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.component_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const pendingCount = data.filter(d => d.status === 'Draft').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100 text-white">
                            <Table size={20} />
                        </div>
                        Monthly Payroll Overrides
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-wider">
                        Active overrides and temporary adjustments for {month}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="month"
                            className="pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Workflow Actions */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] -mr-24 -mt-24"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-emerald-400">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-black uppercase tracking-widest">Baseline Intelligence</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Mirror master salary setup to monthly staging</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <select
                                className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest outline-none focus:bg-white/10 transition-all min-w-[200px]"
                                value={selectedEmpForSnapshot}
                                onChange={(e) => setSelectedEmpForSnapshot(e.target.value)}
                            >
                                <option value="" className="text-slate-900">Select Employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id} className="text-slate-900">{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleSnapshot}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            Snapshot Baseline
                        </button>
                        <div className="h-10 w-px bg-white/10 mx-2"></div>
                        <button
                            onClick={handleBulkApprove}
                            className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Bulk Approve
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Adjustments</p>
                    <div className="flex items-center justify-between">
                        <h4 className="text-2xl font-black text-slate-900">LKR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Calculator size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending Approvals</p>
                    <div className="flex items-center justify-between">
                        <h4 className={`text-2xl font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{pendingCount}</h4>
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <Info size={18} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sync Status</p>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 font-bold text-sm ${pendingCount === 0 && data.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <CheckCircle size={18} /> {pendingCount === 0 && data.length > 0 ? 'Ready for Payroll' : 'Approvals Needed'}
                        </div>
                    </div>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-sm group hover:bg-rose-100 transition-all cursor-pointer" onClick={handlePurgeAll}>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Danger Zone</p>
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-rose-600 uppercase">Reset Staging</h4>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm group-hover:rotate-12 transition-transform">
                            <Trash2 size={18} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="Search employee or component..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none focus:border-emerald-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[10px] font-black uppercase tracking-widest">
                        <Info size={14} /> These values override permanent settings for this month only
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-20 text-center italic text-slate-400">Loading payroll overrides...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="p-20 text-center">
                            <p className="text-slate-400 font-medium italic">No overrides found for {month}.</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-300 mt-2">Approved fuel, performance, and manual entries will appear here.</p>
                        </div>
                    ) : (
                        <table className="w-full border-separate border-spacing-y-2 px-8 pb-8">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Component</th>
                                    <th className="px-6 py-4 text-center">Value</th>
                                    <th className="px-6 py-4 text-right">Amount (LKR)</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="space-y-3">
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} className={`group transition-all hover:scale-[1.01] ${item.status === 'Draft' ? 'bg-amber-50/30' : 'bg-slate-50/50'}`}>
                                        <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black text-slate-600 text-xs">
                                                    {item.employee_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm italic uppercase">{item.employee_name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase truncate max-w-[150px]">{item.reason || 'Manual'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 border-y border-slate-100 text-center">
                                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${item.status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white animate-pulse'
                                                }`}>
                                                {item.status || 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 border-y border-slate-100">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border ${item.component_name.toLowerCase().includes('fuel') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                item.component_name.toLowerCase().includes('performance') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    item.component_name.toLowerCase().includes('advance') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {item.component_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 border-y border-slate-100 text-center font-black text-slate-500 text-xs tabular-nums">
                                            {item.quantity && item.quantity !== '0' ? `${item.quantity}` : '-'}
                                        </td>
                                        <td className="px-6 py-5 border-y border-slate-100 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-slate-900 tabular-nums">LKR {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.status !== 'Approved' && (
                                                    <button
                                                        onClick={() => handleApprove(item.id)}
                                                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 bg-rose-50 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyOverridesSummary;

