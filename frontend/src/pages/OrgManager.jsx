import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Briefcase, Plus, Edit2, Trash2, X, Check, Download, Settings, Clock, DollarSign, CalendarDays, AlertCircle, Activity, Save } from 'lucide-react';
import Navbar from '../components/Navbar';

const OrgManager = () => {
    const [activeTab, setActiveTab] = useState('departments');
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [organization, setOrganization] = useState(null);
    const [attendancePolicy, setAttendancePolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(null); // { type, mode, data }
    const [formData, setFormData] = useState({});

    const token = sessionStorage.getItem('token');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgRes, deptRes, desigRes, leaveRes, policyRes] = await Promise.all([
                api.get('/organization'),
                api.get('/meta/departments'),
                api.get('/meta/designations'),
                api.get('/meta/leave-protocols'),
                api.get('/attendance/policy')
            ]);
            setOrganization(orgRes.data);
            setDepartments(deptRes.data);
            setDesignations(desigRes.data);
            setLeaveTypes(leaveRes.data);
            setAttendancePolicy({
                work_start_time: '08:00:00',
                work_end_time: '17:00:00',
                short_leave_monthly_limit: 0,
                half_day_yearly_limit: 0,
                absent_deduction_rate: parseFloat(policyRes.data?.absent_deduction_rate || 1.0),
                ...policyRes.data,
                // Overwrite with parsed numbers for clean display
                absent_day_amount: parseFloat(policyRes.data?.absent_day_amount || 0),
                late_hourly_rate: parseFloat(policyRes.data?.late_hourly_rate || 0)
            });
        } catch (error) {
            console.error("Error fetching org data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (type, mode, data = {}) => {
        let initialData = { ...data };
        if (mode === 'add' && type === 'leave-types') {
            initialData = { is_paid: true, annual_limit: 0 };
        }
        setModal({ type, mode, data: initialData });
        setFormData(initialData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (activeTab === 'company') {
                await api.put('/organization', organization);
                alert('Company profile updated successfully!');
                fetchData();
                return;
            }
            if (activeTab === 'deductions') {
                await api.put('/attendance/policy', attendancePolicy);
                alert('Settings updated and synchronized successfully!');
                fetchData();
                return;
            }
            const { type, mode, data } = modal;
            let endpoint = '';
            if (type === 'departments') endpoint = '/meta/departments';
            else if (type === 'designations') endpoint = '/meta/designations';
            else endpoint = '/meta/leave-protocols';

            const url = mode === 'edit' ? `${endpoint}/${data.id}` : `${endpoint}`;
            const method = mode === 'edit' ? 'put' : 'post';

            await api[method](url, formData);
            setModal(null);
            fetchData();
        } catch (error) {
            console.error("Submit error", error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to save record";
            alert(`Update Failed: ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    const handlePolicyChange = (e) => {
        const { name, value } = e.target;
        setAttendancePolicy(prev => ({ ...prev, [name]: value }));
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
        try {
            let endpoint = '';
            if (type === 'departments') endpoint = `/meta/departments/${id}`;
            else if (type === 'designations') endpoint = `/meta/designations/${id}`;
            else endpoint = `/meta/leave-protocols/${id}`;

            await api.delete(endpoint);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete record');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />
            <main className="max-w-6xl mx-auto py-12 px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">Company Structure</h1>
                        <p className="text-slate-500 font-medium font-sans">Manage departments, job roles, and leave settings</p>
                    </div>
                    {activeTab !== 'deductions' && (
                        <button
                            onClick={() => handleOpenModal(activeTab, 'add')}
                            className="btn-primary"
                        >
                            <Plus size={20} />
                            Add {activeTab === 'departments' ? 'Department' : activeTab === 'designations' ? 'Job Role' : 'Rule'}
                        </button>
                    )}
                </div>


                {/* Tabs */}
                <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'company' ? 'bg-blue-800 text-white shadow-xl shadow-blue-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Building2 size={16} />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('departments')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'departments' ? 'bg-primary-600 text-white shadow-xl shadow-primary-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Building2 size={16} />
                        Departments
                    </button>
                    <button
                        onClick={() => setActiveTab('designations')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'designations' ? 'bg-purple-600 text-white shadow-xl shadow-purple-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Briefcase size={16} />
                        Job Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('leave-types')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'leave-types' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <CalendarDays size={16} />
                        Rules
                    </button>
                    <button
                        onClick={() => setActiveTab('deductions')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'deductions' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <DollarSign size={16} />
                        Rates
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : activeTab === 'company' ? (
                    <div className="card-premium overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-10 border-b border-slate-50 bg-slate-50/30">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Building2 size={24} className="text-blue-800" /> Company Profile
                            </h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">Official details for reporting and documentation</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.name || ''}
                                        onChange={e => setOrganization({ ...organization, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reg Number</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.reg_no || ''}
                                        onChange={e => setOrganization({ ...organization, reg_no: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EPF Registration No</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.epf_no || ''}
                                        onChange={e => setOrganization({ ...organization, epf_no: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ETF Registration No</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.etf_no || ''}
                                        onChange={e => setOrganization({ ...organization, etf_no: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Address</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold min-h-[100px]"
                                        value={organization?.address || ''}
                                        onChange={e => setOrganization({ ...organization, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.phone || ''}
                                        onChange={e => setOrganization({ ...organization, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={organization?.email || ''}
                                        onChange={e => setOrganization({ ...organization, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-12 py-5 bg-blue-800 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-900 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {saving ? 'Updating...' : <><Save size={18} /> Save Company Details</>}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {(activeTab === 'departments' ? departments : activeTab === 'designations' ? designations : leaveTypes).map(item => (
                            <div key={item.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${activeTab === 'departments' ? 'bg-blue-50 text-blue-600' :
                                        activeTab === 'designations' ? 'bg-purple-50 text-purple-600' :
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                        {activeTab === 'departments' ? <Building2 size={24} /> : activeTab === 'designations' ? <Briefcase size={24} /> : <CalendarDays size={24} />}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(activeTab, 'edit', item)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(activeTab, item.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black tracking-tight group-hover:text-primary-600 transition-colors uppercase">
                                    {activeTab === 'departments' ? item.name : activeTab === 'designations' ? item.title : item.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                                    {activeTab === 'departments' ? `Code: ${item.code || 'N/A'}` : activeTab === 'designations' ? item.department_name : (item.is_paid ? 'Paid Protocol' : 'Unpaid Role')}
                                </p>

                                <div className="mt-6 flex justify-between items-center bg-slate-50 rounded-2xl p-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                        <span className={`text-xs font-bold ${item.status === 'Active' || item.is_paid ? 'text-green-600' : 'text-slate-400'}`}>
                                            {activeTab === 'leave-types' ? (item.is_paid ? 'Active' : 'Unpaid') : (item.status || 'Active')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {activeTab === 'departments' ? 'HOD' : activeTab === 'designations' ? 'Salary Range' : 'Annual Limit'}
                                        </p>
                                        <p className="text-xs font-bold text-slate-700 tabular-nums">
                                            {activeTab === 'departments'
                                                ? (item.head_of_department || 'Not Set')
                                                : activeTab === 'designations'
                                                    ? `LKR ${Number(item.min_salary || 0).toLocaleString()}+`
                                                    : `${item.annual_limit} Days / Yr`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'deductions' && attendancePolicy && (
                    <div className="card-premium overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-10 border-b border-slate-50 bg-slate-50/30">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <DollarSign size={24} className="text-emerald-600" /> Global Deduction Rates
                            </h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">Configure company-wide multipliers and fixed hourly rates</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Absence Day Rate (Multiplier)</label>
                                    <div className="relative group">
                                        <input
                                            name="absent_deduction_rate"
                                            type="number"
                                            step="0.1"
                                            value={attendancePolicy.absent_deduction_rate}
                                            onChange={handlePolicyChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-black text-xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all tabular-nums"
                                            required
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs uppercase tracking-widest">X SALARY</div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold px-1 italic italic uppercase tracking-tighter tracking-tight">1.0 = Deduct exact 1 day salary. 1.5 = Deduct 1.5 days for disciplinary absence.</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Daily Absent Amount (Fixed රු.)</label>
                                    <div className="relative group">
                                        <input
                                            name="absent_day_amount"
                                            type="number"
                                            value={attendancePolicy.absent_day_amount}
                                            onChange={handlePolicyChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-20 pr-6 py-5 font-black text-xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all tabular-nums"
                                            required
                                        />
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">LKR</div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold px-1 italic">Current: රු. 2000. Set 0 to use Multiplier only.</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Late Hourly Rate (Fixed රු.)</label>
                                    <div className="relative group">
                                        <input
                                            name="late_hourly_rate"
                                            type="number"
                                            value={attendancePolicy.late_hourly_rate}
                                            onChange={handlePolicyChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-20 pr-6 py-5 font-black text-xl outline-none focus:ring-4 focus:ring-emerald-100 transition-all tabular-nums"
                                            required
                                        />
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">LKR</div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold px-1 italic">Current: රු. 500. Set 0 to calculate from Basic (Basic/240).</p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-12 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {saving ? 'Synchronizing System...' : <><Save size={18} /> Update & Sync All Policies</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'leave-types' && (
                    <div className="mt-10 p-10 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-14 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 w-80 h-80 bg-amber-500 rounded-full blur-3xl opacity-20 -mr-40 -mb-40"></div>
                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-black mb-4 uppercase tracking-widest leading-none">Initialize Leave Balances</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">Click sync to automatically initialize or update leave balances for all active employees for the year {new Date().getFullYear()}. This will ensure everyone has the correct quotas based on the rules above.</p>
                        </div>
                        <button
                            onClick={async () => {
                                if (!window.confirm("Initialize balances for all active employees? Existing 'Used' counts will be preserved.")) return;
                                setSaving(true);
                                try {
                                    await api.post('/leaves/sync-balances');
                                    alert('Balances synchronized successfully for all staff!');
                                } catch (error) {
                                    alert(error.response?.data?.message || 'Sync failed');
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className="bg-amber-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-900/50 hover:bg-amber-600 transition-all flex items-center gap-3 disabled:opacity-50 relative z-10"
                        >
                            {saving ? 'Processing...' : <><Activity size={18} /> Sync All Balances</>}
                        </button>
                    </div>
                )}

            </main>

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className={`p-8 text-white ${activeTab === 'departments' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h1 className="text-2xl font-black uppercase tracking-widest leading-tight">Operation<br />Standard</h1>
                                <h2 className="text-2xl font-black uppercase tracking-widest">
                                    {modal.mode === 'edit' ? 'Edit' : 'Add'} {activeTab === 'departments' ? 'Department' : 'Job Role'}
                                </h2>
                                <button onClick={() => setModal(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-white/80 font-medium">Please fill in the details below</p>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                {activeTab === 'departments' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Name</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="e.g. Finance & Accounts"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept Code</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                                    value={formData.code || ''}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                    placeholder="e.g. FIN-01"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HOD</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                                    value={formData.head_of_department || ''}
                                                    onChange={e => setFormData({ ...formData, head_of_department: e.target.value })}
                                                    placeholder="e.g. Jane Doe"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setModal(null)}
                                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                                            >
                                                {modal.mode === 'edit' ? 'Update' : 'Confirm'}
                                            </button>
                                        </div>
                                    </>
                                ) : activeTab === 'designations' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Title</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                                                value={formData.title || ''}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                required
                                                placeholder="e.g. Senior Software Engineer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                                                value={formData.department_id || ''}
                                                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Salary</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                                                    value={formData.min_salary || ''}
                                                    onChange={e => setFormData({ ...formData, min_salary: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Salary</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                                                    value={formData.max_salary || ''}
                                                    onChange={e => setFormData({ ...formData, max_salary: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setModal(null)}
                                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all"
                                            >
                                                {modal.mode === 'edit' ? 'Update' : 'Confirm'}
                                            </button>
                                        </div>
                                    </>
                                ) : activeTab === 'leave-types' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rule/Protocol Name</label>
                                            <input
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-bold"
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="e.g. ANNUAL LEAVE"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Annual Limit (Days)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-bold"
                                                    value={formData.annual_limit || 0}
                                                    onChange={e => setFormData({ ...formData, annual_limit: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Protocol</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-bold"
                                                    value={formData.is_paid === false ? 'false' : 'true'}
                                                    onChange={e => setFormData({ ...formData, is_paid: e.target.value === 'true' })}
                                                    required
                                                >
                                                    <option value="true">Paid Leave</option>
                                                    <option value="false">Unpaid / NOPAY</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setModal(null)}
                                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all"
                                            >
                                                {modal.mode === 'edit' ? 'Update' : 'Confirm'}
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </form>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default OrgManager;
