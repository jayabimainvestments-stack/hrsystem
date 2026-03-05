import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    CreditCard, Plus, Trash2, Search, User,
    ArrowRight, Activity, Zap, ShieldCheck, X
} from 'lucide-react';

const PermanentSalary = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [structure, setStructure] = useState([]);
    const [allComponents, setAllComponents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [empLoading, setEmpLoading] = useState(true);
    const [newComp, setNewComp] = useState({ component_id: '', amount: 0 });
    const [fuelPrice, setFuelPrice] = useState(370);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchEmployees();
        fetchComponents();
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            const { data } = await api.get('/policy');
            if (data && data.fuel_rate_per_liter && parseFloat(data.fuel_rate_per_liter) > 0) {
                setFuelPrice(parseFloat(data.fuel_rate_per_liter));
            }
        } catch (error) {
            console.error("Error fetching policy", error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees", error);
        } finally {
            setEmpLoading(false);
        }
    };

    const fetchComponents = async () => {
        try {
            const { data } = await api.get('/payroll-settings/components');
            // Filter out Salary Advance components — these are handled separately
            const filtered = (data || []).filter(c =>
                !c.name.toLowerCase().includes('advance') &&
                !c.name.toLowerCase().includes('epf') &&
                !c.name.toLowerCase().includes('etf') &&
                !c.name.toLowerCase().includes('welfare')
            );
            setAllComponents(filtered);
        } catch (error) {
            console.error("Error fetching components", error);
        }
    };

    // Rule 1: Always load from employee_salary_structure only (permanent baseline)
    const handleEmployeeSelect = async (empId) => {
        setSelectedEmployee(empId);
        setStructure([]); // ← Clear immediately to prevent stale data from previous employee
        if (!empId) return;

        setLoading(true);
        try {
            const { data } = await api.get(`/payroll-settings/structure/${empId}`);
            const filteredData = (data || []).filter(item => {
                const n = (item.name || '').toLowerCase();
                return !n.includes('advance') && !n.includes('epf') && !n.includes('etf') && !n.includes('welfare');
            });
            setStructure(filteredData);
        } catch (error) {
            console.error("Error fetching structure", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const componentsToSave = structure.filter(s => {
            const n = s.name.toLowerCase();
            return !n.includes('advance') && !n.includes('epf') && !n.includes('etf') && !n.includes('welfare');
        });

        if (componentsToSave.length === 0) {
            alert('No components to save.');
            return;
        }

        const reason = window.prompt("Enter reason for change (e.g. Annual Increment, Promotion, New Hire):");
        if (reason === null) return;

        try {
            await api.post('/payroll-settings/structure', {
                employee_id: selectedEmployee,
                components: componentsToSave.map(s => ({
                    component_id: s.component_id,
                    amount: parseFloat(s.amount) || 0,
                    quantity: parseFloat(s.quantity) || 0,
                    installments_remaining: s.installments_remaining || null
                })),
                reason
            });
            alert('Salary structure submitted for approval. Check Pending Approvals (Governance).');
            handleEmployeeSelect(selectedEmployee);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit changes');
        }
    };

    const handleRemove = (id) => {
        setStructure(structure.filter(s => s.component_id !== id));
    };

    const handleAdd = () => {
        if (!newComp.component_id) return;
        const exists = structure.find(s => s.component_id === parseInt(newComp.component_id));
        if (exists) return alert('Component already active in this profile.');

        const original = allComponents.find(c => c.id === parseInt(newComp.component_id));
        setStructure([...structure, { ...original, component_id: original.id, amount: original.default_value || 0 }]);
        setAdding(false);
        setNewComp({ component_id: '', amount: 0 });
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.emp_code && emp.emp_code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Net = sum of earnings - sum of deductions (EPF/ETF/Welfare excluded — auto-calculated at payroll)
    const netSalary = structure.reduce((acc, curr) => {
        const val = parseFloat(curr.amount || 0);
        return curr.type === 'Earning' ? acc + val : acc - val;
    }, 0);

    const basicSalary = structure.find(s => s.name?.toLowerCase().includes('basic'))?.amount || 0;

    if (empLoading) return <div className="p-10 text-center text-slate-400 italic">Initializing personnel data...</div>;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Side Bar - Employee Selection */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-[600px]">
                        <div className="flex flex-col gap-4 mb-6 border-b border-slate-50 pb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Employee List</h3>
                                <ShieldCheck size={16} className="text-blue-500" />
                            </div>
                            {/* Rule 3: Baseline-only mode — no month selector */}
                            <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                🛡️ Master Baseline Mode
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="text"
                                placeholder="Search Name or ID..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-xs outline-none focus:border-blue-500 transition-all text-slate-800"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => handleEmployeeSelect(emp.id)}
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group ${selectedEmployee === emp.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]'
                                        : 'bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-100'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${selectedEmployee === emp.id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className={`font-bold text-sm truncate ${selectedEmployee === emp.id ? 'text-white' : 'text-slate-900'}`}>{emp.name}</p>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${selectedEmployee === emp.id ? 'text-blue-200' : 'text-slate-400'}`}>
                                            {emp.emp_code || 'No ID'}
                                        </p>
                                    </div>
                                    {selectedEmployee === emp.id && <ArrowRight size={16} className="ml-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Editor */}
                <div className="lg:col-span-3">
                    {!selectedEmployee ? (
                        <div className="bg-white rounded-[4rem] p-24 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-blue-200">
                                <User size={48} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Select an Employee</h4>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">Choose an employee from the list to manage their permanent salary structure.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {/* Employee Summary Card */}
                            <div className="relative group overflow-hidden bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl border border-white/5">
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>

                                <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl">
                                            <CreditCard size={32} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight">{employees.find(e => e.id === selectedEmployee)?.name}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                                                    🛡️ Master Baseline — Permanent Structure
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 text-right">
                                        {/* Rule 5: EPF/ETF/Welfare preview from basic salary */}
                                        <div className="bg-white/5 px-10 py-6 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-inner">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2 italic">
                                                Permanent Net Baseline
                                            </p>
                                            <div className="flex items-baseline justify-end gap-2">
                                                <span className="text-4xl font-black tabular-nums tracking-tighter">
                                                    {netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">LKR</span>
                                            </div>
                                        </div>
                                        {/* Rule 5: EPF/ETF/Welfare auto-calculated from Basic */}
                                        {parseFloat(basicSalary) > 0 && (
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 space-y-1">
                                                <p>Auto at Payroll: EPF 8% = LKR {(parseFloat(basicSalary) * 0.08).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                <p>ETF 3% = LKR {(parseFloat(basicSalary) * 0.03).toLocaleString(undefined, { minimumFractionDigits: 2 })} | Welfare 2% = LKR {(parseFloat(basicSalary) * 0.02).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Components Form */}
                            <form onSubmit={handleSave} className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden">
                                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#fcfdfe]">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Salary Components ({structure.length})</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Permanent allowances & fixed deductions — EPF / ETF / Welfare auto-calculated at payroll
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAdding(true)}
                                        className="group px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 flex items-center gap-3"
                                    >
                                        <Plus size={20} className="group-hover:rotate-90 transition-transform" strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add Component</span>
                                    </button>
                                </div>

                                <div className="divide-y divide-slate-50/60 p-6 min-h-[300px]">
                                    {loading ? (
                                        <div className="p-32 text-center text-slate-400 italic">Loading structure...</div>
                                    ) : structure.length > 0 ? (
                                        structure.map((item, idx) => {
                                            const isFuel = item.name.toLowerCase().includes('fuel');

                                            return (
                                                <div key={idx} className="p-6 flex items-center justify-between rounded-[2rem] transition-all group hover:bg-slate-50/50">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-1.5 h-12 rounded-full transition-all group-hover:scale-y-110 ${item.type === 'Earning' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}></div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-0.5">
                                                                <p className="font-black text-slate-900 tracking-tight text-lg leading-none uppercase">{item.name}</p>
                                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
                                                                    permanent
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                                                <Activity size={10} className={item.type === 'Earning' ? 'text-emerald-500' : 'text-rose-500'} />
                                                                {item.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {isFuel && (
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1 text-[8px] font-black text-blue-400 uppercase tracking-widest">
                                                                    Liters
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pt-5 pb-3 w-28 text-center font-black text-sm outline-none transition-all text-slate-800 focus:border-blue-500"
                                                                    value={item.quantity || 0}
                                                                    onChange={(e) => {
                                                                        const newStruct = [...structure];
                                                                        newStruct[idx].quantity = parseFloat(e.target.value) || 0;
                                                                        setStructure(newStruct);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="relative">
                                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">LKR</span>
                                                            <input
                                                                type="number"
                                                                disabled={isFuel}
                                                                className={`bg-slate-50/50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl pl-16 pr-6 py-4 w-44 font-black text-base tabular-nums transition-all outline-none text-slate-800 shadow-inner group-hover:bg-slate-100 group-focus-within:bg-white ${isFuel ? 'bg-blue-50/30' : ''}`}
                                                                value={isFuel ? (parseFloat(item.quantity) * fuelPrice).toFixed(2) : (item.amount || 0)}
                                                                onChange={(e) => {
                                                                    const newStruct = [...structure];
                                                                    newStruct[idx].amount = parseFloat(e.target.value) || 0;
                                                                    setStructure(newStruct);
                                                                }}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemove(item.component_id)}
                                                            className="p-4 rounded-2xl transition-all text-slate-200 hover:text-rose-500 hover:bg-rose-50"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-32 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                                                <Activity size={32} />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium italic">No permanent salary components found. Add one to get started.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-10 bg-slate-50/30 flex justify-between items-center gap-6">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                        Changes require Governance approval before taking effect
                                    </p>
                                    <button
                                        type="submit"
                                        className="group relative overflow-hidden px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-slate-900 text-white"
                                    >
                                        <div className="relative z-10 flex items-center gap-3">
                                            <Zap size={18} className="text-blue-400 fill-blue-400" />
                                            Submit for Approval
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Component Addition Modal */}
            {adding && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in duration-500">
                        <div className="p-10 bg-slate-950 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-full bg-blue-600/20 blur-3xl -mr-16"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <Activity size={24} className="text-blue-400" />
                                <h2 className="text-xl font-black uppercase tracking-[0.1em]">Add Salary Component</h2>
                            </div>
                            <button onClick={() => setAdding(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Component</label>
                            <select
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none"
                                value={newComp.component_id}
                                onChange={(e) => setNewComp({ ...newComp, component_id: e.target.value })}
                            >
                                <option value="">Select a component...</option>
                                {allComponents.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.type})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                EPF, ETF & Welfare are excluded — they are auto-calculated from Basic Salary at payroll time.
                            </p>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleAdd}
                                disabled={!newComp.component_id}
                                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Add Component
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermanentSalary;