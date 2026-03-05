import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Briefcase, Building2, MapPin, Calendar, Clock, Send, Upload, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ApplyJob = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        resume: null
    });

    useEffect(() => {
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data } = await api.get(`/recruitment/jobs/${id}`);
            setJob(data);
        } catch (error) {
            console.error("Error fetching job", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('full_name', formData.full_name);
        data.append('email', formData.email);
        data.append('phone', formData.phone);
        if (formData.resume) data.append('resume', formData.resume);

        setSubmitting(true);
        try {
            await api.post(`/recruitment/jobs/${id}/apply`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Application Submitted Successfully');
            navigate('/recruitment');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, resume: e.target.files[0] });
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!job) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 max-w-sm">
                <Briefcase className="mx-auto text-slate-100 mb-6" size={64} />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Job Unavailable</h2>
                <p className="text-slate-500 font-medium">This vacancy might have been closed or filled recently.</p>
                <button onClick={() => navigate('/recruitment')} className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Browse Vacancies</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full space-y-10">
                <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-black uppercase text-[10px] tracking-widest">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to listings
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    {/* Job Summary Left */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 w-48 h-48 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-24 -mb-24"></div>
                            <h1 className="text-2xl font-black mb-6 tracking-tight leading-tight">{job.title}</h1>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                                    <Building2 size={16} /> {job.department}
                                </div>
                                <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                                    <MapPin size={16} /> {job.location || 'Remote / Dual-Site'}
                                </div>
                                <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                                    <Clock size={16} /> {job.type || 'Full-time'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ShieldCheck className="text-emerald-500" size={16} /> Fast-Track Process
                            </h3>
                            <p className="text-slate-600 font-medium text-sm leading-relaxed">Your application will be directly reviewed by our department heads based on the technical matrix specified for this role.</p>
                        </div>
                    </div>

                    {/* Application Form Right */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-md">
                            <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-widest">Candidate Registry</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-blue-500/20"
                                        placeholder="Alex Mercer"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-blue-500/20"
                                            placeholder="alex@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-blue-500/20"
                                            placeholder="+94 77 XXX XXXX"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credential Portfolio (Resume)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            required
                                        />
                                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center group-hover:border-blue-300 transition-all">
                                            <Upload className="mx-auto text-slate-300 mb-2 group-hover:text-blue-400" size={32} />
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-tight truncate px-4">
                                                {formData.resume ? formData.resume.name : 'Select or drop PDF resume'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                                >
                                    {submitting ? 'Submitting Application...' : (
                                        <>
                                            <Send size={18} /> Submit Application
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">By submitting, you agree to our data processing guidelines</p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyJob;
