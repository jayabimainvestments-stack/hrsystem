import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    Plus, Trash2, Edit3, X, CheckCircle, ArrowRight, CheckCircle2,
    XCircle, Trophy, Search, Target, LayoutDashboard, Settings2, TrendingUp, Calendar, Save, Layout, AlertCircle
} from 'lucide-react';

const PerformanceAllowance = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('approvals'); // 'entry', 'setup', 'dashboard', 'approvals'
    const [monthlyApprovals, setMonthlyApprovals] = useState([]);
    const [monthSummary, setMonthSummary] = useState(null);

    // Performance Data
    const [employeeConfig, setEmployeeConfig] = useState(null);
    const [summary, setSummary] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); // Start of current week (Monday)
        return d.toISOString().slice(0, 10);
    });
    const [selectedWeekEnd, setSelectedWeekEnd] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) + 6); // End of current week (Sunday)
        return d.toISOString().slice(0, 10);
    });

    const [entryValues, setEntryValues] = useState({}); // { metric_id: value }
    const [setupValues, setSetupValues] = useState({}); // { metric_id: { assigned, targets: { 1: {min, max}, ... } } }

    // Metric Management State
    const [showMetricManager, setShowMetricManager] = useState(false);
    const [editingMetric, setEditingMetric] = useState(null);
    const [metricForm, setMetricForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            fetchEmployeeConfig();
            fetchSummary();
        }
    }, [selectedEmployee, selectedMonth]);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees", error);
        }
    };

    const fetchEmployeeConfig = async () => {
        try {
            const { data } = await api.get(`/performance/config/${selectedEmployee}`);
            setEmployeeConfig(data);

            // Initialize Setup Values from DB (Dynamic Targets)
            const setup = {};
            data.metrics.forEach(m => {
                const targets = (m.targets || []).map(t => ({
                    mark: t.mark,
                    min: t.min_value,
                    max: t.max_value,
                    name: t.target_name || ''
                }));

                // If no targets, add one default row
                if (targets.length === 0) {
                    targets.push({ mark: '', min: '', max: '', name: '' });
                }

                setup[m.id] = { assigned: m.assigned, targets: targets };
            });
            setSetupValues(setup);

            // Reset entries
            const entries = {};
            data.metrics.forEach(m => entries[m.id] = '');
            setEntryValues(entries);

        } catch (error) {
            console.error("Error fetching employee config", error);
        }
    };

    const fetchSummary = async () => {
        try {
            const { data } = await api.get(`/performance/summary/${selectedEmployee}/${selectedMonth}`);
            setSummary(data);
        } catch (error) {
            console.error("Error fetching summary", error);
        }
    };

    const fetchMonthlyApprovals = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/performance/approvals/${selectedMonth}`);
            setMonthlyApprovals(data.data || []);
            setMonthSummary({ status: data.status, approved_count: data.approved_count, total_count: data.total_count });
        } catch (error) {
            console.error("Error fetching monthly approvals", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGeneralConfig = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/performance/config');
            setEmployeeConfig(data);
        } catch (error) {
            console.error("Error fetching general metrics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'approvals') {
            fetchMonthlyApprovals();
        } else if (viewMode === 'setup' && !selectedEmployee) {
            fetchGeneralConfig();
        }
    }, [viewMode, selectedMonth, selectedEmployee]);

    const handleUpdateApproval = async (empId, marks, amount, status) => {
        try {
            setLoading(true);
            await api.post('/performance/approvals', {
                employee_id: empId,
                month: selectedMonth,
                total_marks: marks,
                total_amount: amount,
                status
            });
            fetchMonthlyApprovals();
        } catch (error) {
            alert(`Failed to ${status.toLowerCase()} performance`);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkApprove = async () => {
        const pendingCount = monthlyApprovals.filter(a => a.status !== 'Approved').length;
        const totalAmount = monthlyApprovals.reduce((sum, a) => sum + (a.total_amount || 0), 0);

        if (!window.confirm(
            `Are you sure you want to approve ALL ${monthlyApprovals.length} employees for ${selectedMonth}?\n\nTotal Payout: LKR ${totalAmount.toLocaleString()}\n\nThis will update Monthly Salary Overrides (Performance component) for all employees.`
        )) return;

        try {
            setLoading(true);
            const { data } = await api.post('/performance/approvals/bulk', { month: selectedMonth });
            alert(data.message || 'All performance approved successfully!');
            fetchMonthlyApprovals();
        } catch (error) {
            alert('Failed to bulk approve: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSetup = async () => {
        setLoading(true);
        try {
            const targets = [];
            Object.entries(setupValues).forEach(([metricId, data]) => {
                if (data.assigned) {
                    data.targets.forEach((target) => {
                        if (target.mark !== '' && target.min !== '' && target.max !== '') {
                            targets.push({
                                metric_id: parseInt(metricId),
                                mark: parseFloat(target.mark),
                                min_value: parseFloat(target.min),
                                max_value: parseFloat(target.max),
                                target_name: target.name || '',
                                is_descending: false
                            });
                        }
                    });
                }
            });

            await api.post(`/performance/config/${selectedEmployee}`, { targets });
            alert('Individual scorecard targets saved successfully');
            fetchEmployeeConfig();
            setViewMode('entry');
        } catch (error) {
            alert('Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWeekly = async () => {
        if (!selectedEmployee) return alert('Please select an employee');

        setLoading(true);
        try {
            const entries = Object.entries(entryValues)
                .filter(([id, val]) => val !== '')
                .map(([metric_id, value]) => ({
                    metric_id: parseInt(metric_id),
                    value: parseFloat(value) || 0
                }));

            if (entries.length === 0) return alert('Please enter at least one metric value');

            const payload = {
                employee_id: selectedEmployee,
                week_starting: selectedWeek,
                week_ending: selectedWeekEnd,
                entries
            };
            await api.post('/performance/weekly', payload);
            alert('Weekly performance recorded successfully');
            fetchSummary();
        } catch (error) {
            alert('Failed to save data');
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    const handleMetricAction = async (action, id = null) => {
        try {
            setLoading(true);
            if (action === 'delete') {
                if (!window.confirm('Are you sure you want to delete this metric? This will remove all associated targets for all employees.')) return;
                await api.delete(`/performance/metrics/${id}`);
            } else if (action === 'create') {
                await api.post('/performance/metrics', metricForm);
                setMetricForm({ name: '', description: '' });
            } else if (action === 'update') {
                await api.put(`/performance/metrics/${id}`, metricForm);
                setEditingMetric(null);
                setMetricForm({ name: '', description: '' });
            }
            if (selectedEmployee) {
                fetchEmployeeConfig();
            } else {
                fetchGeneralConfig();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to manage metric');
        } finally {
            setLoading(false);
        }
    };

    const calculateMarksForValue = (metricId, value) => {
        if (!value || isNaN(value)) return 0;
        const val = parseFloat(value);
        const metricConfig = employeeConfig?.metrics?.find(m => Number(m.id) === Number(metricId));
        if (!metricConfig) return 0;

        const targets = setupValues[metricId]?.targets || [];
        for (const t of targets) {
            const min = parseFloat(t.min);
            const max = parseFloat(t.max);
            if (val >= min && val <= max) return parseFloat(t.mark);
        }
        return 0;
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employee_id && emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const [expandedWeeks, setExpandedWeeks] = useState({});

    const toggleWeek = (week) => {
        setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }));
    };

    const renderTargetContext = (metricId, value) => {
        if (!value || isNaN(value)) return null;
        const val = parseFloat(value);
        const targets = setupValues[metricId]?.targets || [];
        const matched = targets.find(t => val >= parseFloat(t.min) && val <= parseFloat(t.max));

        if (matched) {
            return (
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 animate-in zoom-in-50 duration-300">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{matched.name || 'Target Met'}</p>
                </div>
            );
        }
        return (
            <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 animate-in zoom-in-50 duration-300">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest italic">Out of Range</p>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Employee Selector */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-[600px]">
                        <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                            Employee Selector
                        </h3>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search Name or ID..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-xs outline-none focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp.id)}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left border-2 ${selectedEmployee === emp.id
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-100 scale-[1.02]'
                                        : 'bg-slate-50 border-transparent hover:border-amber-100'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedEmployee === emp.id ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className={`font-bold text-sm truncate ${selectedEmployee === emp.id ? 'text-white' : 'text-slate-900'}`}>{emp.name}</p>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${selectedEmployee === emp.id ? 'text-amber-200' : 'text-slate-600'}`}>
                                            Code: {emp.emp_code || 'N/A'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Logic */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Monthly Status Indicator */}
                    {monthSummary && (
                        <div className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] border shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 ${monthSummary.status === 'Transferred'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : monthSummary.status === 'Partially Transferred'
                                ? 'bg-blue-50 border-blue-100 text-blue-700'
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${monthSummary.status === 'Transferred' ? 'bg-emerald-500 text-white' : monthSummary.status === 'Partially Transferred' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {monthSummary.status === 'Transferred' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Monthly Status: {selectedMonth}</p>
                                <p className="font-black text-sm uppercase tracking-tight">
                                    {monthSummary.status === 'Transferred' ? 'All Transferred to Payroll' :
                                        monthSummary.status === 'Partially Transferred' ? 'Partially Transferred' :
                                            'Pending Transfer'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Mode Selector - Always Visible */}
                    <div className="bg-white rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <button
                                onClick={() => setViewMode('approvals')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all ${viewMode === 'approvals' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <CheckCircle size={16} />
                                Approvals (Main)
                            </button>
                            <button
                                onClick={() => setViewMode('entry')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all ${viewMode === 'entry' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Edit3 size={16} />
                                Weekly Entry
                            </button>
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all ${viewMode === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutDashboard size={16} />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setViewMode('setup')}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all ${viewMode === 'setup' ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Settings2 size={16} />
                                Target Config
                            </button>
                        </div>

                        {viewMode === 'approvals' && (
                            <div className="flex items-center gap-4 mr-4">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Selected Month</span>
                                <input
                                    type="month"
                                    className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 font-black text-xs outline-none focus:border-blue-500 transition-all text-slate-800"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {viewMode === 'approvals' ? (
                        /* MONTHLY APPROVALS MODE - SHOWS ALL EMPLOYEES */
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden">
                                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-blue-50/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Monthly Performance Approvals</h4>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Review and verify payouts for {selectedMonth}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Employee</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Total Marks</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Payout (LKR)</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {monthlyApprovals.map((app, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs uppercase">
                                                                {app.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900">{app.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Code: {app.emp_code}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-center text-sm font-black text-slate-700">
                                                        {app.total_marks} Pts
                                                    </td>
                                                    <td className="px-10 py-8 text-right text-sm font-black text-slate-900">
                                                        {app.total_amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-10 py-8 text-center">
                                                        <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                            app.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {app.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateApproval(app.id, app.total_marks, app.total_amount, 'Approved')}
                                                                className={`p-2 rounded-xl transition-all ${app.status === 'Approved' ? 'bg-emerald-600 text-white cursor-default' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                                                title="Approve for Payroll"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateApproval(app.id, app.total_marks, app.total_amount, 'Rejected')}
                                                                className={`p-2 rounded-xl transition-all ${app.status === 'Rejected' ? 'bg-rose-600 text-white cursor-default' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'}`}
                                                                title="Reject / Needs Revision"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {monthlyApprovals.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-10 py-20 text-center text-slate-400 font-medium">
                                                        No performance records found for this month.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary Card + Approve All */}
                            {monthlyApprovals.length > 0 && (
                                <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
                                            <div>
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Monthly Summary — {selectedMonth}</h5>
                                                <p className="text-white/50 text-xs font-bold">Approve all and send to Monthly Salary Overrides</p>
                                            </div>
                                            <button
                                                onClick={handleBulkApprove}
                                                disabled={loading || monthlyApprovals.length === 0}
                                                className="group relative overflow-hidden bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-900/50 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <CheckCircle2 size={20} strokeWidth={3} />
                                                    {loading ? 'Approving...' : 'Approve All & Send to Payroll'}
                                                </div>
                                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Employees</p>
                                                <p className="text-3xl font-black tracking-tighter">{monthlyApprovals.length}</p>
                                            </div>
                                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">Total Marks</p>
                                                <p className="text-3xl font-black tracking-tighter text-amber-300">{monthlyApprovals.reduce((s, a) => s + (a.total_marks || 0), 0)}</p>
                                            </div>
                                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Total Payout (LKR)</p>
                                                <p className="text-3xl font-black tracking-tighter text-emerald-300">{monthlyApprovals.reduce((s, a) => s + (a.total_amount || 0), 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Approved</p>
                                                <p className="text-3xl font-black tracking-tighter text-blue-300">{monthlyApprovals.filter(a => a.status === 'Approved').length} / {monthlyApprovals.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-10 bg-emerald-50/50 rounded-[3rem] border-2 border-dashed border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600">
                                        <TrendingUp size={28} />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ready for Payroll?</h5>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Only 'Approved' performance amounts will be included during salary generation.</p>
                                    </div>
                                </div>
                                <div className="hidden lg:block text-emerald-700 font-black text-xs uppercase tracking-widest">
                                    Verified by HR Management
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* REGULAR LOGIC (Requires Employee Selection for most views) */
                        (!selectedEmployee && viewMode !== 'setup') ? (
                            <div className="bg-white rounded-[4rem] p-24 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-200">
                                    <TrendingUp size={48} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Select Employee to Start</h4>
                                    <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">Manage individualized KPI metrics and calculate monthly performance incentives.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Header Stats - Only show if employee selected */}
                                {selectedEmployee && (
                                    <div className="relative group overflow-hidden bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-2xl border border-white/5">
                                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>

                                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className="p-5 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl">
                                                    <Target size={32} className="text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black uppercase tracking-tight">
                                                        {employees.find(e => e.id === selectedEmployee)?.name}
                                                    </h3>
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mt-1 italic">Individual Performance Context</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="text-center bg-white/5 px-8 py-6 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-inner min-w-[140px]">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400 mb-2 italic">Total Marks</p>
                                                    <div className="flex items-baseline justify-center gap-2">
                                                        <span className="text-2xl font-black tabular-nums tracking-tight">
                                                            {summary?.total_marks || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-center bg-white/5 px-8 py-6 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-inner min-w-[180px]">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2 italic">Payout Estimate</p>
                                                    <div className="flex items-baseline justify-center gap-2 text-emerald-400">
                                                        <span className="text-2xl font-black tabular-nums tracking-tight">
                                                            {(summary?.total_amount || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-black opacity-50 uppercase">LKR</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'setup' ? (
                                    /* TARGET CONFIGURATION VIEW */
                                    <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px]">
                                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-amber-50/10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                                                    <Target size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Target Configuration</h4>
                                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">
                                                        {selectedEmployee ? `Configure targets for ${employees.find(e => e.id === selectedEmployee)?.name}` : 'Manage global system metrics'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedEmployee && (
                                                <button
                                                    onClick={handleSaveSetup}
                                                    disabled={loading}
                                                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {loading ? 'Saving...' : 'Save Configuration'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-10 space-y-8">
                                            <div className="space-y-6">
                                                {/* Metric Management Toggle */}
                                                <div className="flex justify-end mb-4">
                                                    <button
                                                        onClick={() => setShowMetricManager(!showMetricManager)}
                                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${showMetricManager
                                                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                                                            : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'
                                                            }`}
                                                    >
                                                        {showMetricManager ? <X size={16} /> : <Settings2 size={16} />}
                                                        {showMetricManager ? 'Close Metric Manager' : 'Manage All Metrics'}
                                                    </button>
                                                </div>

                                                {showMetricManager ? (
                                                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                        <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">Master Metric Definitions</h5>

                                                        {/* Add/Edit Form */}
                                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 mb-8 space-y-4 shadow-sm">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Metric Name (e.g. Sales Volume)"
                                                                    value={metricForm.name}
                                                                    onChange={(e) => setMetricForm({ ...metricForm, name: e.target.value })}
                                                                    className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-blue-500"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Description (Optional)"
                                                                    value={metricForm.description}
                                                                    onChange={(e) => setMetricForm({ ...metricForm, description: e.target.value })}
                                                                    className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                {editingMetric ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => { setEditingMetric(null); setMetricForm({ name: '', description: '' }); }}
                                                                            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400"
                                                                        >Cancel</button>
                                                                        <button
                                                                            onClick={() => handleMetricAction('update', editingMetric)}
                                                                            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-200"
                                                                        >Save Change</button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleMetricAction('create')}
                                                                        className="bg-emerald-600 text-white px-10 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-200"
                                                                    >Create New Metric</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Metrics List */}
                                                        <div className="space-y-3">
                                                            {(employeeConfig?.metrics || []).map((m) => (
                                                                <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">
                                                                            {m.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-black text-sm text-slate-800">{m.name}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.description || 'No description'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => { setEditingMetric(m.id); setMetricForm({ name: m.name, description: m.description || '' }); }}
                                                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                                        >
                                                                            <Edit3 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleMetricAction('delete', m.id)}
                                                                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-6">
                                                        {!selectedEmployee ? (
                                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-400">
                                                                    <Search size={32} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Employee Not Selected</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[250px]">Select an employee from the left sidebar to assign targets to them.</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            (employeeConfig?.metrics || []).map((metric, idx) => (
                                                                <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${setupValues[metric.id]?.assigned ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
                                                                                {idx + 1}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">{metric.category || 'Performance Metric'}</p>
                                                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">{metric.name}</h6>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setSetupValues({
                                                                                ...setupValues,
                                                                                [metric.id]: { ...setupValues[metric.id], assigned: !setupValues[metric.id]?.assigned }
                                                                            })}
                                                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${setupValues[metric.id]?.assigned ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}
                                                                        >
                                                                            {setupValues[metric.id]?.assigned ? 'Assigned' : 'Not Assigned'}
                                                                        </button>
                                                                    </div>

                                                                    {setupValues[metric.id]?.assigned && (
                                                                        <div className="space-y-4 pt-4 border-t border-slate-200/50">
                                                                            <div className="flex items-center justify-between px-2">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Brackets</p>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newSetup = { ...setupValues };
                                                                                        newSetup[metric.id].targets.push({ mark: '', min: '', max: '', name: '' });
                                                                                        setSetupValues(newSetup);
                                                                                    }}
                                                                                    className="text-amber-600 text-[9px] font-black uppercase tracking-widest hover:underline"
                                                                                >
                                                                                    + Add Bracket
                                                                                </button>
                                                                            </div>
                                                                            <div className="grid gap-3">
                                                                                {setupValues[metric.id].targets.map((t, tidx) => (
                                                                                    <div key={tidx} className="grid grid-cols-5 gap-3">
                                                                                        <div className="col-span-1">
                                                                                            <input
                                                                                                placeholder="Target Name (ex: Good)"
                                                                                                type="text"
                                                                                                value={t.name}
                                                                                                onChange={(e) => {
                                                                                                    const newSetup = { ...setupValues };
                                                                                                    newSetup[metric.id].targets[tidx].name = e.target.value;
                                                                                                    setSetupValues(newSetup);
                                                                                                }}
                                                                                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-[10px] font-black text-slate-700"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-1">
                                                                                            <input
                                                                                                placeholder="Marks"
                                                                                                type="number"
                                                                                                value={t.mark}
                                                                                                onChange={(e) => {
                                                                                                    const newSetup = { ...setupValues };
                                                                                                    newSetup[metric.id].targets[tidx].mark = e.target.value;
                                                                                                    setSetupValues(newSetup);
                                                                                                }}
                                                                                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 text-center"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-1">
                                                                                            <input
                                                                                                placeholder="Min Val"
                                                                                                type="number"
                                                                                                value={t.min}
                                                                                                onChange={(e) => {
                                                                                                    const newSetup = { ...setupValues };
                                                                                                    newSetup[metric.id].targets[tidx].min = e.target.value;
                                                                                                    setSetupValues(newSetup);
                                                                                                }}
                                                                                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 text-center"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="col-span-1">
                                                                                            <input
                                                                                                placeholder="Max Val"
                                                                                                type="number"
                                                                                                value={t.max}
                                                                                                onChange={(e) => {
                                                                                                    const newSetup = { ...setupValues };
                                                                                                    newSetup[metric.id].targets[tidx].max = e.target.value;
                                                                                                    setSetupValues(newSetup);
                                                                                                }}
                                                                                                className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 text-center"
                                                                                            />
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const newSetup = { ...setupValues };
                                                                                                newSetup[metric.id].targets = newSetup[metric.id].targets.filter((_, i) => i !== tidx);
                                                                                                setSetupValues(newSetup);
                                                                                            }}
                                                                                            className="flex items-center justify-center text-rose-300 hover:text-rose-600 transition-all"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : viewMode === 'dashboard' ? (
                                    /* INDIVIDUAL PERFORMANCE DASHBOARD */
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {loading ? (
                                            <div className="md:col-span-2 flex justify-center py-20">
                                                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-white rounded-[4rem] p-10 border border-slate-100 shadow-xl">
                                                    <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 ml-2">Monthly Progress</h5>
                                                    <div className="space-y-6">
                                                        {summary?.details?.map((m, i) => (
                                                            <div key={i} className="space-y-2">
                                                                <div className="flex justify-between items-end px-2">
                                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{m.metric_title}</p>
                                                                    <p className="text-[10px] font-black text-slate-600">{m.score} / {m.max_marks}</p>
                                                                </div>
                                                                <div className="h-4 bg-slate-50 rounded-full overflow-hidden p-1 shadow-inner border border-slate-100">
                                                                    <div
                                                                        className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000"
                                                                        style={{ width: `${(m.score / m.max_marks) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900 rounded-[4rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col h-full">
                                                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
                                                    <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6 relative z-10">Weekly Marks Breakdown</h5>

                                                    <div className="relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                                        {summary?.weekly_breakdown?.length > 0 ? (
                                                            summary.weekly_breakdown.map((week, wIdx) => (
                                                                <div key={wIdx} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all group">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Week {summary.weekly_breakdown.length - wIdx}</p>
                                                                            <h6 className="text-sm font-black text-white tracking-tight">
                                                                                {new Date(week.week_starting).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(week.week_ending).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                            </h6>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-2xl font-black text-amber-400 tracking-tighter">+{week.total_marks.toFixed(1)}</p>
                                                                            <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Points Earned</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                                                        <div className="grid grid-cols-12 gap-2 px-2 pb-1">
                                                                            <span className="col-span-6 text-[8px] font-black text-white/50 uppercase tracking-widest">Metric</span>
                                                                            <span className="col-span-3 text-[8px] font-black text-white/50 uppercase tracking-widest text-center">Value</span>
                                                                            <span className="col-span-3 text-[8px] font-black text-white/50 uppercase tracking-widest text-right">Points</span>
                                                                        </div>
                                                                        {week.metrics.map((m, mIdx) => (
                                                                            <div key={mIdx} className="grid grid-cols-12 items-center bg-white/5 rounded-xl px-4 py-2 border border-white/5 hover:bg-white/10 transition-colors">
                                                                                <span className="col-span-6 text-[10px] font-bold text-white/70 uppercase tracking-tight truncate mr-2" title={m.metric_name}>{m.metric_name}</span>
                                                                                <span className="col-span-3 text-[10px] font-black text-white/90 text-center tabular-nums">
                                                                                    {m.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                                                                </span>
                                                                                <div className="col-span-3 text-right">
                                                                                    {m.mark > 0 ? (
                                                                                        <span className="text-[10px] font-black text-blue-400">+{m.mark.toFixed(1)}</span>
                                                                                    ) : (
                                                                                        <span className="text-[8px] font-black text-rose-500/60 uppercase italic leading-none">Missed</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                                                                <TrendingUp size={48} className="mb-4" />
                                                                <p className="text-xs font-black uppercase tracking-widest">No weekly data recorded</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : viewMode === 'entry' ? (
                                    /* WEEKLY ENTRY MODE */
                                    <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px]">
                                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                                    <Layout size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Operational Metric Logs</h4>
                                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Input validated data for individual KPI targets</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2">
                                                <Calendar size={16} className="text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={selectedWeek}
                                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none"
                                                />
                                                <span className="text-slate-300 mx-2">to</span>
                                                <input
                                                    type="date"
                                                    value={selectedWeekEnd}
                                                    onChange={(e) => setSelectedWeekEnd(e.target.value)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-10">
                                            <div className="grid gap-6">
                                                {(employeeConfig?.metrics || []).filter(m => setupValues[m.id]?.assigned).map((metric, idx) => (
                                                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-slate-200 transition-all group">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm font-black text-xs">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 italic">{metric.category}</p>
                                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">{metric.name}</h6>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Input Value"
                                                                    value={entryValues[metric.id] || ''}
                                                                    onChange={(e) => setEntryValues({ ...entryValues, [metric.id]: e.target.value })}
                                                                    className="w-40 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 text-center placeholder:text-slate-500 focus:border-blue-600/40 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none"
                                                                />
                                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm text-[8px] font-black text-slate-600 uppercase tracking-widest">Value</div>
                                                            </div>
                                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs">
                                                                {calculateMarksForValue(metric.id, entryValues[metric.id])} <span className="text-[8px] ml-1">Pts</span>
                                                            </div>
                                                        </div>
                                                        {renderTargetContext(metric.id, entryValues[metric.id])}
                                                    </div>
                                                ))}

                                                <div className="mt-8 flex justify-end">
                                                    <button
                                                        onClick={handleSaveWeekly}
                                                        disabled={loading}
                                                        className="group relative overflow-hidden bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-900/50 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
                                                    >
                                                        <div className="relative z-10 flex items-center gap-3">
                                                            <Save size={20} />
                                                            {loading ? 'Saving...' : 'Save Weekly Entry'}
                                                        </div>
                                                    </button>
                                                </div>

                                                <div className="mt-12 group relative">
                                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                                    <div className="relative bg-white rounded-[3rem] p-10 border border-slate-100">
                                                        <div className="flex items-center justify-between mb-8">
                                                            <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Monthly Aggregate — {selectedMonth}</h5>
                                                            <div className="text-[10px] font-black text-slate-400 italic">Live Calculation</div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Points</p>
                                                                <p className="text-3xl font-black text-slate-800 tracking-tighter">{summary?.total_marks || 0} <span className="text-xs text-slate-300 font-bold ml-1 uppercase">Pts</span></p>
                                                            </div>
                                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Payout Est.</p>
                                                                <p className="text-3xl font-black text-slate-800 tracking-tighter">{(summary?.total_amount || 0).toLocaleString()} <span className="text-xs text-slate-300 font-bold ml-1 uppercase">LKR</span></p>
                                                            </div>
                                                            <div className="hidden md:block bg-blue-600 p-6 rounded-[2rem] text-white">
                                                                <p className="text-[9px] font-black text-blue-100/60 uppercase tracking-widest mb-2">Approved</p>
                                                                <p className="text-3xl font-black tracking-tighter text-blue-100">{summary?.status === 'Approved' ? 'YES' : 'PENDING'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* WEEKLY BREAKDOWN LOGS */}
                                                {summary?.weekly_breakdown?.length > 0 && (
                                                    <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                                            <TrendingUp size={14} className="text-blue-500" />
                                                            Recorded Weekly Logs
                                                        </h5>
                                                        <div className="grid gap-4">
                                                            {summary.weekly_breakdown.map((week, wIdx) => (
                                                                <div key={wIdx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                                                    <button
                                                                        onClick={() => toggleWeek(week.week_starting)}
                                                                        className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${week.status === 'Processed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                                <Calendar size={20} />
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Week of {new Date(week.week_starting).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{week.week_starting} to {week.week_ending}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-8">
                                                                            <div className="text-right">
                                                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{week.total_marks} Pts</p>
                                                                                <div className={`text-[8px] font-black uppercase tracking-[0.2em] mt-0.5 ${week.status === 'Processed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                                    {week.status}
                                                                                </div>
                                                                            </div>
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-transform ${expandedWeeks[week.week_starting] ? 'rotate-90 bg-slate-100 text-slate-600' : ''}`}>
                                                                                <ArrowRight size={14} />
                                                                            </div>
                                                                        </div>
                                                                    </button>

                                                                    {expandedWeeks[week.week_starting] && (
                                                                        <div className="px-6 pb-6 pt-2 border-t border-slate-50 space-y-2 bg-slate-50/30">
                                                                            {week.metrics.map((m, mIdx) => (
                                                                                <div key={mIdx} className="flex justify-between items-center py-3 px-5 bg-white rounded-2xl border border-slate-100/50 shadow-sm">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{m.metric_name}</p>
                                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entry Value: <span className="text-slate-600 tracking-normal">{m.value}</span></p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">
                                                                                        +{m.mark} Pts
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-20">
                                        <p className="text-slate-400 font-bold uppercase tracking-widest">Select a view mode</p>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceAllowance;
