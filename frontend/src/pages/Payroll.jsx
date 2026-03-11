import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../services/api';
import {
    CreditCard,
    FileText,
    Download,
    Plus,
    Filter,
    Calendar,
    Search,
    TrendingUp,
    AlertCircle,
    ChevronRight,
    CheckCircle2,
    Shield,
    Trash2,
    Wallet
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AddPayroll from '../components/AddPayroll';
import { useAuth } from '../context/AuthContext';

import { useNavigate } from 'react-router-dom';

const Payroll = () => {
    const navigate = useNavigate();
    const [payrolls, setPayrolls] = useState([]);
    const [rawLiabilities, setRawLiabilities] = useState([]);
    const [liabilities, setLiabilities] = useState({ statutory: 0, welfare: 0, total: 0 });
    const [welfareBalance, setWelfareBalance] = useState(0);
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [breakdown, setBreakdown] = useState(null); // { month, type, data }
    const [showPaymentModal, setShowPaymentModal] = useState(null); // liability record
    const [paymentForm, setPaymentForm] = useState({ ref: '', date: new Date().toISOString().split('T')[0], method: 'Bank Transfer', notes: '' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'HR Manager';

    useEffect(() => {
        fetchData();
    }, [isAdmin]); // Re-fetch if role changes (unlikely but safe)

    useEffect(() => {
        if (payrolls.length > 0) {
            const months = [...new Set(payrolls.map(p => p.month))].sort().reverse();
            if (months.length > 0 && !months.includes(selectedMonth)) {
                setSelectedMonth(months[0]);
            }
        }
    }, [payrolls]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Conditional fetching based on role
            const requests = [
                api.get(isAdmin ? '/payroll' : '/payroll/my')
            ];

            // Only fetch liabilities if Admin
            if (isAdmin) {
                requests.push(api.get('/payroll/liabilities'));
                requests.push(api.get('/welfare/ledger'));
            }

            const responses = await Promise.all(requests);
            const payrollRes = responses[0];
            const liabRes = isAdmin ? responses[1] : { data: [] };

            setPayrolls(payrollRes.data);
            setRawLiabilities(liabRes.data || []);
            if (responses[2]) {
                setWelfareBalance(responses[2].data.balance);
            }

            // Aggregate liabilities array into summary object for the selected month
            const liabData = liabRes.data || [];
            const filteredLiabs = liabData.filter(l => l.month === selectedMonth);
            const summary = {
                epf8: filteredLiabs.filter(l => l.type === 'EPF 8%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                epf12: filteredLiabs.filter(l => l.type === 'EPF 12%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                etf3: filteredLiabs.filter(l => l.type === 'ETF 3%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                welfare: filteredLiabs.filter(l => l.type === 'Welfare 2%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                statutory: filteredLiabs.reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
            };
            setLiabilities(summary);
        } catch (error) {
            console.error("Error fetching payroll data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBreakdown = async (month, type) => {
        try {
            const response = await api.get(`/payroll/liabilities/breakdown?month=${month}&type=${type}`);
            setBreakdown({ month, type, data: response.data });
        } catch (error) {
            alert('Failed to fetch contribution matrix');
        }
    };

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        if (!showPaymentModal) return;

        try {
            const pending = parseFloat(showPaymentModal.total_payable) - parseFloat(showPaymentModal.paid_amount || 0);
            await api.post('/payroll/liabilities/pay', {
                id: showPaymentModal.id,
                amount: pending,
                payment_ref: paymentForm.ref,
                payment_date: paymentForm.date,
                payment_method: paymentForm.method,
                notes: paymentForm.notes
            });
            alert('Payment recorded successfully');
            setShowPaymentModal(null);
            fetchData();
        } catch (error) {
            alert('Payment failed');
        }
    };

    const handleReview = async (id) => {
        if (!window.confirm('Mark this payroll as Reviewed?')) return;
        try {
            await api.post(`/payroll/${id}/review`);
            alert('Payroll marked as Reviewed');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Action failed');
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Approve and Lock this payroll? This action is irreversible.')) return;
        try {
            await api.post(`/payroll/${id}/approve`);
            alert('Payroll Approved and Locked');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Action failed');
        }
    };

    const handleApproveLiability = async (id) => {
        if (!window.confirm('Approve this statutory remittance?')) return;
        try {
            await api.post(`/payroll/liabilities/${id}/approve`);
            alert('Remittance Approved');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Approval failed');
        }
    };
    const handleDownloadPayslip = async (id, month) => {
        try {
            const response = await api.get(`/reports/payroll/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payslip-${month}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to download payslip');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('PERMANENTLY DELETE this payroll record? This action will reverse all associated liabilities.')) return;
        try {
            await api.delete(`/payroll/${id}`);
            alert('Payroll record deleted and liabilities reversed.');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const filteredPayrolls = payrolls.filter(p => {
        const name = p.employee_name || '';
        const month = p.month || '';
        const searchLower = search.toLowerCase();
        return name.toLowerCase().includes(searchLower) || month.toLowerCase().includes(searchLower);
    });

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );



    return (
        <div className="min-h-screen bg-[#fafbff] pb-20 font-sans antialiased text-slate-900">
            <Navbar />

            {/* Premium Mesh Gradient Hero Section */}
            <div className="relative overflow-hidden bg-slate-950 pt-24 pb-48 px-4 sm:px-6 lg:px-8">
                {/* Mesh Gradient Orbs */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-40 -ml-40 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-violet-600/5 rounded-full blur-[150px] pointer-events-none skew-y-12"></div>

                <div className="relative max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                <Shield size={12} /> Financial Operations
                            </div>
                            <h1 className="text-5xl font-black text-white tracking-tight flex items-center gap-4">
                                PAYROLL <span className="text-primary-500">INTELLIGENCE</span>
                            </h1>
                            <p className="text-slate-400 font-medium text-lg max-w-xl leading-relaxed">
                                Advanced treasury distribution and statutory compliance management system.
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-4">
                                <select
                                    className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest outline-none focus:bg-white/10 transition-all"
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value);
                                        // Trigger re-aggregation
                                        const filteredLiabs = rawLiabilities.filter(l => l.month === e.target.value);
                                        setLiabilities({
                                            epf8: filteredLiabs.filter(l => l.type === 'EPF 8%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                                            epf12: filteredLiabs.filter(l => l.type === 'EPF 12%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                                            etf3: filteredLiabs.filter(l => l.type === 'ETF 3%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                                            welfare: filteredLiabs.filter(l => l.type === 'Welfare 2%').reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                                            statutory: filteredLiabs.reduce((sum, l) => sum + (parseFloat(l.total_payable) - parseFloat(l.paid_amount || 0)), 0),
                                        });
                                    }}
                                >
                                    {[...new Set(payrolls.map(p => p.month))].sort().reverse().map(m => (
                                        <option key={m} value={m} className="text-slate-900">{m}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setShowAdd(true)}
                                    className="group relative overflow-hidden bg-white text-slate-900 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    <div className="relative z-10 flex items-center gap-3">
                                        <Plus size={16} strokeWidth={3} className="text-primary-600" /> Generate Payroll
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary-400/0 via-primary-600/5 to-primary-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Glassmorphic Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {[
                            { label: 'Total Net Salary', value: (payrolls.filter(p => p.month === selectedMonth).reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0)).toLocaleString(), color: 'primary' },
                            { label: 'Employees Paid', value: new Set(payrolls.filter(p => p.month === selectedMonth).map(p => p.user_id)).size, color: 'emerald' },
                            { label: 'EPF 8%', value: (liabilities.epf8 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'blue' },
                            { label: 'EPF 12%', value: (liabilities.epf12 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'indigo' },
                            { label: 'ETF 3%', value: (liabilities.etf3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'amber' },
                            { label: 'Welfare 2%', value: (liabilities.welfare || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'rose' }
                        ].map((stat, i) => (
                            <div key={i} className="group relative overflow-hidden bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-2xl transition-all hover:bg-white/10 hover:border-white/20">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-${stat.color}-500/20 transition-colors`}></div>
                                <p className={`text-[10px] font-black text-${stat.color}-400 uppercase tracking-[0.2em] mb-2`}>{stat.label}</p>
                                <p className="text-2xl font-black text-white tabular-nums tracking-tighter">
                                    {stat.label !== 'Employees Paid' && <span className="text-xs align-top mr-1 text-slate-400">LKR</span>}
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 -mt-24 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-white rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/80 backdrop-blur-xl">
                        <div className="relative w-full md:w-[450px] group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={16} />
                            <input
                                className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-6 py-5 font-bold text-sm focus:bg-white focus:ring-4 ring-primary-500/10 transition-all outline-none text-slate-700 shadow-sm"
                                placeholder="Search by name or period..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            <button className="h-14 w-14 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-white hover:text-primary-600 hover:shadow-lg transition-all border border-transparent hover:border-primary-50">
                                <Filter size={16} />
                            </button>
                            <div className="h-14 w-px bg-slate-100 mx-2"></div>
                            <button className="h-14 px-8 gap-3 flex items-center justify-center bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-slate-100 active:scale-95">
                                <TrendingUp size={14} /> Analytics
                            </button>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference</th>
                                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                                        <th className="px-8 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Month / Year</th>
                                        <th className="px-8 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Salary</th>
                                        <th className="px-8 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayrolls.map(pay => (
                                        <tr key={pay.id} className="group transition-all">
                                            <td className="bg-slate-50/60 rounded-l-[1.5rem] px-8 py-6 first:border-l border-y border-slate-50 first:shadow-sm">
                                                <span className="font-mono text-xs font-black text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                    #{pay.id.toString().padStart(4, '0')}
                                                </span>
                                            </td>
                                            <td className="bg-slate-50/60 border-y border-slate-50 px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary-100">
                                                        {(pay.employee_name || 'E').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-base leading-none mb-1 tracking-tight uppercase">{pay.employee_name}</p>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-500/60 tabular-nums">[{pay.emp_code || 'NO_CODE'}]</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="bg-slate-50/60 border-y border-slate-50 px-8 py-6 text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm tabular-nums">
                                                    <Calendar size={10} className="text-primary-500" /> {pay.month} {pay.year}
                                                </div>
                                            </td>
                                            <td className="bg-slate-50/60 border-y border-slate-50 px-8 py-6 text-center">
                                                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${pay.status === 'Approved' ? 'bg-emerald-500 text-white' :
                                                    pay.status === 'Reviewed' ? 'bg-amber-400 text-white' :
                                                        'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {pay.status || 'Draft'}
                                                </span>
                                            </td>
                                            <td className="bg-slate-50/60 border-y border-slate-50 px-8 py-6 text-right">
                                                <p className="text-xl font-black text-slate-900 tabular-nums tracking-tighter">
                                                    <span className="text-[10px] text-slate-400 mr-1">LKR</span>{Number(pay.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </td>
                                            <td className="bg-slate-50/60 rounded-r-[1.5rem] border-y last:border-r border-slate-50 px-8 py-6 last:shadow-sm">
                                                <div className="flex items-center justify-center gap-3">
                                                    {(pay.status === 'Internal' || !pay.status) && isAdmin && (
                                                        <button
                                                            onClick={() => handleReview(pay.id)}
                                                            className="h-10 px-4 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            Verify
                                                        </button>
                                                    )}
                                                    {pay.status === 'Reviewed' && isAdmin && (
                                                        <button
                                                            onClick={() => handleApprove(pay.id)}
                                                            className="h-10 px-4 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            Lock
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDownloadPayslip(pay.id, pay.month)}
                                                        className="h-10 w-10 flex items-center justify-center bg-white text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-md border border-slate-100"
                                                        title="Archive"
                                                    >
                                                        <Download size={14} />
                                                    </button>

                                                    {isAdmin && pay.status !== 'Approved' && (
                                                        <button
                                                            onClick={() => handleDelete(pay.id)}
                                                            className="h-10 w-10 flex items-center justify-center bg-white text-rose-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all shadow-md border border-slate-100 group"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredPayrolls.length === 0 && (
                                <div className="py-32 text-center">
                                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                        <FileText size={48} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">No Records Found</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">No payroll entries recorded for the current search.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Statutory Compliance & Treasury Portal */}
                {isAdmin && (
                    <div className="mt-16 space-y-12">
                        <div className="bg-[#0f172a] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48 group-hover:bg-primary-600/20 transition-all duration-1000"></div>

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-primary-600 text-white rounded-[1.8rem] shadow-2xl shadow-primary-500/40">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black uppercase tracking-tight">Statutory <span className="text-primary-500">Compliance</span></h3>
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Remittance & Audit Intelligence</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {[
                                            { label: 'Bank Export', fn: () => prompt("Enter Month (YYYY-MM):"), icon: CreditCard },
                                            { label: 'Journal', fn: () => prompt("Enter Month (YYYY-MM):"), icon: FileText },
                                            { label: 'Consolidated Sheet', fn: () => navigate('/payroll/consolidated-sheet'), icon: FileText },
                                            { label: 'EPF Form C', fn: () => navigate('/payroll/epf-form-c'), icon: FileText, color: 'text-primary-600' },
                                            { label: 'ETF Form R4', fn: () => navigate('/payroll/etf-form-r4'), icon: FileText, color: 'text-indigo-600' }
                                        ].map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    const month = action.fn();
                                                    const endpoint = action.label === 'Bank Export' ? 'bank' : 'journal';
                                                    if (month) window.open(`${BASE_URL}/api/reports/payroll/export/${endpoint}?month=${month}`, '_blank');
                                                }}
                                                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 border-dashed"
                                            >
                                                <action.icon size={12} className="text-primary-400" /> {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-separate border-spacing-y-3">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Month / Year</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Amount</th>
                                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rawLiabilities.filter(l => l.type !== 'Welfare 2%').slice(0, 8).map(liab => (
                                                <tr key={liab.id} className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl group/row hover:bg-white/10 transition-all">
                                                    <td className="px-6 py-5 rounded-l-2xl font-black text-sm text-slate-300">{liab.month}</td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${liab.type === 'EPF 8%' ? 'bg-blue-500/20 text-blue-300' :
                                                            liab.type === 'EPF 12%' ? 'bg-indigo-500/20 text-indigo-300' :
                                                                liab.type === 'ETF 3%' ? 'bg-amber-500/20 text-amber-300' :
                                                                    liab.type === 'Welfare 2%' ? 'bg-rose-500/20 text-rose-300' :
                                                                        'bg-slate-500/20 text-slate-300'
                                                            }`}>
                                                            {liab.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black tabular-nums text-lg">
                                                        <span className="text-[10px] text-slate-500 mr-1">LKR</span>{(parseFloat(liab.total_payable) - parseFloat(liab.paid_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                liab.status === 'Paid' ? 'bg-emerald-500 text-white' : 
                                                                liab.status === 'Remitted' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' :
                                                                'bg-amber-500/20 text-amber-400'
                                                                }`}>
                                                                {liab.status}
                                                            </span>
                                                            {liab.payment_ref && <span className="text-[8px] text-slate-500 font-mono">REF: {liab.payment_ref}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right rounded-r-2xl">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => fetchBreakdown(liab.month, liab.type)}
                                                                className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Breakdown
                                                            </button>
                                                            {liab.status !== 'Paid' && liab.status !== 'Remitted' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setShowPaymentModal(liab);
                                                                        setPaymentForm({ ...paymentForm, notes: `Settlement for ${liab.type} - ${liab.month}` });
                                                                    }}
                                                                    className="h-10 px-6 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-600/20 transition-all active:scale-95"
                                                                >
                                                                    Settle
                                                                </button>
                                                            )}
                                                            {liab.status === 'Remitted' && (
                                                                <button
                                                                    onClick={() => handleApproveLiability(liab.id)}
                                                                    disabled={String(liab.remitted_by) === String(user?.id)}
                                                                    className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                                                                        String(liab.remitted_by) === String(user?.id) 
                                                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-white/5' 
                                                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                                                    }`}
                                                                    title={String(liab.remitted_by) === String(user?.id) ? "Segregation of Duties: You cannot approve your own remittance" : "Authorize Payment"}
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Welfare & Fund Status */}
                        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[100px] pointer-events-none -mr-32 -mt-32"></div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                                <div className="flex items-center gap-8">
                                    <div className="p-6 bg-primary-600/20 text-primary-400 rounded-[2rem] border border-primary-500/20">
                                        <Wallet size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Staff Welfare <span className="text-primary-500">Fund</span></h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-500/20">
                                                Internal Ledger System
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10 bg-white/5 p-10 rounded-[2.5rem] border border-white/10 flex-1 justify-between max-w-2xl backdrop-blur-md">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Total Fund Balance</p>
                                        <p className="text-5xl font-black text-white tracking-tighter tabular-nums">
                                            <span className="text-xl text-primary-500 mr-2 font-black italic">LKR</span>{welfareBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/welfare-ledger')}
                                        className="h-16 px-10 bg-white text-slate-900 hover:bg-primary-500 hover:text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                    >
                                        Manage Fund Ledger
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: Payment Settlement */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[110] p-6 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                            <div className="p-10 bg-slate-950 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] -mr-24 -mt-24"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">Authorize Settlement</h2>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Executing treasury remittance</p>
                                    </div>
                                    <button onClick={() => setShowPaymentModal(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group">
                                        <Plus size={20} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleProcessPayment} className="p-12 space-y-8">
                                <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settling Portion</p>
                                        <p className="text-2xl font-black text-slate-900">{showPaymentModal.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                                        <p className="text-3xl font-black text-blue-600 tabular-nums">
                                            <span className="text-sm text-blue-300 mr-1">LKR</span>{(parseFloat(showPaymentModal.total_payable) - parseFloat(showPaymentModal.paid_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Reference Number</label>
                                        <input
                                            required
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-sm focus:bg-white focus:border-blue-100 outline-none transition-all shadow-inner"
                                            placeholder="Chq / Bank Ref ID"
                                            value={paymentForm.ref}
                                            onChange={e => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Remittance Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-sm focus:bg-white focus:border-blue-100 outline-none transition-all shadow-inner"
                                            value={paymentForm.date}
                                            onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Notes</label>
                                    <textarea
                                        rows="3"
                                        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 font-bold text-sm focus:bg-white focus:border-blue-100 outline-none transition-all shadow-inner resize-none"
                                        placeholder="Add any treasury notes here..."
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(null)}
                                        className="px-10 py-5 bg-white text-slate-900 border border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                    >
                                        Verify & Settle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Contribution Matrix Breakdown */}
                {breakdown && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[110] p-6 animate-in zoom-in-95 duration-300">
                        <div className="bg-white w-full max-w-4xl rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col h-[80vh]">
                            <div className="p-12 bg-[#0f172a] text-white relative overflow-hidden flex-shrink-0">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest mb-4">
                                            Compliance Breakdown
                                        </div>
                                        <h2 className="text-4xl font-black uppercase tracking-tighter">{breakdown.type} Breakdown</h2>
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-2">Cycle: {breakdown.month} // Contribution List</p>
                                    </div>
                                    <button onClick={() => setBreakdown(null)} className="p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group">
                                        <Plus size={22} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 p-12 overflow-y-auto">
                                <div className="grid grid-cols-1 gap-4">
                                    {breakdown.data.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-blue-600 font-black">
                                                    {item.employee_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900">{item.employee_name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contribution Details</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-12">
                                                {breakdown.type === 'EPF' && (
                                                    <>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee (8%)</p>
                                                            <p className="font-black text-slate-700">{parseFloat(item.employee_portion).toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Employer (12%)</p>
                                                            <p className="font-black text-slate-700">{parseFloat(item.employer_portion).toLocaleString()}</p>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="text-right bg-blue-50 px-6 py-3 rounded-xl border border-blue-100">
                                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Liability</p>
                                                    <p className="text-xl font-black text-blue-600 tabular-nums"><span className="text-[10px] mr-1">LKR</span>{parseFloat(item.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-10 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregate Payload</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        <span className="text-xs text-slate-400 mr-1">LKR</span>{breakdown.data.reduce((sum, i) => sum + parseFloat(i.total), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setBreakdown(null)}
                                    className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                                >
                                    Dismiss Matrix
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Components */}
            {showAdd && <AddPayroll close={() => { setShowAdd(false); fetchData(); }} />}
        </div>
    );
};

export default Payroll;
