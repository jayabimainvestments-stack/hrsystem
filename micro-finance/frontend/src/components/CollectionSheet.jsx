import React, { useState, useEffect } from 'react';
import { Save, Users, Calendar, Wallet, CheckCircle2 } from 'lucide-react';

const CollectionSheet = () => {
    const [centers, setCenters] = useState([
        { id: 1, name: 'Kandalama' },
        { id: 2, name: 'SHAIR SETTLEMENT' }
    ]);
    const [selectedCenter, setSelectedCenter] = useState('');
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMembers = (centerId) => {
        setLoading(true);
        // Mocking API call for now
        setTimeout(() => {
            setMembers([
                { id: 1, name: 'Sunil Shantha', loan_id: 101, installment: 2500, paid: 2500, savings: 100 },
                { id: 2, name: 'Kamal Bandara', loan_id: 102, installment: 1800, paid: 1800, savings: 100 },
                { id: 3, name: 'Nimal Siripala', loan_id: 103, installment: 3000, paid: 0, savings: 0 },
            ]);
            setLoading(false);
        }, 800);
    };

    const handleAmountChange = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index][field] = parseFloat(value) || 0;
        setMembers(newMembers);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Center Collection Sheet</h2>
                    <p className="text-gray-400 mt-1">Record weekly payments for your center meetings.</p>
                </div>
                <div className="flex gap-4">
                    <select 
                        className="input-field min-w-[200px]"
                        value={selectedCenter}
                        onChange={(e) => {
                            setSelectedCenter(e.target.value);
                            fetchMembers(e.target.value);
                        }}
                    >
                        <option value="">Select Center...</option>
                        {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="btn-primary" disabled={!selectedCenter}>
                        <Save size={20} />
                        Submit All
                    </button>
                </div>
            </div>

            {selectedCenter ? (
                <div className="glass-card overflow-hidden !p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase">Customer</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Loan ID</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Expected</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Repayment (LKR)</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Savings (LKR)</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {members.map((member, idx) => (
                                <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                                                {member.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500 text-sm font-mono">#{member.loan_id}</td>
                                    <td className="px-6 py-4 text-right font-bold text-orange-400/80">{member.installment.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <input 
                                            type="number" 
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-right w-32 focus:border-blue-500 outline-none transition-all"
                                            value={member.paid}
                                            onChange={(e) => handleAmountChange(idx, 'paid', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <input 
                                            type="number" 
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-right w-24 focus:border-green-500 outline-none transition-all"
                                            value={member.savings}
                                            onChange={(e) => handleAmountChange(idx, 'savings', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {member.paid >= member.installment ? (
                                            <CheckCircle2 className="text-green-500 mx-auto" size={20} />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-600 mx-auto" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed">
                    <Users size={64} className="text-gray-700 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500">No Center Selected</h3>
                    <p className="text-gray-600">Please select a center from the dropdown to start collection.</p>
                </div>
            )}
        </div>
    );
};

export default CollectionSheet;
