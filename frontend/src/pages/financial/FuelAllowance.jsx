import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Fuel, Save, Clock, CheckCircle, AlertCircle, Calendar, DollarSign, Droplet, User, ArrowRight, Wallet, History, FileText, ShieldAlert, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const FuelAllowance = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [requests, setRequests] = useState([]);
    const [monthStatus, setMonthStatus] = useState({ transferred: false });
    const [fuelHistory, setFuelHistory] = useState([]);
    const [splitResults, setSplitResults] = useState({}); // { empId: { totalAmount, reason } }
    const [error, setError] = useState(null);
    const [isScraping, setIsScraping] = useState(false);
    const [calculating, setCalculating] = useState(false);

    // New Request State
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [fuelPrice, setFuelPrice] = useState(317); // Current active price
    const [allocations, setAllocations] = useState({}); // { empId: liters }
    const [priceSaving, setPriceSaving] = useState(false);
    const priceTimerRef = useRef(null);
    const calcTimerRef = useRef(null);

    // Auto-save fuel price to DB with debounce
    const saveFuelPrice = useCallback(async (price) => {
        const numPrice = parseFloat(price);
        if (!numPrice || numPrice <= 0) return;
        setPriceSaving(true);
        try {
            await api.patch('/policy/fuel-rate', { fuel_rate_per_liter: numPrice });
            console.log('[FUEL] Price saved:', numPrice);
        } catch (err) {
            console.error('[FUEL] Failed to save price:', err);
        } finally {
            setPriceSaving(false);
        }
    }, []);

    const handlePriceChange = (value) => {
        setFuelPrice(value);
        // Debounce: save after 1s of no typing
        if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
        priceTimerRef.current = setTimeout(() => saveFuelPrice(value), 1000);
    };

    const employeeMap = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp;
            return acc;
        }, {});
    }, [employees]);

    useEffect(() => {
        fetchEmployees();
        fetchRequests();
        fetchPolicy();
        fetchMonthStatus();
        fetchFuelHistory();
    }, [month]);

    // Recalculate split values when allocations or month changes
    useEffect(() => {
        if (Object.keys(allocations).length > 0) {
            if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
            calcTimerRef.current = setTimeout(() => fetchSplitPreviews(), 800);
        }
    }, [allocations, month]);

    const fetchFuelHistory = async () => {
        try {
            const { data } = await api.get('/policy/fuel-history');
            setFuelHistory(data);
        } catch (error) {
            console.error('Error fetching fuel history', error);
        }
    };

    const handleTriggerScrape = async () => {
        setIsScraping(true);
        try {
            await api.post('/policy/trigger-scrape');
            await fetchFuelHistory();
            await fetchPolicy();
            alert('Fuel prices updated successfully from CEYPETCO!');
        } catch (error) {
            alert('Scraper failed. Please check backend logs.');
        } finally {
            setIsScraping(false);
        }
    };

    const fetchSplitPreviews = async () => {
        setCalculating(true);
        try {
            const empList = Object.entries(allocations).map(([id, liters]) => ({ id, liters }));
            const { data } = await api.post('/policy/fuel-split-preview', {
                month,
                employees: empList
            });
            setSplitResults(data);
        } catch (error) {
            console.error("Failed to fetch split previews", error);
        } finally {
            setCalculating(false);
        }
    };

    const fetchMonthStatus = async () => {
        try {
            const { data } = await api.get(`/financial/requests/status?month=${month}&type=Fuel Allowance`);
            setMonthStatus(data);
        } catch (error) {
            console.error("Failed to fetch month status", error);
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/payroll-settings/fuel-quotas');
            setEmployees(data || []);
            // Initialize allocations with permanent liters
            const initial = {};
            (data || []).forEach(emp => {
                initial[emp.id] = emp.quantity ?? 0;
            });
            setAllocations(initial);
        } catch (error) {
            console.error("Failed to fetch fuel quotas", error);
            setError(error.response?.data?.message || "Failed to load employee fuel data. Please check permissions.");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/financial/requests?type=Fuel Allowance');
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const fetchPolicy = async () => {
        try {
            const { data } = await api.get('/policy');
            if (data && data.fuel_rate_per_liter) {
                setFuelPrice(data.fuel_rate_per_liter);
            }
        } catch (error) {
            console.error("Failed to fetch policy", error);
        }
    };

    const handleLiterChange = (empId, liters) => {
        setAllocations(prev => ({
            ...prev,
            [empId]: parseFloat(liters) || 0
        }));
    };

    const calculateTotal = (empId) => {
        if (splitResults[empId]) {
            return splitResults[empId].totalAmount;
        }
        return (allocations[empId] * fuelPrice) || 0;
    };

    const handleSubmit = async () => {
        if (!month) return alert("Please select a month");
        if (fuelPrice <= 0) return alert("Please enter a valid fuel price");

        const payload = {
            month,
            type: 'Fuel Allowance',
            data: employees.map(emp => ({
                employee_id: emp.id,
                name: emp.name,
                liters: allocations[emp.id] || 0,
                amount: parseFloat(calculateTotal(emp.id)),
                reason: splitResults[emp.id]?.reason || `Price: ${fuelPrice}`
            })).filter(item => item.amount > 0)
        };

        if (payload.data.length === 0) return alert("No fuel allowances to submit");

        setLoading(true);
        try {
            await api.post('/financial/requests', payload);
            alert("Fuel allowance request sent to payroll for " + month);
            // Don't switch tabs, just refresh data
            fetchRequests();
            fetchMonthStatus();
        } catch (error) {
            alert("Failed to submit request: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Approve this request? This will update and LOCK the salary structures for all included employees.")) return;

        try {
            await api.post(`/financial/requests/${id}/approve`);
            alert("Request approved and processed.");
            fetchRequests();
        } catch (error) {
            alert("Approval failed: " + (error.response?.data?.message || error.message));
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Reject this request? This will mark it as rejected and no changes will be made.")) return;

        try {
            await api.post(`/financial/requests/${id}/reject`);
            alert("Request rejected.");
            fetchRequests();
        } catch (error) {
            alert("Rejection failed: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white">
                            <Fuel size={24} />
                        </div>
                        Fuel Allowance Management
                    </h2>
                    <p className="text-slate-500 font-medium mt-2 max-w-xl">
                        Verify fixed quotas, update monthly fuel price, and submit for approval.
                    </p>
                </div>

                {/* Monthly Status Indicator */}
                {!loading && (
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl border shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 ${monthStatus.transferred
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : monthStatus.exists
                            ? 'bg-blue-50 border-blue-100 text-blue-700'
                            : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${monthStatus.transferred ? 'bg-emerald-500 text-white' : monthStatus.exists ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                            {monthStatus.transferred ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Monthly Status: {month}</p>
                            <p className="font-black text-sm uppercase tracking-tight">
                                {monthStatus.transferred ? 'Transferred to Payroll' :
                                    monthStatus.exists ? 'Request Sent (Pending Approval)' :
                                        'Pending Transfer'}
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
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                                <SettingsIcon /> Configuration
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Month</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="month"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-sm outline-none focus:border-blue-500 transition-all text-slate-800"
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Price (LKR/L)</label>
                                        {priceSaving && <span className="text-[9px] font-bold text-blue-500 animate-pulse">Saving...</span>}
                                    </div>
                                    <div className="relative">
                                        <Droplet className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-sm outline-none focus:border-blue-500 transition-all text-slate-800"
                                            value={fuelPrice}
                                            onChange={(e) => handlePriceChange(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold px-2">Used as fallback if no history exists.</p>
                                </div>

                                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Total Impact ({month})</p>
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-blue-900 tracking-tight">
                                            LKR {employees.reduce((sum, emp) => sum + (parseFloat(calculateTotal(emp.id)) || 0), 0).toLocaleString()}
                                        </p>
                                        {calculating && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-1"></div>}
                                    </div>
                                </div>

                                {/* Scraper Action */}
                                <div className="pt-2">
                                    <button
                                        onClick={handleTriggerScrape}
                                        disabled={isScraping}
                                        className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Fuel size={14} className={isScraping ? "animate-spin" : ""} /> {isScraping ? 'Syncing...' : 'Sync Fuel Prices Now'}
                                    </button>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || monthStatus.exists}
                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {loading ? 'Processing...' : monthStatus.exists ? <><CheckCircle size={18} /> Already Sent</> : <><Save size={18} /> Send to Payroll</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <div className="lg:col-span-3 space-y-6">
                        {monthStatus.exists && (
                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-6 flex items-center gap-6 animate-in zoom-in duration-500">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-emerald-900 uppercase tracking-tight">Data Sent to Payroll</h4>
                                    <p className="text-emerald-700 text-xs font-medium">The fuel allowance request for {month} has been successfully submitted and is awaiting approval.</p>
                                </div>
                            </div>
                        )}

                        {/* Price History Mini Table */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                        <History size={20} className="text-blue-400" /> Price Audit Trail
                                    </h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Found {fuelHistory.length} historical changes</p>
                                </div>
                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-400">
                                    Daily Split Active
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {fuelHistory.slice(0, 4).map((fh, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{new Date(fh.effective_from_date).toLocaleDateString('en-GB')}</p>
                                        <p className="text-lg font-black tracking-tight">Rs. {parseFloat(fh.price_per_liter).toFixed(2)}</p>
                                        <p className="text-[7px] font-bold text-blue-400 uppercase tracking-tighter mt-1">{fh.source}</p>
                                    </div>
                                ))}
                                {fuelHistory.length > 4 && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">+{fuelHistory.length - 4} More</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee Identity</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Liters (Quota)</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Calculated Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-slate-400 italic">
                                                    Fetching fuel quota data...
                                                </td>
                                            </tr>
                                        ) : error ? (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-rose-500 font-medium italic">
                                                    {error}
                                                </td>
                                            </tr>
                                        ) : employees.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-slate-400 italic">
                                                    No active employees found in the system.
                                                </td>
                                            </tr>
                                        ) : (
                                            employees.map((emp) => (
                                                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                                                                {emp.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                                                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{emp.designation || 'Staff'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="inline-flex items-center bg-slate-100 border-2 border-slate-200 rounded-xl px-2 py-1 shadow-sm opacity-75">
                                                            <Droplet size={14} className="text-slate-400 ml-2" />
                                                            <input
                                                                type="number"
                                                                className="w-20 text-center py-2 font-black text-slate-500 outline-none bg-transparent cursor-not-allowed"
                                                                value={allocations[emp.id] ?? ''}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </td>
                                                     <td className="px-8 py-6 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="text-lg font-black text-slate-900">
                                                                    {Number(calculateTotal(emp.id)).toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">LKR</span>
                                                            </div>
                                                            {splitResults[emp.id]?.reason && (
                                                                <p className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 max-w-[200px] truncate" title={splitResults[emp.id].reason}>
                                                                    {splitResults[emp.id].reason}
                                                                </p>
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
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6">
                    {requests.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                            <History size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">No requests found.</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all group">
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
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{req.month}</h4>
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
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                LKR {req.data.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()}
                                            </p>
                                        </div>

                                        {req.status === 'Pending' && (['Admin', 'HR Manager'].includes(user.role)) && (
                                            <button
                                                onClick={() => window.location.href = '/governance'}
                                                className="bg-blue-50 text-blue-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                                            >
                                                Process in Governance
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {req.data.map((item, idx) => {
                                        const emp = employeeMap[item.employee_id];
                                        return (
                                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <div className="w-10 h-10 rounded-xl bg-white text-slate-400 flex items-center justify-center text-xs font-black shadow-sm">
                                                    {emp ? emp.name.charAt(0) : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]" title={emp ? emp.name : `ID: ${item.employee_id}`}>
                                                        {emp ? emp.name : (req.data.find(d => d.employee_id === item.employee_id)?.name || `ID: ${item.employee_id}`)}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black uppercase text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                                                            {item.liters} L
                                                        </span>
                                                        <span className="text-[10px] font-black text-blue-600">
                                                            LKR {Number(item.amount).toLocaleString()}
                                                        </span>
                                                    </div>
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

const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73-.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

export default FuelAllowance;