import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Calendar, Trash2, Plus, CalendarDays, Zap, AlertCircle } from 'lucide-react';

const HolidaysConfig = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ date: '', name: '', type: 'Public Holiday' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const presetHolidays = [
        { date: '2026-01-03', name: 'Duruthu Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-01-15', name: 'Tamil Thai Pongal Day', type: 'Public Holiday' },
        { date: '2026-02-01', name: 'Navam Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-02-04', name: 'National Independence Day', type: 'Public Holiday' },
        { date: '2026-02-15', name: 'Mahasivarathri Day', type: 'Public Holiday' },
        { date: '2026-03-02', name: 'Madin Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-03-21', name: 'Id-Ul-Fitr (Ramazan)', type: 'Public Holiday' },
        { date: '2026-04-01', name: 'Bak Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-04-13', name: 'Sinhala & Tamil New Year Eve', type: 'Public Holiday' },
        { date: '2026-04-14', name: 'Sinhala & Tamil New Year', type: 'Public Holiday' },
        { date: '2026-05-01', name: 'Vesak Poya & May Day', type: 'Public Holiday' },
        { date: '2026-05-02', name: 'Day following Vesak', type: 'Public Holiday' },
        { date: '2026-05-28', name: 'Id-Ul-Alha (Haji)', type: 'Public Holiday' },
        { date: '2026-06-29', name: 'Poson Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-07-29', name: 'Esala Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-08-27', name: 'Nikini Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-09-25', name: 'Binara Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-10-25', name: 'Vap Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-11-08', name: 'Deepavali Festival Day', type: 'Public Holiday' },
        { date: '2026-11-24', name: 'Il Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-12-23', name: 'Unduvap Full Moon Poya Day', type: 'Public Holiday' },
        { date: '2026-12-25', name: 'Christmas Day', type: 'Mercantile Holiday' }
    ];

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/holidays');
            setHolidays(data);
        } catch (error) {
            console.error('Error fetching holidays', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/holidays', formData);
            setFormData({ date: '', name: '', type: 'Public Holiday' });
            fetchHolidays();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add holiday');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPreset = async (preset) => {
        setIsSubmitting(true);
        try {
            await api.post('/holidays', preset);
            fetchHolidays();
        } catch (error) {
            alert(error.response?.data?.message || 'Holiday already exists or failed to add');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this holiday?')) return;
        try {
            await api.delete(`/holidays/${id}`);
            fetchHolidays();
        } catch (error) {
            alert('Failed to delete holiday');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in duration-700">
                
                {/* Header */}
                <header className="mb-10 text-center relative group">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all"></div>
                    <div className="relative z-10 p-4 inline-flex items-center justify-center bg-white border border-slate-100 shadow-xl shadow-amber-100 rounded-[2rem] mb-6">
                        <CalendarDays className="text-amber-500" size={36} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">
                        Holiday <span className="text-amber-500 border-b-4 border-amber-500 pb-1">Calendar</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto leading-relaxed">
                        Define public and company holidays here. On these dates, the system will automatically bypass the daily 'Absent' marking for all employees. 
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleAdd} className="bg-white rounded-[3rem] p-8 lg:p-10 border border-slate-100 shadow-xl overflow-hidden relative group">
                            <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                            
                            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3">
                                <Plus size={24} className="text-emerald-500" /> Declare Holiday
                            </h2>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Holiday Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-300 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Title / Reason</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Independence Day"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-300 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Holiday Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-300 transition-all appearance-none cursor-pointer"
                                    >
                                        <option>Public Holiday</option>
                                        <option>Mercantile Holiday</option>
                                        <option>Company Special Holiday</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                disabled={isSubmitting}
                                type="submit"
                                className="w-full mt-10 relative group overflow-hidden bg-slate-900 text-white rounded-[1.5rem] py-5 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    <Zap size={16} className="text-amber-400 fill-amber-400" /> {isSubmitting ? 'Registering...' : 'Register Holiday'}
                                </span>
                            </button>

                            {/* Preset Holidays Section */}
                            <div className="mt-8 border-t border-slate-100 pt-8">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Suggested Holidays (2026)</h3>
                                <div className="space-y-3">
                                    {presetHolidays.map((sh, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm leading-tight">{sh.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sh.date} &bull; {sh.type}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddPreset(sh)}
                                                disabled={isSubmitting}
                                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                                                title="Add to Calendar"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                                    <Calendar size={20} className="text-blue-500" /> Scheduled Holidays
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Calendar Overview</p>
                            </div>
                            <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-black uppercase tracking-widest shadow-inner">
                                {holidays.length} Dates
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-400 font-medium italic animate-pulse">
                                Accessing calendar records...
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center shadow-sm relative overflow-hidden">
                                <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                                <h4 className="text-lg font-black text-slate-700 mb-2">No Holidays Registered</h4>
                                <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">
                                    The calendar is currently empty. The system will process attendance normally for all weekdays.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {holidays.map((h, idx) => (
                                    <div key={h.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-lg transition-all group overflow-hidden relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 to-rose-400 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 text-center shadow-inner min-w-[100px]">
                                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                                                <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{new Date(h.date).getDate()}</p>
                                                <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase mt-1">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 leading-tight mb-2 tracking-tight">{h.name}</h4>
                                                <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                                    {h.type}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(h.id)}
                                            className="p-4 bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all self-end md:self-auto shadow-sm"
                                            title="Remove Holiday"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HolidaysConfig;
