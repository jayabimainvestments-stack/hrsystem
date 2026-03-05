import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Save, Clock, CheckCircle, AlertCircle, Calendar, DollarSign, User, ArrowRight, History, FileText, XCircle, Search } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SalaryAdvance = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [requests, setRequests] = useState([]);
    const [monthStatus, setMonthStatus] = useState({ transferred: false });
    const [error, setError] = useState(null);
    const [existingOverrides, setExistingOverrides] = useState({}); // { empId: amount }
    const [searchTerm, setSearchTerm] = useState('');

    // New Request State
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [allocations, setAllocations] = useState({}); // { empId: amount }

    const employeeMap = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp;
            return acc;
        }, {});
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.nic_passport?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [employees, searchTerm]);

    useEffect(() => {
        fetchEmployees();
        fetchRequests();
        fetchMonthStatus();
        fetchExistingOverrides();
    }, [month]);

    const fetchExistingOverrides = async () => {
        try {
            // 1. Fetch Overrides
            const { data: overrides } = await api.get(`/payroll/overrides?month=${month}`);

            // 2. Fetch Catalog to identify 'Advance' component robustness
            const { data: catalog } = await api.get('/payroll-settings/components');
            const advanceComp = catalog.find(c => c.name.toLowerCase().includes('advance'));

            if (!advanceComp) {
                console.warn("No 'Advance' component found in Catalog. Summary may be incomplete.");
            }

            // 3. Filter overrides that match the 'Advance' component(s)
            const map = {};
            overrides.forEach(a => {
                const isAdvance = advanceComp
                    ? a.component_id === advanceComp.id
                    : a.component_name.toLowerCase().includes('advance');

                if (isAdvance) {
                    map[a.employee_id] = (map[a.employee_id] || 0) + parseFloat(a.amount);
                }
            });
            setExistingOverrides(map);
        } catch (error) {
            console.error("Error fetching existing overrides", error);
        }
    };

    const fetchMonthStatus = async () => {
        try {
            const { data } = await api.get(`/financial/requests/status?month=${month}&type=Salary Advance`);
            setMonthStatus(data);
        } catch (error) {
            console.error("Failed to fetch month status", error);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(data || []);
            // Initially empty allocations for advances
        } catch (error) {
            console.error("Failed to fetch employees", error);
            setError("Failed to load employee data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/financial/requests?type=Salary Advance');
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const handleAmountChange = (empId, amount) => {
        setAllocations(prev => ({
            ...prev,
            [empId]: parseFloat(amount) || 0
        }));
    };

    const handleSubmit = async () => {
        if (!month) return alert("Please select a month");

        const dataEntries = Object.entries(allocations)
            .filter(([_, amt]) => amt > 0)
            .map(([empId, amt]) => ({
                employee_id: parseInt(empId),
                name: employeeMap[empId]?.name || `ID: ${empId}`,
                amount: amt
            }));

        if (dataEntries.length === 0) return alert("No salary advances to submit");

        const payload = {
            month,
            type: 'Salary Advance',
            data: dataEntries
        };

        setLoading(true);
        try {
            await api.post('/financial/requests', payload);
            alert("Salary Advance request submitted! Direct to Governance for approval.");
            setAllocations({});
            setActiveTab('history');
            fetchRequests();
        } catch (error) {
            alert("Failed to submit request: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 text-white">
                            <Wallet size={24} />
                        </div>
                        Salary Advance Module
                    </h2>
                    <p className="text-slate-500 font-medium mt-2 max-w-xl">
                        Request monthly salary advances for employees. Requests require dual HR/Admin approval.
                    </p>
                </div>

                {/* Monthly Status Indicator */}
                {!loading && (
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl border shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 ${monthStatus.transferred
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${monthStatus.transferred ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                            {monthStatus.transferred ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Monthly Status: {month}</p>
                            <p className="font-black text-sm uppercase tracking-tight">
                                {monthStatus.transferred ? 'Transferred to Payroll' : 'Pending Transfer'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center ${activeTab === 'new'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <FileText size={14} /> New Request
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center ${activeTab === 'history'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <History size={14} /> History & Approvals
                    </button>
                </div>
            </div>

            {activeTab === 'new' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Control Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-24">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Request Metadata</h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pay Period</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="month"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-sm outline-none focus:border-emerald-500 transition-all text-slate-800"
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Total Advance Value</p>
                                    <p className="text-2xl font-black text-emerald-900 tracking-tight">
                                        LKR {Object.values(allocations).reduce((sum, amt) => sum + amt, 0).toLocaleString()}
                                    </p>
                                </div>

                                <div className="p-5 bg-slate-100 rounded-2xl border border-slate-200">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Approved ({month})</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                                        LKR {Object.values(existingOverrides).reduce((sum, amt) => sum + amt, 0).toLocaleString()}
                                    </p>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || Object.values(allocations).filter(v => v > 0).length === 0}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {loading ? 'Submitting...' : <><Save size={18} /> Submit for Approval</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search employees by name or ID..."
                                className="w-full bg-white border border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 font-black text-sm outline-none shadow-sm focus:border-emerald-500 transition-all text-slate-800"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee Identity</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Approved</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Add Advance (LKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading && employees.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-slate-400 italic">
                                                    Establishing secure database connection...
                                                </td>
                                            </tr>
                                        ) : filteredEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-slate-400 italic">
                                                    {searchTerm ? "No employees match your search criteria." : "No active employees found."}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredEmployees.map((emp) => (
                                                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                                                                {emp.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                                                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                                                                    {emp.employee_id || emp.nic_passport} • {emp.designation || 'Staff'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight tabular-nums ${existingOverrides[emp.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 opacity-40'}`}>
                                                            {existingOverrides[emp.id] ? `LKR ${existingOverrides[emp.id].toLocaleString()}` : '0.00'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="inline-flex items-center bg-white border-2 border-slate-100 rounded-2xl px-6 py-2 shadow-inner group-hover:border-emerald-200 transition-all">
                                                            <span className="text-[10px] font-black text-slate-400 mr-3">LKR</span>
                                                            <input
                                                                type="number"
                                                                className="w-32 text-right py-2 font-black text-slate-900 outline-none bg-transparent"
                                                                placeholder="0.00"
                                                                value={allocations[emp.id] || ''}
                                                                onChange={(e) => handleAmountChange(emp.id, e.target.value)}
                                                            />
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
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6">
                    {requests.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                            <History size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">No Salary Advance requests on record.</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-100 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                            req.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                                                'bg-amber-50 text-amber-600'
                                            }`}>
                                            {req.status === 'Approved' ? <CheckCircle size={32} /> :
                                                req.status === 'Rejected' ? <XCircle size={32} /> :
                                                    <Clock size={32} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Pay Period: {req.month}</h4>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'Approved'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : req.status === 'Rejected'
                                                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 text-sm font-medium">
                                                Requested by <span className="text-slate-800 font-bold">{req.requested_by_name}</span> • {new Date(req.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Advance</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                LKR {req.data.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()}
                                            </p>
                                        </div>

                                        {req.status === 'Pending' && (['Admin', 'HR Manager'].includes(user.role)) && (
                                            <button
                                                onClick={() => window.location.href = '/governance'}
                                                className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                                            >
                                                Governance Process
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {req.data.map((item, idx) => {
                                        const emp = employeeMap[item.employee_id];
                                        return (
                                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center text-xs font-black shadow-sm">
                                                    {emp ? emp.name.charAt(0) : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]" title={emp ? emp.name : `ID: ${item.employee_id}`}>
                                                        {emp ? emp.name : (req.data.find(d => d.employee_id === item.employee_id)?.name || `ID: ${item.employee_id}`)}
                                                    </p>
                                                    <p className="text-[10px] font-black text-emerald-600 mt-1">
                                                        LKR {Number(item.amount).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SalaryAdvance;
