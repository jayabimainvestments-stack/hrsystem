import React, { useState, useEffect } from 'react';
import {
    CreditCard, Save, Plus, History, CheckCircle2, XCircle,
    Calendar, DollarSign, User, ShieldCheck, ArrowRight,
    Clock, AlertCircle, Trash2
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const LoanInstallments = () => {
    const [activeTab, setActiveTab] = useState('apply'); // 'apply', 'pending', 'active'
    const [employees, setEmployees] = useState([]);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        loan_date: new Date().toISOString().split('T')[0],
        total_amount: '',
        installment_amount: '',
        num_installments: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchEmployees();
        fetchLoans();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setEmployees([]);
        }
    };

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/loans');
            setLoans(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Failed to fetch loans');
            setLoans([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newForm = { ...prev, [name]: value };

            // Auto-calculate end date if num_installments and start_date are present
            if ((name === 'num_installments' || name === 'start_date') && newForm.num_installments && newForm.start_date) {
                const start = new Date(newForm.start_date);
                const end = new Date(start.setMonth(start.getMonth() + parseInt(newForm.num_installments) - 1));
                newForm.end_date = end.toISOString().split('T')[0];
            }

            // Auto-calculate installment if total and num are present
            if ((name === 'total_amount' || name === 'num_installments') && newForm.total_amount && newForm.num_installments) {
                newForm.installment_amount = (parseFloat(newForm.total_amount) / parseInt(newForm.num_installments)).toFixed(2);
            }

            return newForm;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/loans', formData);
            toast.success('Loan application submitted for approval');
            setFormData({
                employee_id: '',
                loan_date: new Date().toISOString().split('T')[0],
                total_amount: '',
                installment_amount: '',
                num_installments: '',
                start_date: '',
                end_date: '',
                reason: ''
            });
            fetchLoans();
            setActiveTab('pending');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        }
    };

    const handleAction = async (id, action) => {
        try {
            await api.post(`/loans/${id}/${action}`);
            toast.success(`Loan ${action}ed successfully`);
            fetchLoans();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${action} loan`);
        }
    };

    const pendingLoans = Array.isArray(loans) ? loans.filter(l => l.status === 'Pending') : [];
    const activeLoans = Array.isArray(loans) ? loans.filter(l => l.status === 'Approved' || l.status === 'Completed') : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                            <CreditCard size={24} />
                        </div>
                        Loan Tracker
                    </h3>
                    <p className="text-slate-500 text-sm font-bold mt-1 ml-14">Automatic Payroll Deductions & Installment Management</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                    {[
                        { id: 'apply', icon: Plus, label: 'Apply' },
                        { id: 'pending', icon: Clock, label: `Pending (${pendingLoans.length})` },
                        { id: 'active', icon: History, label: `Active (${activeLoans.length})` }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'apply' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-10">
                        <div className="max-w-3xl mx-auto">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Employee Selection */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Select Employee</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <select
                                                name="employee_id"
                                                value={formData.employee_id}
                                                onChange={handleInput}
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                                            >
                                                <option value="">Select an employee...</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Loan Date */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Issue Date</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <Calendar size={18} />
                                            </div>
                                            <input
                                                type="date"
                                                name="loan_date"
                                                value={formData.loan_date}
                                                onChange={handleInput}
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Total Amount */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Total Loan Amount (LKR)</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <DollarSign size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="total_amount"
                                                value={formData.total_amount}
                                                onChange={handleInput}
                                                placeholder="e.g. 50000"
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Number of Installments */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Installment Count (Months)</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <History size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="num_installments"
                                                value={formData.num_installments}
                                                onChange={handleInput}
                                                placeholder="e.g. 10"
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Start Date */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Deduction Start Date</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                <Clock size={18} />
                                            </div>
                                            <input
                                                type="date"
                                                name="start_date"
                                                value={formData.start_date}
                                                onChange={handleInput}
                                                required
                                                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Calculated End Date (Disabled) */}
                                    <div className="space-y-2 opacity-60">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 text-emerald-600">Calculated End Date</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <input
                                                type="date"
                                                readOnly
                                                value={formData.end_date}
                                                className="w-full bg-emerald-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-emerald-700 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Reason for Loan */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Reason for Loan (Optional)</label>
                                    <textarea
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleInput}
                                        placeholder="Briefly describe the purpose of this loan..."
                                        className="w-full bg-slate-50 border-none rounded-3xl py-4 px-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px] resize-none"
                                    />
                                </div>

                                {/* Summary Card */}
                                <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100/50 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-blue-900">Monthly Deduction</h4>
                                            <p className="text-2xl font-black text-blue-600">LKR {formData.installment_amount || '0.00'}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                        Apply for Approval <ArrowRight size={16} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                        {pendingLoans.length === 0 ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <ShieldCheck size={48} className="opacity-20" />
                                <p className="font-bold text-sm">No pending loan requests found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-50">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Employee</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loan Details</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Requested By</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pendingLoans.map(loan => (
                                            <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                                            {loan.employee_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-700">{loan.employee_name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">Issued: {new Date(loan.loan_date).toLocaleDateString()}</div>
                                                            {loan.reason && <div className="text-[9px] font-medium text-blue-500 mt-1 italic max-w-[200px] truncate">"{loan.reason}"</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <div className="text-sm font-black text-slate-700">LKR {parseFloat(loan.total_amount).toLocaleString()}</div>
                                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                                            {loan.num_installments} x LKR {parseFloat(loan.installment_amount).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                                        <User size={12} /> {loan.requester_name}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => window.location.href = '/governance'}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-sm ml-auto"
                                                    >
                                                        Process in Governance <ArrowRight size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'active' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                        {activeLoans.length === 0 ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <ShieldCheck size={48} className="opacity-20" />
                                <p className="font-bold text-sm">No active or completed loans found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-50">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Employee</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loan Details</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progress</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Remaining</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activeLoans.map(loan => (
                                            <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">
                                                            {loan.employee_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-700">{loan.employee_name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">Issued: {new Date(loan.loan_date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <div className="text-sm font-black text-slate-700">LKR {parseFloat(loan.total_amount).toLocaleString()}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            Inst: LKR {parseFloat(loan.installment_amount).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            <span>{loan.installments_paid} of {loan.num_installments} Paid</span>
                                                            <span>{Math.round((loan.installments_paid / loan.num_installments) * 100)}%</span>
                                                        </div>
                                                        <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                                                style={{ width: `${(loan.installments_paid / loan.num_installments) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-sm font-black text-emerald-600">
                                                        LKR {(parseFloat(loan.total_amount) - (loan.installments_paid * parseFloat(loan.installment_amount))).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${loan.status === 'Completed'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {loan.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoanInstallments;