import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Clock, AlertCircle, Save, CheckCircle2, DollarSign, CalendarDays } from 'lucide-react';
import Navbar from '../components/Navbar';

const AttendanceSettings = () => {
    const [policy, setPolicy] = useState({
        work_start_time: '08:30:00',
        work_end_time: '16:30:00',
        short_leave_monthly_limit: 2,
        half_day_yearly_limit: 4,
        absent_deduction_rate: 1.0,
        late_hourly_rate: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            const res = await api.get('/attendance/policy');
            if (res.data) setPolicy(res.data);
        } catch (error) {
            console.error("Error fetching policy", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPolicy(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put('/attendance/policy', policy);
            setMessage({ type: 'success', text: 'Attendance policy updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update policy' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="text-blue-600" size={32} /> Attendance Settings
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight">Configure work hours, leave limits, and automatic deduction rates</p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Clock size={20} className="text-blue-600" /> Work Hours & Schedule
                            </h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Standard Work Start</label>
                                <input name="work_start_time" type="time" value={policy.work_start_time} onChange={handleChange} className={inputClass} required />
                            </div>
                            <div>
                                <label className={labelClass}>Standard Work End</label>
                                <input name="work_end_time" type="time" value={policy.work_end_time} onChange={handleChange} className={inputClass} required />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <CalendarDays size={20} className="text-blue-600" /> Policy Limits
                            </h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Short Leave Limit (Monthly)</label>
                                <input name="short_leave_monthly_limit" type="number" value={policy.short_leave_monthly_limit} onChange={handleChange} className={inputClass} required />
                                <p className="mt-2 text-[10px] text-slate-400 font-bold px-1 italic">Maximum allowed requests per calendar month</p>
                            </div>
                            <div>
                                <label className={labelClass}>Half Day Limit (Yearly)</label>
                                <input name="half_day_yearly_limit" type="number" value={policy.half_day_yearly_limit} onChange={handleChange} className={inputClass} required />
                                <p className="mt-2 text-[10px] text-slate-400 font-bold px-1 italic">Maximum allowed requests per calendar year</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <DollarSign size={20} className="text-blue-600" /> Deduction Rules
                            </h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Absence Deduction Rate</label>
                                <input name="absent_deduction_rate" type="number" step="0.1" value={policy.absent_deduction_rate} onChange={handleChange} className={inputClass} required />
                                <p className="mt-2 text-[10px] text-slate-400 font-bold px-1 italic">Multiplier (1.0 = 1 day salary per day of absence)</p>
                            </div>
                            <div>
                                <label className={labelClass}>Late Hourly Rate ($)</label>
                                <input name="late_hourly_rate" type="number" value={policy.late_hourly_rate} onChange={handleChange} className={inputClass} required />
                                <p className="mt-2 text-[10px] text-slate-400 font-bold px-1 italic">Fixed amount per hour. Set 0 to use Basic/240.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Fuel Rate (per Liter)</label>
                                <input name="fuel_rate_per_liter" type="number" value={policy.fuel_rate_per_liter} onChange={handleChange} className={inputClass} required />
                                <p className="mt-2 text-[10px] text-slate-400 font-bold px-1 italic">Monthly rate used for Fuel Allowance (Price * 45L)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
};

export default AttendanceSettings;
