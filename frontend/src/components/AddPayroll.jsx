import { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Search, Plus, Trash2, Save, CreditCard, User, Calculator, Shield, CheckCircle2, AlertTriangle, Clock, Activity, ChevronRight } from 'lucide-react';

const AddPayroll = ({ close }) => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [salaryData, setSalaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [readiness, setReadiness] = useState(null);
    const [checkingReadiness, setCheckingReadiness] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, deptRes, policyRes] = await Promise.all([
                    api.get('/employees'),
                    api.get('/meta/departments'),
                    api.get('/attendance/policy')
                ]);
                setEmployees(empRes.data);
                setDepartments(deptRes.data);
            } catch (error) {
                console.error("Error fetching data", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchReadiness = async () => {
            if (!month || !year) {
                setReadiness(null);
                return;
            }
            setCheckingReadiness(true);
            try {
                const res = await api.get(`/payroll/readiness/${month}/${year}`);
                setReadiness(res.data);
            } catch (error) {
                console.error("Readiness check failed", error);
                setReadiness(null);
            } finally {
                setCheckingReadiness(false);
            }
        };
        fetchReadiness();
    }, [month, year]);

    useEffect(() => {
        const fetchPreview = async () => {
            if (!selectedEmp || !month || !year) {
                setSalaryData(null);
                return;
            }
            setLoading(true);
            try {
                const res = await api.get(`/payroll/preview/${selectedEmp.user_id}/${month}/${year}`);
                setSalaryData(res.data);
            } catch (error) {
                console.error("Preview failed", error);
                setSalaryData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [selectedEmp, month, year]);

    const handleSelectEmployee = (emp) => {
        setSelectedEmp(emp);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedEmp || !month || !salaryData) return;

        try {
            await api.post('/payroll', {
                user_id: selectedEmp.user_id,
                month,
                year,
                reauth_token: 'PAYROLL_VERIFIED_SESSION',
                ...salaryData
            });
            alert('Payroll saved successfully');
            close();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save payroll');
        }
    };

    const filteredEmployees = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
            (e.employee_id && e.employee_id.includes(search)) ||
            (e.nic_passport && e.nic_passport.includes(search));
        const matchesDept = !deptFilter || e.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans antialiased">
            <div className="bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-500 border border-white/20">
                {/* Premium Header */}
                <div className="relative p-10 bg-slate-950 text-white flex justify-between items-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-full bg-primary-600/20 blur-[100px] -mr-32 pointer-events-none"></div>
                    <div className="relative flex items-center gap-5 z-10">
                        <div className="p-4 bg-primary-600 shadow-xl shadow-primary-500/30 rounded-2xl border border-primary-400/20">
                            <Plus size={20} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">Add Payroll</h2>
                            <p className="text-primary-400 text-[11px] font-black uppercase tracking-[0.2em]">Generate monthly salary record</p>
                        </div>
                    </div>
                    <button onClick={close} className="relative z-10 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 shadow-inner group">
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Beneficiary Registry */}
                    <div className="w-[400px] bg-[#fcfdfe] border-r border-slate-100 flex flex-col shadow-[inset_-10px_0_30px_-20px_rgba(0,0,0,0.05)]">
                        <div className="p-8 space-y-5">
                            <div className="relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={14} />
                                <input
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-4 font-bold text-xs shadow-inner focus:border-primary-100 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="Search employees..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-white border-2 border-slate-100 rounded-xl px-5 py-3 font-bold text-[10px] uppercase tracking-widest text-slate-400 focus:border-blue-100 outline-none appearance-none cursor-pointer"
                                    value={deptFilter}
                                    onChange={e => setDeptFilter(e.target.value)}
                                >
                                    <option value="">Cross-Department</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-3">
                            {filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => handleSelectEmployee(emp)}
                                    className={`w-full p-5 rounded-[1.5rem] flex items-center gap-5 transition-all text-left group relative overflow-hidden ${selectedEmp?.id === emp.id
                                        ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200'
                                        : 'hover:bg-white hover:shadow-lg hover:shadow-slate-100 text-slate-600 border border-transparent hover:border-slate-50'
                                        }`}
                                >
                                    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-md transition-all ${selectedEmp?.id === emp.id
                                        ? 'bg-white/20'
                                        : 'bg-primary-50 text-primary-500 group-hover:bg-primary-600 group-hover:text-white'
                                        }`}>
                                        {(emp.name || 'E').charAt(0)}
                                    </div>
                                    <div className="truncate">
                                        <p className={`font-black tracking-tight text-base mb-0.5 uppercase ${selectedEmp?.id === emp.id ? 'text-white' : 'text-slate-900 group-hover:text-primary-600'}`}>
                                            {emp.name || 'Anonymous Employee'}
                                        </p>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.1em] tabular-nums ${selectedEmp?.id === emp.id ? 'text-primary-200' : 'text-slate-400'}`}>
                                            [{emp.employee_id || emp.nic_passport || 'NO_ID'}]
                                        </p>
                                    </div>
                                    {selectedEmp?.id === emp.id && (
                                        <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Operational Console */}
                    <div className="flex-1 p-16 overflow-y-auto bg-white">
                        {selectedEmp ? (
                            <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-right duration-500">
                                <div className="space-y-4 mb-12 border-b-2 border-slate-50 pb-8">
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{selectedEmp.name}</h2>
                                    <div className="flex gap-4">
                                        <span className="px-5 py-2 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline outline-1 outline-primary-500/20 tabular-nums">
                                            ID: {selectedEmp.employee_id || selectedEmp.nic_passport || 'NOT_ASSIGNED'}
                                        </span>
                                        <span className="px-5 py-2 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline outline-1 outline-slate-100">
                                            {selectedEmp.designation || 'ROLE_UNSET'}
                                        </span>
                                    </div>
                                </div>
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Payroll Details</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Month</label>
                                            <select
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold outline-none focus:bg-white focus:border-primary-100 transition-all text-slate-700 shadow-sm"
                                                value={month}
                                                onChange={e => setMonth(e.target.value)}
                                                required
                                            >
                                                <option value="">Select Month</option>
                                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Year</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold outline-none focus:bg-white focus:border-primary-100 transition-all text-slate-700 shadow-sm tabular-nums"
                                                value={year}
                                                onChange={e => setYear(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* READINESS DASHBOARD */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Payroll Readiness Audit</h3>
                                        </div>
                                        {checkingReadiness && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> Audit in progress...
                                            </div>
                                        )}
                                    </div>

                                    {readiness ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.entries(readiness.checks).map(([key, check]) => (
                                                <div key={key} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${check.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' :
                                                                check.status === 'Review' ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-rose-50 text-rose-600'
                                                                }`}>
                                                                {check.status === 'Ready' ? <CheckCircle2 size={16} /> :
                                                                    check.status === 'Review' ? <AlertTriangle size={16} /> :
                                                                        <Clock size={16} />
                                                                }
                                                            </div>
                                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{check.title}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${check.status === 'Ready' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                                            check.status === 'Review' ? 'bg-amber-400 text-white shadow-lg shadow-amber-500/20' :
                                                                'bg-slate-200 text-slate-500'
                                                            }`}>
                                                            {check.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 pl-1">
                                                        {check.details}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : !month ? (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Select a month to run readiness audit...</p>
                                        </div>
                                    ) : null}
                                </section>

                                <div className="group relative bg-slate-950 rounded-[3rem] p-12 text-white shadow-2xl overflow-hidden transition-all">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-600/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 mb-10 flex items-center gap-2">
                                        <Calculator size={12} className="animate-pulse" /> Salary Forecast
                                    </h4>

                                    {loading ? (
                                        <div className="flex items-center justify-center py-10 gap-4">
                                            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce delay-0"></div>
                                            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce delay-150"></div>
                                            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce delay-300"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary-300/60 ml-2 italic">Generating preview...</span>
                                        </div>
                                    ) : salaryData ? (
                                        <div className="space-y-10 relative z-10">
                                            <div className="grid grid-cols-3 gap-10">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-primary-500/60 tracking-widest mb-2">Base Salary</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black tabular-nums">{salaryData.base_salary.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">LKR</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest mb-2">Gross Earnings</p>
                                                    <div className="flex items-baseline gap-1 text-emerald-400">
                                                        <span className="text-2xl font-black tabular-nums">{(salaryData.base_salary + salaryData.allowances).toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-emerald-500/40">LKR</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-rose-500/60 tracking-widest mb-2">Total Deductions</p>
                                                    <div className="flex items-baseline gap-1 text-rose-400">
                                                        <span className="text-2xl font-black tabular-nums">-{salaryData.deductions.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-rose-500/40">LKR</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Itemized Matrix */}
                                            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                                                <table className="w-full text-[10px] uppercase font-bold tracking-widest">
                                                    <thead>
                                                        <tr className="text-slate-500 border-b border-white/10">
                                                            <th className="text-left pb-4">Salary Component</th>
                                                            <th className="text-right pb-4 text-primary-400">Amount (LKR)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {salaryData.breakdown?.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="py-4 text-slate-300">{item.name}</td>
                                                                <td className={`py-4 text-right tabular-nums ${item.type === 'Earning' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {item.type === 'Earning' ? '+' : '-'}{item.amount.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="pt-2">
                                                <p className="text-[10px] font-black uppercase text-primary-400 tracking-[0.2em] mb-2 text-center">Net Salary</p>
                                                <div className="flex items-baseline justify-center gap-3">
                                                    <span className="text-6xl font-black tabular-nums tracking-tighter">{salaryData.net_salary.toLocaleString()}</span>
                                                    <span className="text-sm font-bold text-primary-400">LKR</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center text-center">
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic opacity-50">Select month and year to preview...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Shield size={14} />
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Securely processed and encrypted</p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!salaryData}
                                        className="group relative overflow-hidden bg-slate-900 text-white px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-slate-900"
                                    >
                                        <div className="relative z-10 flex items-center gap-4">
                                            <Save size={16} strokeWidth={3} /> Save Payroll
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary-400/0 via-white/5 to-primary-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full scale-150 animate-pulse"></div>
                                    <div className="relative w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                                        <User size={48} strokeWidth={1.5} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">No Employee Selected</h3>
                                    <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
                                        Please select an employee from the list on the left to start generating their payroll.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AddPayroll;
