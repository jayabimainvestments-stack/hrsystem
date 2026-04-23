import React, { useState, useEffect } from 'react';
import { HandCoins, Plus, Search, Calendar, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const LoanManager = () => {
    const [loans, setLoans] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [newLoan, setNewLoan] = useState({
        customer_id: '',
        product_id: '',
        principal_amount: ''
    });

    const API_BASE = 'http://localhost:5001/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [loansRes, custRes, prodRes] = await Promise.all([
                axios.get(`${API_BASE}/dashboard/summary`), // Placeholder for real loans list
                axios.get(`${API_BASE}/customers`),
                axios.get(`${API_BASE}/loan-products`)
            ]);
            // For now, let's just get the customers and products for the modal
            setCustomers(custRes.data);
            setProducts(prodRes.data);
            
            // Mocking a few active loans for the UI list
            setLoans([
                { id: 2001, customer_name: 'Nimal Siripala', amount: 50000, balance: 42500, next_due: '2026-04-29', status: 'Active' },
                { id: 2002, customer_name: 'Kumara Perera', amount: 30000, balance: 28000, next_due: '2026-04-30', status: 'Active' }
            ]);
        } catch (err) {
            console.error('Error fetching loan data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLoan = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/loans`, newLoan);
            setShowModal(false);
            fetchData();
            alert('Loan disbursed successfully and repayment schedule generated!');
        } catch (err) {
            alert('Error creating loan: ' + err.message);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold">Loan Portfolio</h2>
                    <p className="text-gray-400 mt-1">Track active disbursements and issue new micro-loans.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus size={20} />
                    Issue New Loan
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Active Loans List */}
                <div className="col-span-2 glass-card !p-0 overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/[0.02] flex justify-between">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input type="text" placeholder="Search Loan ID or Customer..." className="input-field pl-10 py-1.5 text-sm w-80" />
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Loan ID / Customer</th>
                                <th className="px-6 py-4 font-semibold text-right">Disbursed Amount</th>
                                <th className="px-6 py-4 font-semibold text-right">Outstanding</th>
                                <th className="px-6 py-4 font-semibold text-center">Next Due</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loans.map((loan) => (
                                <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-mono text-gray-500">#{loan.id}</p>
                                        <p className="font-bold group-hover:text-brand-accent transition-colors">{loan.customer_name}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">LKR {loan.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-bold text-orange-400">LKR {loan.balance.toLocaleString()}</p>
                                        <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                                            <div className="bg-brand-accent h-full" style={{ width: `${(1 - loan.balance/loan.amount) * 100}%` }} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                                            <Calendar size={14} />
                                            {loan.next_due}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">
                                            {loan.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Right Panel: Highlights */}
                <div className="space-y-6">
                    <div className="glass-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <HandCoins className="text-brand-accent" size={20} />
                            Active Products
                        </h3>
                        <div className="space-y-4">
                            {products.map(p => (
                                <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold">{p.name}</p>
                                        <span className="text-xs bg-brand-accent px-2 py-0.5 rounded text-white">{p.interest_rate}%</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{p.default_installments} {p.frequency} Installments</p>
                                </div>
                            ))}
                            {products.length === 0 && <p className="text-sm text-gray-600">No products configured.</p>}
                        </div>
                    </div>
                    
                    <div className="glass-card bg-orange-500/10 border-orange-500/20">
                        <div className="flex items-center gap-3 text-orange-400 mb-3">
                            <AlertCircle size={24} />
                            <h3 className="font-bold">Arrears Risk</h3>
                        </div>
                        <p className="text-sm text-orange-300/80">3 loans are currently 2+ weeks overdue. Check the Arrears Report for details.</p>
                    </div>
                </div>
            </div>

            {/* Issue Loan Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
                    <div className="glass-card max-w-lg w-full border-t-4 border-brand-accent shadow-[0_0_80px_rgba(59,130,246,0.2)]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-bold">Issue New Micro-Loan</h3>
                                <p className="text-gray-400 text-sm">Select a customer and product to begin.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateLoan} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Customer</label>
                                    <select 
                                        className="input-field w-full"
                                        value={newLoan.customer_id}
                                        onChange={e => setNewLoan({...newLoan, customer_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Choose Borrower...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.nic})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Loan Product</label>
                                    <select 
                                        className="input-field w-full"
                                        value={newLoan.product_id}
                                        onChange={e => {
                                            setNewLoan({...newLoan, product_id: e.target.value});
                                        }}
                                        required
                                    >
                                        <option value="">Select Terms...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} - {p.interest_rate}%</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Principal Amount (LKR)</label>
                                <input 
                                    type="number" 
                                    className="input-field w-full text-2xl font-bold py-4 text-center tracking-tighter" 
                                    placeholder="0.00"
                                    value={newLoan.principal_amount}
                                    onChange={e => setNewLoan({...newLoan, principal_amount: e.target.value})}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2 text-center">The repayment schedule will be generated automatically upon disbursement.</p>
                            </div>

                            <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors">Abort</button>
                                <button type="submit" className="flex-2 btn-primary px-10 py-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                    Disburse Fund
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanManager;
