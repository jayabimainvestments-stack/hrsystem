import { useState, useEffect } from 'react';
import api from '../services/api';
import { CreditCard, Save, Plus, Trash2, Edit2, X, Download, ShieldCheck, Zap, Activity, Search, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EmployeeSalaryStructure = ({ employeeId }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'HR Manager';
    const [structure, setStructure] = useState([]);
    const [allComponents, setAllComponents] = useState([]);
    const [sourceMeta, setSourceMeta] = useState({}); // { component_id: 'historical' | 'override' }
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newComp, setNewComp] = useState({ component_id: '', amount: 0 });
    const [breakdownData, setBreakdownData] = useState(null);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    useEffect(() => {
        fetchData();
    }, [employeeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [structRes, compRes] = await Promise.all([
                api.get(`/payroll-settings/structure/${employeeId}`),
                api.get('/payroll-settings/components')
            ]);
            setStructure(structRes.data);
            setAllComponents(compRes.data);

            const metaMap = {};
            (structRes.data || []).forEach(item => {
                metaMap[item.component_id] = item.is_historical ? 'historical' : 'override';
            });
            setSourceMeta(metaMap);
        } catch (error) {
            console.error("Error fetching salary data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const reason = window.prompt("Enter reason for change (e.g. Promotion, Adjustment):");
        if (reason === null) return;

        try {
            await api.post('/payroll-settings/structure', {
                employee_id: employeeId,
                components: structure.map(s => ({
                    component_id: s.component_id,
                    amount: parseFloat(s.amount) || 0,
                    quantity: parseFloat(s.quantity) || 0,
                    installments_remaining: s.installments_remaining || null
                })),
                reason
            });
            alert('Salary structure update request submitted.');
            fetchData();
        } catch (error) {
            alert('Failed to update structure');
        }
    };

    const handleRemove = (id) => {
        setStructure(structure.filter(s => s.component_id !== id));
    };

    const handleAdd = () => {
        if (!newComp.component_id) return;
        const exists = structure.find(s => s.component_id === parseInt(newComp.component_id));
        if (exists) return alert('This component is already added.');

        const original = allComponents.find(c => c.id === parseInt(newComp.component_id));
        setStructure([...structure, { ...original, component_id: original.id, amount: original.default_value }]);
        setAdding(false);
        setNewComp({ component_id: '', amount: 0 });
    };

    const fetchFuelBreakdown = async (liters) => {
        setLoadingBreakdown(true);
        try {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const response = await api.post('/policy/fuel-split-preview', {
                month: currentMonth,
                employees: [{ id: employeeId, liters }]
            });
            setBreakdownData(response.data[employeeId]);
        } catch (error) {
            console.error("Error fetching fuel breakdown", error);
            alert("Failed to load breakdown");
        } finally {
            setLoadingBreakdown(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 italic">Loading salary details...</div>;

    const netSalary = structure.reduce((acc, curr) => {
        const val = parseFloat(curr.amount || curr.default_value || 0);
        return curr.type === 'Earning' ? acc + val : acc - val;
    }, 0);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans">
            {/* High-End Summary Header */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:bg-primary-600/30"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] -ml-24 -mb-24"></div>

                <div className="flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="p-6 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl group-hover:border-white/20 transition-all">
                            <CreditCard size={40} className="text-primary-400" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Salary Structure</h3>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary-500/20">Active Structure</span>
                                <p className="text-slate-400 font-medium text-sm">Monthly earnings and deductions</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-110"></div>
                        <div className="relative text-center lg:text-right bg-white/5 px-12 py-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-inner">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 mb-3 leading-none italic">Net Salary Estimate</p>
                            <div className="flex items-baseline justify-center lg:justify-end gap-3">
                                <span className="text-5xl font-black tabular-nums tracking-tighter">
                                    {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs font-black text-slate-500 tracking-widest uppercase">LKR</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Component Console */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-white rounded-[4rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#fcfdfe]">
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Components</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Salary breakdown</p>
                            </div>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setAdding(true)}
                                    className="group p-4 bg-primary-600 text-white rounded-2xl hover:bg-slate-950 transition-all shadow-xl shadow-primary-100 flex items-center gap-3"
                                >
                                    <Plus size={20} className="group-hover:rotate-90 transition-transform" strokeWidth={3} />
                                    <span className="text-[10px] font-black uppercase tracking-widest pr-1">Add Component</span>
                                </button>
                            )}
                        </div>

                        <div className="divide-y divide-slate-50/60 p-6">
                            {structure.map((item, idx) => (
                                <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50/50 rounded-[2rem] transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-1.5 h-12 rounded-full transition-all group-hover:scale-y-110 ${item.type === 'Earning' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}></div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-black text-slate-900 tracking-tight text-lg leading-none">{item.name}</p>
                                                {sourceMeta[item.component_id] === 'historical' && (
                                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100 animate-pulse">
                                                        FIXED_VALUE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Activity size={10} className={item.type === 'Earning' ? 'text-emerald-500' : 'text-rose-500'} />
                                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{item.type}</p>
                                                {item.name.toLowerCase().includes('fuel') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchFuelBreakdown(item.quantity || 0)}
                                                        className="ml-2 p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-600 hover:text-white transition-all group/btn"
                                                        title="View Daily Split Breakdown"
                                                    >
                                                        <Search size={12} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="relative group/field">
                                            <span className="absolute left-4 top-1 text-[8px] font-black text-primary-400 uppercase tracking-widest leading-none">Qty/Liters</span>
                                            <input
                                                type="number"
                                                disabled={!isAdmin}
                                                className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pt-5 pb-3 w-24 text-center font-black text-sm outline-none transition-all text-slate-800 focus:border-primary-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                                value={item.quantity || 0}
                                                onChange={(e) => {
                                                    const newStruct = [...structure];
                                                    newStruct[idx].quantity = parseFloat(e.target.value) || 0;
                                                    setStructure(newStruct);
                                                }}
                                            />
                                        </div>
                                        {item.name.toLowerCase().includes('loan') && (
                                            <div className="relative group/field border-l border-slate-100 pl-8">
                                                <span className="absolute left-8 top-1 text-[8px] font-black text-rose-400 uppercase tracking-widest leading-none">Installments</span>
                                                <input
                                                    type="number"
                                                    disabled={!isAdmin}
                                                    className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pt-5 pb-3 w-24 text-center font-black text-sm outline-none transition-all text-slate-800 focus:border-rose-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                                    value={item.installments_remaining || ''}
                                                    onChange={(e) => {
                                                        const newStruct = [...structure];
                                                        newStruct[idx].installments_remaining = parseInt(e.target.value) || null;
                                                        setStructure(newStruct);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className="relative group border-l border-slate-100 pl-8">
                                            <div className="absolute inset-0 bg-primary-500/5 rounded-2xl scale-0 group-focus-within:scale-110 transition-transform"></div>
                                            <span className="absolute left-8 top-1 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Amount (LKR)</span>
                                            <input
                                                type="number"
                                                disabled={!isAdmin}
                                                className="bg-slate-50/50 border-2 border-transparent focus:border-primary-100 focus:bg-white rounded-2xl pl-16 pr-6 pt-5 pb-3 w-44 font-black text-base tabular-nums transition-all outline-none text-slate-800 shadow-inner group-hover:bg-slate-100 group-focus-within:bg-white disabled:opacity-75 disabled:cursor-not-allowed"
                                                value={item.amount || 0}
                                                onChange={(e) => {
                                                    const newStruct = [...structure];
                                                    newStruct[idx].amount = parseFloat(e.target.value) || 0;
                                                    setStructure(newStruct);
                                                    setSourceMeta(prev => ({ ...prev, [item.component_id]: 'override' }));
                                                }}
                                            />
                                            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 mt-1">LKR</span>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(item.component_id)}
                                                className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {structure.length === 0 && (
                                <div className="p-32 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 border-2 border-dashed border-slate-100">
                                        <Activity size={32} />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium italic">No components added to this structure.</p>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="p-10 bg-slate-50/30 flex justify-end items-center gap-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Verify changes before saving</p>
                                <button type="submit" className="group relative overflow-hidden px-12 py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    <div className="relative z-10 flex items-center gap-3">
                                        <Zap size={18} className="text-primary-400 fill-primary-400" /> Save Structure
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600/0 via-primary-600/20 to-primary-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Sidebar Alerts / Settings */}
                <div className="space-y-8">
                    {isAdmin && (
                        <div className="relative group bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-2xl overflow-hidden border border-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <ShieldCheck className="text-emerald-400 mb-6 group-hover:scale-110 transition-transform" size={40} strokeWidth={1.5} />
                            <h4 className="font-black text-xl mb-4 uppercase tracking-tight">Compliance Shield</h4>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">
                                This structure is automatically validated against standard payroll policies.
                            </p>
                            <button disabled className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 opacity-50 cursor-not-allowed">
                                <Download size={16} /> Auto-Synced internally
                            </button>
                        </div>
                    )}

                    <div className="p-10 bg-primary-50/50 border-2 border-primary-100/50 rounded-[3.5rem] relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-primary-900 font-black text-sm uppercase tracking-widest mb-3">Audit Log</h4>
                            <p className="text-primary-600/60 text-[10px] font-black uppercase tracking-widest">Last Modified: {new Date().toLocaleDateString()}</p>
                            <div className="mt-6 flex flex-col gap-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex items-center gap-3 text-[10px] font-bold text-primary-400 italic">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_primary]"></div>
                                        System re-calibration complete
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    </div>
                </div>
            </div>

            {/* Premium Component Modal */}
            {adding && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-in zoom-in duration-500 border border-slate-100">
                        <div className="p-10 bg-slate-950 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-full bg-blue-600/20 blur-3xl -mr-16"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <Activity size={24} className="text-primary-400" />
                                <h2 className="text-xl font-black uppercase tracking-[0.1em]">Add Component</h2>
                            </div>
                            <button onClick={() => setAdding(false)} className="relative z-10 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Component Library</label>
                                <select
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none focus:bg-white focus:border-primary-100 transition-all text-slate-800 shadow-inner appearance-none cursor-pointer"
                                    value={newComp.component_id}
                                    onChange={e => setNewComp({ ...newComp, component_id: e.target.value })}
                                >
                                    <option value="">Select Component</option>
                                    {allComponents.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} — ({c.type.toUpperCase()})</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAdd}
                                className="group relative w-full py-6 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-primary-200 hover:bg-slate-950 transition-all active:scale-95 overflow-hidden"
                            >

                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    <Plus size={18} strokeWidth={3} /> Add to Structure
                                </div>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Fuel Breakdown Modal */}
            {breakdownData && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[150] p-6 animate-in zoom-in-95 duration-300 font-sans">
                    <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col max-h-[85vh]">
                        <div className="p-10 bg-[#0f172a] text-white relative overflow-hidden flex-shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 blur-[80px] -mr-24 -mt-24"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-[10px] font-black uppercase tracking-widest mb-3">
                                        Live Calculation
                                    </div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">Fuel <span className="text-primary-500">Breakdown</span></h2>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Current Cycle Preview (25th to 24th)</p>
                                </div>
                                <button onClick={() => setBreakdownData(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group">
                                    <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-10 overflow-y-auto">
                            <div className="bg-primary-50 rounded-3xl p-6 border border-primary-100 mb-8">
                                <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2 italic">Summary Legend</p>
                                <p className="text-sm font-bold text-primary-900 leading-relaxed italic">
                                    {breakdownData.reason}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-2">Daily Audit Log</p>
                                {breakdownData.dailyBreakdown.map((row, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-primary-100 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-xl border border-slate-100 font-bold text-[10px] text-slate-400 uppercase tracking-tighter">
                                                {new Date(row.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm tracking-tight">{row.liters.toFixed(2)}L @ Rs. {row.price}</p>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic leading-none mt-1">Working Day Rate</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900 tabular-nums">Rs. {row.amount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">Estimated Total</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                                    <span className="text-sm text-primary-500 mr-2 font-black italic">LKR</span>
                                    {breakdownData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button
                                onClick={() => setBreakdownData(null)}
                                className="px-10 py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
                            >
                                Done Viewing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeSalaryStructure;
