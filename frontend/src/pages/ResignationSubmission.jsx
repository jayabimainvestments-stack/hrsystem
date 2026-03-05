import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Send, Calendar, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

const ResignationSubmission = () => {
    const navigate = useNavigate();
    const [reason, setReason] = useState('');
    const [lastDay, setLastDay] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/resignations', {
                reason,
                desired_last_day: lastDay
            });
            alert('Resignation Submitted');
            navigate('/dashboard');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit resignation');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
                <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-black uppercase text-[10px] tracking-widest mb-10">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Cancel
                </button>

                <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-10 bg-slate-900 text-white relative">
                        <div className="absolute right-0 bottom-0 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-10 -mr-32 -mb-32"></div>
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="p-5 bg-white/10 rounded-3xl border border-white/10">
                                <AlertTriangle className="text-red-400" size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight leading-none mb-2 uppercase">Resignation</h1>
                                <p className="text-slate-400 font-medium">Submit your resignation and notice period details</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-12 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Effective Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold outline-none focus:ring-2 ring-red-500/20"
                                            value={lastDay}
                                            onChange={e => setLastDay(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 ml-1 italic">* Notice period calculation starts from submission date.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Resignation</label>
                                    <div className="relative">
                                        <FileText className="absolute left-5 top-5 text-slate-400" size={20} />
                                        <textarea
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] pl-14 pr-6 py-5 font-bold h-48 outline-none focus:ring-2 ring-red-500/20"
                                            placeholder="Please provide the reason for your resignation..."
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 flex flex-col items-center gap-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full max-w-md py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600 hover:-translate-y-1'}`}
                            >
                                {submitting ? 'Submitting...' : (
                                    <>
                                        <Send size={20} /> Submit Resignation
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center max-w-xs">
                                By submitting, you acknowledge that this is a final action and will trigger exit workflows.
                            </p>
                        </div>
                    </form>
                </div>

                <div className="mt-10 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex items-start gap-6">
                    <div className="p-3 bg-white rounded-2xl text-amber-500 shadow-sm">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-amber-900 mb-1">Standard Notice Period</h4>
                        <p className="text-amber-700/70 text-sm font-medium leading-relaxed">Please ensure your proposed last day aligns with your notice period as per your contract to avoid any issues in the final settlement.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ResignationSubmission;
