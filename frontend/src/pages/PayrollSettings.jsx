import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Plus, Trash2, Save, X, Info, Activity, AlertTriangle, ShieldAlert, Lock, Shield, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import UserPermissionsModal from '../components/UserPermissionsModal';

const PayrollSettings = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [empStructure, setEmpStructure] = useState({}); // { component_id: amount }
    const [sourceMeta, setSourceMeta] = useState({}); // { component_id: 'historical' | 'override' }

    const [activeTab, setActiveTab] = useState('components');
    const [salaryComponents, setSalaryComponents] = useState([]);
    const [taxBrackets, setTaxBrackets] = useState([]);
    const [newComponent, setNewComponent] = useState({ name: '', type: 'Earning', is_taxable: false });
    const [taxForm, setTaxForm] = useState({ min_income: '', max_income: '', tax_rate: '' });

    const [loading, setLoading] = useState(true);
    const [structureLoading, setStructureLoading] = useState(false);
    const [addingComponent, setAddingComponent] = useState(false);
    const [selectedPermUser, setSelectedPermUser] = useState(null);
    const [hrManagers, setHrManagers] = useState([]);
    const [fuelPrice, setFuelPrice] = useState(370);


    const { user } = useAuth();

    useEffect(() => {
        fetchData();
        fetchEmployees();
        fetchHrManagers();
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

    const fetchData = async () => {
        try {
            const [taxRes, compRes] = await Promise.all([
                api.get('/payroll-settings/tax-brackets'),
                api.get('/payroll-settings/components')
            ]);
            setTaxBrackets(taxRes.data || []);
            setSalaryComponents(compRes.data || []);
        } catch (error) {
            console.error("Error fetching payroll settings", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHrManagers = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            const managers = (data || [])
                .filter(e => e.role === 'HR Manager' || e.role === 'Admin')
                .map(e => ({ id: e.user_id, name: e.name, role: e.role }));
            setHrManagers(managers);
        } catch (e) {
            console.error('Failed to load HR managers', e);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees?status=Active');
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees", error);
        }
    };

    const addComponent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payroll-settings/components', newComponent);
            setNewComponent({ name: '', type: 'Earning', is_taxable: false });
            setAddingComponent(false);
            fetchData();
            alert('Component added');
        } catch (error) {
            alert('Failed to add component');
        }
    };

    const handleTaxSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payroll-settings/tax-brackets', taxForm);
            setTaxForm({ min_income: '', max_income: '', tax_rate: '' });
            fetchData();
            alert('Tax bracket added');
        } catch (error) {
            alert('Failed to add tax bracket');
        }
    };

    const deleteComponent = async (id) => {
        if (!window.confirm("Permanent removal? This impacts all active profiles using this component.")) return;
        try {
            // Updated to use the correct base path
            await api.put(`/payroll-settings/components/${id}`, { status: 'Inactive' });
            fetchData();
        } catch (error) {
            alert('Action blocked. Check for active dependencies.');
        }
    };


    const deleteTaxBracket = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/payroll-settings/tax-brackets/${id}`);
            fetchData();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleEmployeeSelect = async (e) => {
        const empId = e.target.value;
        setSelectedEmployee(empId);
        if (!empId) {
            setEmpStructure({});
            setSourceMeta({});
            return;
        }

        setStructureLoading(true);
        try {
            const { data } = await api.get(`/payroll-settings/structure/${empId}`);
            const structureMap = {};
            const metaMap = {};
            (data || []).forEach(item => {
                structureMap[item.component_id] = {
                    amount: item.amount,
                    quantity: item.quantity,
                    installments_remaining: item.installments_remaining
                };
                if (item.is_monthly_only) {
                    metaMap[item.component_id] = 'monthly';
                } else {
                    metaMap[item.component_id] = item.is_historical ? 'historical' : 'override';
                }
            });

            setEmpStructure(structureMap);
            setSourceMeta(metaMap);
        } catch (error) {
            console.error("Error fetching structure", error);
        } finally {
            setStructureLoading(false);
        }
    };

    const handleStructureChange = (compId, amount) => {
        setEmpStructure(prev => ({
            ...prev,
            [compId]: {
                ...(prev[compId] || {}),
                amount
            }
        }));
        setSourceMeta(prev => ({ ...prev, [compId]: 'override' }));
    };

    const handleQuantityChange = (compId, quantity) => {
        setEmpStructure(prev => ({
            ...prev,
            [compId]: {
                ...(prev[compId] || {}),
                quantity
            }
        }));
        setSourceMeta(prev => ({ ...prev, [compId]: 'override' }));
    };

    const handleInstallmentChange = (compId, installments) => {
        setEmpStructure(prev => ({
            ...prev,
            [compId]: {
                ...(prev[compId] || {}),
                installments_remaining: installments
            }
        }));
        setSourceMeta(prev => ({ ...prev, [compId]: 'override' }));
    };

    const saveStructure = async () => {
        if (!selectedEmployee) return alert('Select an employee');

        const payload = {
            employee_id: selectedEmployee,
            components: Object.entries(empStructure).map(([compId, data]) => ({
                component_id: parseInt(compId),
                amount: parseFloat(data.amount) || 0,
                quantity: parseFloat(data.quantity) || 0,
                installments_remaining: (data.installments_remaining !== undefined && data.installments_remaining !== null && data.installments_remaining !== '')
                    ? parseInt(data.installments_remaining)
                    : null
            })).filter(c => c.amount > 0 || c.quantity > 0 || c.installments_remaining !== null)
        };

        try {
            await api.post('/payroll-settings/structure', payload);
            alert('Salary Structure Saved Successfully');
        } catch (error) {
            alert('Failed to save structure');
        }
    };

    const handleResetStructure = async () => {
        const confirm1 = window.confirm("WARNING: This will DELETE ALL employee salary structures. This cannot be undone.");
        if (!confirm1) return;
        const confirm2 = window.confirm("Are you absolutely sure? All salary configurations will be lost.");
        if (!confirm2) return;

        try {
            await api.delete('/payroll-settings/structure/all');
            alert('All salary structures have been reset.');
            setEmpStructure({});
            setSourceMeta({});
        } catch (error) {
            alert('Failed to reset structures: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleResetPayrolls = async () => {
        const confirm1 = window.confirm("CRITICAL WARNING: This will DELETE ALL PAYROLL RECORDS, payslips, and transaction history. This cannot be undone.");
        if (!confirm1) return;
        const confirm2 = window.confirm("Confirming this will WIPE the entire payroll database. Are you sure?");
        if (!confirm2) return;

        try {
            await api.delete('/payroll/all');
            alert('All payroll records have been deleted.');
        } catch (error) {
            alert('Failed to reset payrolls: ' + (error.response?.data?.message || error.message));
        }
    };


    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans antialiased">
            <Navbar />

            {/* Hero Section with Mesh Gradient */}
            <div className="relative overflow-hidden bg-slate-950 pt-32 pb-64 px-4 sm:px-6 lg:px-8">
                {/* Mesh Gradient Orbs */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative max-w-7xl mx-auto z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div className="space-y-4 animate-in slide-in-from-left duration-700">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Payroll Configuration</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
                                Payroll <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-100 italic">Settings</span>
                            </h1>
                            <p className="max-w-xl text-slate-400 font-medium text-lg leading-relaxed">
                                Manage salary components, tax rates, leave policies, and monthly overrides.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-48 pb-32">
                {/* Tab Navigation */}
                <div className="flex gap-4 mb-12 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
                    {[
                        { id: 'components', label: 'Salary Components', icon: Settings },
                        { id: 'tax', label: 'Tax Brackets', icon: Info },
                        { id: 'structure', label: 'Salary Baseline', icon: Save },
                        { id: 'access', label: 'HR Access Control', icon: Shield },
                        { id: 'system', label: 'System Maintenance', icon: ShieldAlert }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group relative flex items-center gap-4 px-10 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all whitespace-nowrap overflow-hidden ${activeTab === tab.id
                                ? 'bg-white text-slate-950 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] scale-[1.05] z-10'
                                : 'bg-white/5 text-white/40 hover:bg-white/10 backdrop-blur-3xl border border-white/5'
                                }`}
                        >
                            <tab.icon size={20} className={activeTab === tab.id ? 'text-blue-600' : 'text-white/20'} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'components' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-700">
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 sticky top-24">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add New Component</h2>
                                </div>
                                <form onSubmit={addComponent} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Definition Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none focus:bg-white focus:border-blue-100 transition-all text-slate-800 shadow-inner"
                                            placeholder="Component Name"
                                            value={newComponent.name}
                                            onChange={e => setNewComponent({ ...newComponent, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Logical Classification</label>
                                        <select
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none text-slate-800 appearance-none cursor-pointer"
                                            value={newComponent.type}
                                            onChange={e => setNewComponent({ ...newComponent, type: e.target.value })}
                                        >
                                            <option value="Earning">Earning</option>
                                            <option value="Deduction">Deduction</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { key: 'is_taxable', label: 'Fiscal Tax' },
                                            { key: 'epf_eligible', label: 'EPF Reserve' }
                                        ].map(check => (
                                            <label key={check.key} className="flex items-center gap-3 bg-slate-50 hover:bg-white p-5 rounded-2xl border-2 border-slate-100 cursor-pointer transition-all">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500/20"
                                                    checked={newComponent[check.key]}
                                                    onChange={e => setNewComponent({ ...newComponent, [check.key]: e.target.checked })}
                                                />
                                                <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{check.label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <label className="flex items-center gap-3 bg-slate-50 hover:bg-white p-5 rounded-2xl border-2 border-slate-100 cursor-pointer transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500/20"
                                            checked={newComponent.etf_eligible}
                                            onChange={e => setNewComponent({ ...newComponent, etf_eligible: e.target.checked })}
                                        />
                                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">ETF Contribution Model</span>
                                    </label>

                                    <button type="submit" className="group relative w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.3em] overflow-hidden shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        <div className="relative z-10 flex items-center justify-center gap-3">
                                            <Plus size={20} strokeWidth={3} /> Save Component
                                        </div>
                                        <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            {salaryComponents.map((comp) => (
                                <div key={comp.id} className="group bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between hover:border-blue-100 transition-all hover:scale-[1.01]">
                                    <div className="flex items-center gap-8">
                                        <div className={`p-6 rounded-[2rem] shadow-lg ${comp.type === 'Earning' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            <Settings size={28} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 tracking-tighter text-2xl mb-2">{comp.name}</p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${comp.type === 'Earning' ? 'bg-emerald-500/10 text-emerald-600 outline outline-1 outline-emerald-500/20' : 'bg-rose-500/10 text-rose-600 outline outline-1 outline-rose-500/20'}`}>
                                                    {comp.type}
                                                </span>
                                                {comp.is_taxable && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 outline outline-1 outline-blue-500/20">Taxable</span>
                                                )}
                                                {comp.epf_eligible && <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 outline outline-1 outline-amber-500/20">EPF</span>}
                                                {comp.etf_eligible && <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 outline outline-1 outline-emerald-500/20">ETF</span>}
                                                <div className="flex items-center gap-2 ml-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${comp.status === 'Active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{comp.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteComponent(comp.id)}
                                        className="p-5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-[1.5rem] transition-all"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tax' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-700">
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 sticky top-24">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Tax Bracket</h2>
                                </div>
                                <form onSubmit={handleTaxSubmit} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fiscal Floor (LKR)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none text-slate-800 shadow-inner"
                                            value={taxForm.min_income}
                                            onChange={e => setTaxForm({ ...taxForm, min_income: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fiscal Ceiling (LKR)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none text-slate-800 shadow-inner"
                                            placeholder="MAX_INFINITY"
                                            value={taxForm.max_income}
                                            onChange={e => setTaxForm({ ...taxForm, max_income: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Marginal Rate (%)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-5 font-black text-sm outline-none text-slate-800 shadow-inner"
                                            value={taxForm.tax_rate}
                                            onChange={e => setTaxForm({ ...taxForm, tax_rate: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-100 hover:bg-slate-950 transition-all">
                                        Authorize Bracket
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            {taxBrackets.map((bracket) => (
                                <div key={bracket.id} className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-50 flex items-center justify-between group overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 transition-all group-hover:w-3"></div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Lower Gradient</p>
                                            <p className="text-3xl font-black text-slate-900 tracking-tight">{Number(bracket.min_income).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Upper Boundary</p>
                                            <p className="text-3xl font-black text-slate-900 tracking-tight">{bracket.max_income ? Number(bracket.max_income).toLocaleString() : 'MAX_LIMIT'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 leading-none italic">Tax Rate</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-black text-blue-600 tracking-tighter">{bracket.tax_rate}</span>
                                                <span className="text-sm font-black text-blue-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteTaxBracket(bracket.id)}
                                        className="p-6 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all ml-8"
                                    >
                                        <X size={28} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'structure' && (
                    <div className="bg-white rounded-[4rem] shadow-2xl shadow-slate-200 border border-slate-50 p-16 animate-in slide-in-from-bottom duration-700">
                        <div className="max-w-3xl mb-16 space-y-6">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Master Salary Baseline</h2>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Define the permanent, default salary structure for employees. These values serve as the master template for all payroll cycles.
                            </p>

                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                                <Activity size={16} className="text-blue-600 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Current Salary Cycle:</span>
                                <span className="text-sm font-black text-blue-900 tracking-tighter uppercase">
                                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            <div className="relative pt-6 max-w-xl">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Select Employee</label>
                                <select
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 font-black text-lg outline-none focus:ring-8 focus:ring-blue-500/5 appearance-none shadow-inner text-slate-800 transition-all"
                                    value={selectedEmployee}
                                    onChange={handleEmployeeSelect}
                                >
                                    <option value="">Choose an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            [{emp.employee_id || emp.nic_passport || 'No ID'}] {emp.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedEmployee && (() => {
                            const emp = employees.find(e => e.id === parseInt(selectedEmployee));
                            return (
                                <div className="space-y-16 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-6 p-10 bg-blue-50/50 rounded-[2.5rem] border-2 border-blue-100/30">
                                        <div className="w-20 h-20 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-blue-200">
                                            {emp?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{emp?.name}</h3>
                                            <div className="flex gap-4 mt-2">
                                                <span className="px-4 py-1.5 bg-white text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest outline outline-1 outline-blue-100 shadow-sm">
                                                    ID: {emp?.employee_id || emp?.nic_passport || 'No ID'}
                                                </span>
                                                <span className="px-4 py-1.5 bg-white text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest outline outline-1 outline-slate-100 shadow-sm">
                                                    {emp?.designation || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 transition-opacity duration-300 ${structureLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4 border-b-2 border-slate-50 pb-6">
                                                <div className="w-3 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
                                                <h4 className="font-black text-slate-900 uppercase tracking-[0.2em] text-lg italic">Earnings Spectrum</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {salaryComponents.filter(c => c.type === 'Earning').map(comp => (
                                                    <div key={comp.id} className="bg-slate-50 hover:bg-white p-6 rounded-[2rem] border-2 border-slate-50 hover:border-blue-100 flex items-center justify-between transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors uppercase">{comp.name}</label>
                                                            </div>
                                                            {comp.is_taxable && <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic leading-none">Taxable component active</p>}
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {comp.name.toLowerCase().includes('fuel') && (
                                                                <div className="relative">
                                                                    <span className="absolute left-4 top-1 text-[8px] font-black text-blue-400 uppercase tracking-widest">
                                                                        Liters
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0"
                                                                        disabled={empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override'}
                                                                        className={`bg-white border-2 border-slate-100 rounded-2xl px-4 pt-5 pb-3 w-28 text-center font-black text-sm outline-none transition-all text-slate-800 ${empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override' ? 'cursor-not-allowed opacity-50' : 'focus:border-blue-500'}`}
                                                                        value={empStructure[comp.id]?.quantity || ''}
                                                                        onChange={(e) => handleQuantityChange(comp.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="relative">
                                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">LKR</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    disabled={empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override'}
                                                                    className={`bg-white border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-4 w-48 text-right font-black text-lg outline-none focus:shadow-2xl focus:shadow-blue-500/10 transition-all text-slate-800 ${empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override' ? 'cursor-not-allowed border-slate-50 bg-slate-50 opacity-60' : 'focus:border-blue-500'}`}
                                                                    value={comp.name.toLowerCase().includes('fuel') ? (parseFloat(empStructure[comp.id]?.quantity || 0) * fuelPrice).toFixed(2) : (empStructure[comp.id]?.amount || '')}
                                                                    onChange={(e) => handleStructureChange(comp.id, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4 border-b-2 border-slate-50 pb-6">
                                                <div className="w-3 h-8 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.3)]"></div>
                                                <h4 className="font-black text-slate-900 uppercase tracking-[0.2em] text-lg italic">Deductions</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {salaryComponents.filter(c => c.type === 'Deduction').map(comp => (
                                                    <div key={comp.id} className={`bg-slate-50 hover:bg-white p-6 rounded-[2rem] border-2 border-slate-50 hover:border-rose-100 flex items-center justify-between transition-all group shadow-sm hover:shadow-xl hover:shadow-rose-500/5 ${empStructure[comp.id]?.is_locked ? 'opacity-80' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600 transition-colors uppercase">{comp.name}</label>
                                                            {empStructure[comp.id]?.is_locked && (
                                                                <Lock size={12} className="text-blue-400" />
                                                            )}
                                                            {sourceMeta[comp.id] === 'historical' && (
                                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100 animate-pulse">
                                                                    HISTORICAL_VAL
                                                                </span>
                                                            )}
                                                            {sourceMeta[comp.id] === 'override' && (
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest border border-blue-100 animate-pulse">
                                                                    PERMANENT
                                                                </span>
                                                            )}
                                                            {sourceMeta[comp.id] === 'monthly' && (
                                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100 animate-bounce" title={empStructure[comp.id]?.lock_reason}>
                                                                    MONTHLY_ONLY
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {comp.name.toLowerCase().includes('loan') && (
                                                                <div className="relative">
                                                                    <span className="absolute left-4 top-1 text-[8px] font-black text-rose-400 uppercase tracking-widest">Installments</span>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Months"
                                                                        disabled={empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override'}
                                                                        className={`bg-white border-2 border-slate-100 rounded-2xl px-4 pt-5 pb-3 w-28 text-center font-black text-sm outline-none transition-all text-slate-800 ${empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override' ? 'cursor-not-allowed opacity-50' : 'focus:border-rose-500'}`}
                                                                        value={empStructure[comp.id]?.installments_remaining || ''}
                                                                        onChange={(e) => handleInstallmentChange(comp.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="relative">
                                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">LKR</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    disabled={empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override'}
                                                                    className={`bg-white border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-4 w-48 text-right font-black text-lg outline-none focus:shadow-2xl focus:shadow-rose-500/10 transition-all text-slate-800 ${empStructure[comp.id]?.is_locked || sourceMeta[comp.id] === 'override' ? 'cursor-not-allowed border-slate-50 bg-slate-50 opacity-60' : 'focus:border-rose-500'}`}
                                                                    value={empStructure[comp.id]?.amount || ''}
                                                                    onChange={(e) => handleStructureChange(comp.id, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-16 border-t-2 border-slate-50 flex justify-between items-center">
                                        <div className="flex items-center gap-4 text-emerald-500 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                            <Activity size={24} className="animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">System Verification: Real-time calculation engaged. Validity confirmed.</p>
                                        </div>
                                        <button
                                            onClick={saveStructure}
                                            className="group relative overflow-hidden bg-slate-900 text-white px-16 py-7 rounded-[2rem] font-black uppercase text-sm tracking-[0.4em] shadow-[0_40px_80px_-20px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95]"
                                        >
                                            <div className="relative z-10 flex items-center gap-4">
                                                <Save size={24} strokeWidth={3} /> Save Master Structure
                                            </div>
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}



                {activeTab === 'access' && (
                    <div className="animate-in fade-in duration-700">
                        <div className="bg-white rounded-[4rem] shadow-2xl shadow-slate-200 border border-slate-50 p-16">
                            <div className="max-w-3xl mb-12">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                        <Shield size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">HR Access Control</h2>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Set which HR Managers can configure salaries vs process payroll</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">MANAGE_SALARY_STRUCTURE</p>
                                        <p className="text-xs text-blue-700 font-medium">Allows editing Monthly Salary Overrides</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">MANAGE_PAYROLL</p>
                                        <p className="text-xs text-indigo-700 font-medium">Allows generating payroll in Payroll Intelligence</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {hrManagers.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400">
                                        <Users size={40} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-black text-sm uppercase tracking-widest">No HR Managers found</p>
                                    </div>
                                ) : hrManagers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-6 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-100 rounded-3xl transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                                                {u.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 uppercase tracking-tight">{u.name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-0.5">HR Manager</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedPermUser(u)}
                                            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg"
                                        >
                                            <Shield size={14} />
                                            Set Permissions
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-700">
                        <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-rose-200/50 border border-rose-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>

                            <div className="relative z-10 space-y-8">
                                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                                    <AlertTriangle size={32} />
                                </div>

                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Purge Structures</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        Eliminate all employee salary configurations. This will reset every employee to zero-base, removing all earnings and deductions overrides.
                                    </p>
                                </div>

                                <button
                                    onClick={handleResetStructure}
                                    className="w-full py-6 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-500/30 hover:bg-rose-700 transition-all active:scale-[0.98]"
                                >
                                    Execute Purge
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-rose-200/50 border border-rose-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>

                            <div className="relative z-10 space-y-8">
                                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                                    <ShieldAlert size={32} />
                                </div>

                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Wipe Payroll History</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        Permanently delete ALL processed payroll records, payslips, and liability calculations. This returns the system to a pre-payroll state.
                                    </p>
                                </div>

                                <button
                                    onClick={handleResetPayrolls}
                                    className="w-full py-6 bg-rose-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-500/30 hover:bg-rose-700 transition-all active:scale-[0.98]"
                                >
                                    Execute System Wipe
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedPermUser && (
                <UserPermissionsModal
                    user={selectedPermUser}
                    rolePermissions={['MANAGE_SALARY_STRUCTURE', 'MANAGE_PAYROLL', 'MANAGE_EMPLOYEES', 'MANAGE_ATTENDANCE', 'APPROVE_LEAVE', 'MANAGE_DOCUMENTS', 'VIEW_ALL_REPORTS', 'EXPORT_REPORTS']}
                    onClose={() => setSelectedPermUser(null)}
                    onSaved={() => { setSelectedPermUser(null); }}
                />
            )}
        </div>
    );
};

export default PayrollSettings;
