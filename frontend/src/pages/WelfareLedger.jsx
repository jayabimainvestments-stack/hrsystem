import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Plus,
    Calendar,
    FileText,
    Search,
    TrendingUp,
    AlertCircle,
    ChevronRight,
    Loader2,
    DollarSign,
    PartyPopper,
    Trash2
} from 'lucide-react';

const WelfareLedger = () => {
    const [ledger, setLedger] = useState({ transactions: [], balance: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/welfare/ledger?month=${selectedMonth}`);
            setLedger(data);
        } catch (error) {
            console.error("Error fetching ledger", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, [selectedMonth]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/welfare/expense', expenseForm);
            alert("Expense recorded successfully!");
            setShowExpenseModal(false);
            setExpenseForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            fetchLedger();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to record expense");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setSaving(true);
        try {
            await api.delete(`/welfare/ledger/${deleteId}`);
            setShowDeleteModal(false);
            setDeleteId(null);
            fetchLedger();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete entry");
        } finally {
            setSaving(false);
        }
    };

    const filteredTransactions = ledger.transactions.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.transaction_date?.includes(searchTerm)
    );

    if (loading && !ledger.transactions.length) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary-600" size={48} />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Header Container */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[10px] font-black uppercase tracking-widest mb-4">
                            <PartyPopper size={12} /> Internal Welfare Fund
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            WELFARE <span className="text-primary-600">LEDGER</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">Track internal fund collections and staff activity expenses.</p>
                    </div>

                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="btn-primary group shadow-2xl shadow-primary-200"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        Record Expense
                    </button>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="card-premium p-8 bg-slate-900 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/20 blur-3xl -mr-16 -mt-16 group-hover:bg-primary-600/30 transition-colors"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Available Balance</p>
                        <div className="flex items-end justify-between">
                            <h2 className="text-4xl font-black tabular-nums tracking-tighter">
                                <span className="text-sm text-slate-500 mr-2">LKR</span>
                                {ledger.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <div className="p-3 bg-white/10 rounded-2xl text-primary-400">
                                <Wallet size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-8 group">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Collections</p>
                        <div className="flex items-end justify-between">
                            <h2 className="text-4xl font-black tabular-nums tracking-tighter text-slate-900">
                                <span className="text-sm text-slate-400 mr-2">LKR</span>
                                {ledger.transactions.filter(t => t.type === 'Collection').reduce((s, t) => s + parseFloat(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <ArrowUpCircle size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-8 group">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Expenses</p>
                        <div className="flex items-end justify-between">
                            <h2 className="text-4xl font-black tabular-nums tracking-tighter text-slate-900">
                                <span className="text-sm text-slate-400 mr-2">LKR</span>
                                {ledger.transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + parseFloat(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <ArrowDownCircle size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Table Section */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 font-semibold text-sm focus:ring-4 ring-primary-500/10 transition-all outline-none"
                                    placeholder="Search details..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full md:w-auto">
                                <Calendar size={16} className="text-primary-500" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-transparent border-none outline-none font-black text-xs text-slate-700 uppercase"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-lg">
                            <TrendingUp size={12} className="text-primary-500" />
                            Live Ledger Sync Active
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-8 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="font-bold text-slate-700 tabular-nums">
                                                    {new Date(tx.transaction_date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                                    <FileText size={14} />
                                                </div>
                                                <span className="font-medium text-slate-600">{tx.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${tx.type === 'Collection'
                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black tabular-nums text-slate-900 whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-lg transition-all ${tx.type === 'Collection' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {tx.type === 'Collection' ? '+' : '-'} {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">LKR</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {tx.type === 'Expense' && (
                                                <button
                                                    onClick={() => {
                                                        setDeleteId(tx.id);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group/del"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center text-slate-400 italic">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <AlertCircle size={48} />
                                                <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No transactions found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Expense Modal ... stays same ... */}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[120] p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-rose-600 text-white relative overflow-hidden text-center">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Trash2 size={40} />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Confirm Deletion</h2>
                                <p className="text-rose-100 text-[10px] font-black uppercase tracking-[0.2em] mt-2">This action cannot be undone</p>
                            </div>
                        </div>
                        <div className="p-10 space-y-8 text-center">
                            <p className="text-slate-600 font-bold leading-relaxed">
                                Are you sure you want to remove this <span className="text-rose-600">expense record</span> from the ledger? This will permanently adjust the fund balance.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmDelete}
                                    disabled={saving}
                                    className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <Trash2 size={18} /> Yes, Delete Record
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDeleteId(null);
                                    }}
                                    className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    No, Keep it
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Record Expense</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Deduct from internal welfare fund</p>
                            </div>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-sm focus:ring-4 ring-primary-500/10 transition-all outline-none"
                                        value={expenseForm.date}
                                        onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Amount (LKR)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-black text-sm focus:ring-4 ring-primary-500/10 transition-all outline-none tabular-nums"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose / Description</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-6 text-slate-400" size={16} />
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="e.g. Staff Member Birthday Party Cake..."
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-sm focus:ring-4 ring-primary-500/10 transition-all outline-none resize-none"
                                        value={expenseForm.description}
                                        onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowExpenseModal(false)}
                                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : "Record Fund Exit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WelfareLedger;
