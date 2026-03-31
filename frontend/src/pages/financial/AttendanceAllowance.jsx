import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
    Save, CheckCheck, Check, Calculator, AlertCircle, Clock, ShieldCheck, CheckCircle, XCircle, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { BASE_URL } from '../../services/api';

const AttendanceAllowance = () => {
    const { user } = useAuth();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(null); // empId being saved
    const [ignoring, setIgnoring] = useState(null);
    const [monthSummary, setMonthSummary] = useState(null);
    const [showIgnored, setShowIgnored] = useState(false);
    const [expandedEmp, setExpandedEmp] = useState(null);

    useEffect(() => {
        fetchDeductions();
    }, [month]);

    const fetchDeductions = async () => {
        setLoading(true);
        let data = [];
        try {
            const res = await api.get(`/manual-deductions?month=${month}`);
            data = res.data;
            setEmployees(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load deductions');
        } finally {
            setLoading(false);
            // Calculate summary
            if (data.length > 0) {
                const total = data.length;
                const processed = data.filter(e => e.status === 'Processed').length;
                setMonthSummary({
                    status: processed === 0 ? 'Pending' : (processed === total ? 'Transferred' : 'Partially Transferred'),
                    count: processed,
                    total
                });
            }
        }
    };

    const handleInputChange = (empId, field, value) => {
        setEmployees(prev => prev.map(emp => {
            if (emp.employee_id === empId) {
                return { ...emp, [field]: value };
            }
            return emp;
        }));
    };

    const saveDeduction = async (emp) => {
        if (!emp.deduct_days && !emp.deduct_hours) return;
        setSaving(emp.employee_id);

        try {
            const res = await api.post('/manual-deductions', {
                employee_id: emp.employee_id,
                month,
                deduct_days: emp.deduct_days,
                deduct_hours: emp.deduct_hours,
                reason: 'Manual Entry'
            });

            toast.success('Saved successfully');
            // Update local state with returned calculation and status
            setEmployees(prev => prev.map(e => {
                if (e.employee_id === emp.employee_id) {
                    return { ...e, ...res.data }; // Update Total Amount, Rates, Status, IDs
                }
                return e;
            }));

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(null);
        }
    };

    const approveDeduction = async (id) => {
        if (!confirm(`Are you sure you want to approve this deduction? This will process it to Global Compensation.`)) return;

        try {
            await api.post(`/manual-deductions/${id}/approve`, {});
            toast.success(`Approved & Processed`);
            fetchDeductions(); // Refresh to update status
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Approval failed');
        }
    };

    const ignoreDeduction = async (emp) => {
        const isCurrentlyIgnored = emp.status === 'Ignored';
        if (!isCurrentlyIgnored && !confirm(`Are you sure you want to ignore this deduction? It will be skipped from payroll.`)) return;

        setIgnoring(emp.employee_id);
        try {
            await api.post('/manual-deductions/ignore', {
                employee_id: emp.employee_id,
                month
            });
            toast.success(isCurrentlyIgnored ? 'Restored' : 'Deduction Ignored');
            fetchDeductions();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        } finally {
            setIgnoring(null);
        }
    };

    const getStatusBadge = (emp) => {
        if (!emp.deduction_id) {
            return (
                <span className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded-full flex items-center gap-1 border border-slate-200" title="Calculated based on attendance. Click Save to confirm.">
                    <Calculator size={12} /> Auto-Calculated
                </span>
            );
        }
        const { status, created_by } = emp;

        if (status === 'Processed') {
            return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1"><CheckCheck size={12} /> Processed</span>;
        }
        if (status === 'Pending') {
            if (created_by === user.id) {
                return (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1" title="Waiting for another HR Manager to approve">
                        <Clock size={12} /> Pending Approval
                    </span>
                );
            }
            return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1"><AlertCircle size={12} /> Action Required</span>;
        }
        if (status === 'Ignored') {
            return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full flex items-center gap-1 border border-dashed border-gray-300"><XCircle size={12} /> Ignored</span>;
        }
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    };

    const isEditable = (status) => !status || status === 'Pending';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Calculator className="text-rose-600" size={24} /> Attendance Deductions
                    </h3>
                    <p className="text-slate-500 text-sm font-medium">Manage No-Pay and Late deductions. Requires double verification.</p>
                </div>

                {/* Monthly Status Indicator */}
                {!loading && monthSummary && (
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl border shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 ${monthSummary.status === 'Transferred'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : monthSummary.status === 'Partially Transferred'
                            ? 'bg-rose-50 border-rose-100 text-rose-700'
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${monthSummary.status === 'Transferred' ? 'bg-emerald-500 text-white' : monthSummary.status === 'Partially Transferred' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                            {monthSummary.status === 'Transferred' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Monthly Status: {month}</p>
                            <p className="font-black text-sm uppercase tracking-tight">
                                {monthSummary.status === 'Transferred' ? 'All Transferred to Payroll' :
                                    monthSummary.status === 'Partially Transferred' ? 'Partially Transferred' :
                                        'Pending Transfer'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowIgnored(!showIgnored)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${showIgnored
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {showIgnored ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showIgnored ? 'Hide Ignored' : 'Show Ignored'}
                    </button>

                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll Cycle:</span>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="text-sm font-bold text-slate-700 outline-none bg-transparent"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="p-6">Employee</th>
                                <th className="p-6 text-center w-32">Absence (Days)</th>
                                <th className="p-6 text-center w-32">Late (Hours)</th>
                                <th className="p-6 text-right w-40">Deduction (LKR)</th>
                                <th className="p-6 text-center w-40">Status</th>
                                <th className="p-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Accessing database...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No eligible employees found for this cycle.</td></tr>
                            ) : (
                                employees.filter(e => showIgnored || e.status !== 'Ignored').map((emp) => (
                                    <tr key={emp.employee_id} className={`hover:bg-blue-50/30 transition-colors group ${emp.status === 'Ignored' ? 'opacity-50' : ''}`}>
                                        <td className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-slate-700">{emp.employee_name}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{emp.emp_code}</div>
                                                </div>
                                                {emp.details && emp.details.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedEmp(expandedEmp === emp.employee_id ? null : emp.employee_id)}
                                                        className={`p-1.5 rounded-lg transition-all ${expandedEmp === emp.employee_id ? 'bg-rose-100 text-rose-600 shadow-sm' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'}`}
                                                        title="View Calculation Breakdown"
                                                    >
                                                        {expandedEmp === emp.employee_id ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Expanded Details */}
                                            {expandedEmp === emp.employee_id && emp.details && (
                                                <div className="mt-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-1 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Calculation Breakdown</p>
                                                    {emp.details.map((d, i) => (
                                                        <div key={i} className="flex justify-between items-center text-[10px] py-1.5 border-b border-slate-200/50 last:border-0 hover:bg-white/80 px-2 rounded-lg transition-colors">
                                                            <span className="font-bold text-slate-500 w-16">{new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                            <span className="font-medium text-slate-600 flex-1">{d.reason}</span>
                                                            <span className="font-black text-rose-600 bg-rose-50/80 px-2.5 py-0.5 rounded-md border border-rose-100/50 ml-2 shadow-sm">
                                                                {d.value} {d.unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Input: Days */}
                                        <td className="p-6 text-center">
                                            <input
                                                type="number"
                                                min="0" step="0.5"
                                                value={emp.deduct_days}
                                                onChange={(e) => handleInputChange(emp.employee_id, 'deduct_days', e.target.value)}
                                                disabled={!isEditable(emp.status)}
                                                className={`w-20 px-3 py-2 border rounded-xl text-center font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${!isEditable(emp.status) ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white border-slate-200 text-slate-700'}`}
                                            />
                                        </td>

                                        {/* Input: Hours */}
                                        <td className="p-6 text-center">
                                            <input
                                                type="number"
                                                min="0" step="0.5"
                                                value={emp.deduct_hours}
                                                onChange={(e) => handleInputChange(emp.employee_id, 'deduct_hours', e.target.value)}
                                                disabled={!isEditable(emp.status)}
                                                className={`w-20 px-3 py-2 border rounded-xl text-center font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all ${!isEditable(emp.status) ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white border-slate-200 text-slate-700'}`}
                                            />
                                        </td>

                                        <td className="p-6 text-right font-black text-rose-600">
                                            {parseFloat(emp.total_amount).toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}
                                        </td>

                                        <td className="p-6 text-center">
                                            {getStatusBadge(emp)}
                                        </td>

                                        <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2">
                                                {/* SAVE BUTTON */}
                                                {isEditable(emp.status) && (
                                                    <button
                                                        onClick={() => saveDeduction(emp)}
                                                        disabled={saving === emp.employee_id}
                                                        className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Calculate & Save"
                                                    >
                                                        {saving === emp.employee_id ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Save size={18} />}
                                                    </button>
                                                )}

                                                {/* IGNORE / RESTORE BUTTON */}
                                                {emp.status !== 'Processed' && (
                                                    <button
                                                        onClick={() => ignoreDeduction(emp)}
                                                        disabled={ignoring === emp.employee_id}
                                                        className={`p-2 rounded-xl transition-all ${emp.status === 'Ignored'
                                                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white'
                                                            : 'text-amber-600 bg-amber-50 hover:bg-amber-600 hover:text-white'
                                                            }`}
                                                        title={emp.status === 'Ignored' ? 'Restore Deduction' : 'Ignore Deduction'}
                                                    >
                                                        {ignoring === emp.employee_id ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : (emp.status === 'Ignored' ? <RotateCcw size={18} /> : <XCircle size={18} />)}
                                                    </button>
                                                )}

                                                {/* APPROVE BUTTON */}
                                                {(emp.status === 'Pending' || emp.status === 'Ignored') && emp.created_by !== user.id && emp.total_amount > 0 && (
                                                    <button
                                                        onClick={() => approveDeduction(emp.deduction_id)}
                                                        className="p-2 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                        title="Approve & Process (Final)"
                                                    >
                                                        <ShieldCheck size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceAllowance;