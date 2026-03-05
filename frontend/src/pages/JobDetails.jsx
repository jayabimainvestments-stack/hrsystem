import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
    Briefcase, MapPin, DollarSign, Calendar,
    ArrowLeft, Send, CheckCircle, Clock, Users,
    FileText, User, ChevronRight, Share2, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobData = async () => {
            try {
                const [jobRes, appsRes] = await Promise.all([
                    api.get(`/recruitment/jobs/${id}`),
                    api.get(`/recruitment/jobs/${id}/applications`)
                ]);
                setJob(jobRes.data);
                setApplications(appsRes.data);
            } catch (error) {
                console.error("Error fetching job details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobData();
    }, [id]);

    const handleUpdateJobStatus = async (status) => {
        try {
            await api.put(`/recruitment/jobs/${id}`, { status });
            setJob({ ...job, status });
            alert(`Job status updated to ${status}`);
        } catch (error) {
            alert('Failed to update job status');
        }
    };

    const handleUpdateApplicationStatus = async (appId, status) => {
        try {
            await api.put(`/recruitment/applications/${appId}`, { status });
            setApplications(applications.map(app => app.id === appId ? { ...app, status } : app));
            alert(`Application status updated to ${status}`);
        } catch (error) {
            alert('Failed to update application status');
        }
    };

    const handleHire = async (appId) => {
        // Collect extra info via prompts (simplified for audit, can be improved to a modal later)
        const password = prompt("Set initial system password for new employee:");
        if (!password) return;

        const role = prompt("Set system role (Employee/HR Manager/Admin):", "Employee");
        if (!role) return;

        try {
            await api.post(`/recruitment/applications/${appId}/hire`, { password, role });
            alert('Candidate hired and system profile created!');
            handleUpdateApplicationStatus(appId, 'Hired');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to hire candidate');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!job) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm">
                <Briefcase className="mx-auto text-slate-300 mb-4" size={48} />
                <h2 className="text-xl font-black text-slate-800 mb-2">Job Not Found</h2>
                <button onClick={() => navigate('/recruitment')} className="mt-4 text-blue-600 font-bold flex items-center gap-2 mx-auto"><ArrowLeft size={16} /> Back to Recruitment</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/recruitment')}
                    className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-xs uppercase tracking-widest mb-8 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Openings
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Job Details Section */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-100 mb-4 inline-block">
                                        {job.department}
                                    </span>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">{job.title}</h1>
                                    <div className="flex flex-wrap gap-6 text-slate-500 font-medium">
                                        <div className="flex items-center gap-2"><MapPin size={18} className="text-blue-400" /> {job.location}</div>
                                        <div className="flex items-center gap-2"><Briefcase size={18} className="text-blue-400" /> {job.type}</div>
                                        <div className="flex items-center gap-2"><DollarSign size={18} className="text-blue-400" /> {job.salary_range}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><Share2 size={20} /></button>
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><MoreHorizontal size={20} /></button>
                                </div>
                            </div>

                            <div className="prose prose-slate max-w-none mb-10">
                                <h3 className="text-xl font-black text-slate-800 mb-4 underline decoration-blue-500/30 decoration-4 underline-offset-4">Description & Requirements</h3>
                                <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">{job.description}</p>
                            </div>

                            <div className="flex gap-4 pt-8 border-t border-slate-50">
                                <button className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Edit Posting</button>
                                {job.status === 'Open' ? (
                                    <button onClick={() => handleUpdateJobStatus('Closed')} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">Close Opening</button>
                                ) : (
                                    <button onClick={() => handleUpdateJobStatus('Open')} className="flex-1 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest border border-blue-100 hover:bg-blue-100 transition-all">Re-open Opening</button>
                                )}
                            </div>
                        </div>

                        {/* Analysis Section (Placeholder) */}
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <h3 className="text-lg font-black uppercase tracking-widest mb-6 relative z-10">Applicant Insight</h3>
                            <div className="bg-white/10 p-6 rounded-3xl border border-white/10 relative z-10 mb-6">
                                <p className="text-blue-100 text-sm font-medium leading-relaxed">The applicant pool for this role is currently showing <span className="text-white font-black text-emerald-400">High Competency</span> in technical skills but moderate in cultural alignment. Recommend focused interview phase.</p>
                            </div>
                            <div className="flex gap-10 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Total Viewers</p>
                                    <p className="text-2xl font-black">1,248</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Conversion</p>
                                    <p className="text-2xl font-black">4.2%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Applications List */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Users className="text-blue-600" size={24} /> Candidates ({applications.length})
                        </h2>

                        <div className="space-y-4">
                            {applications.length > 0 ? applications.map(app => (
                                <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center font-black text-lg">
                                            {app.candidate_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-none">{app.candidate_name}</p>
                                            <p className="text-xs text-slate-400 font-bold mt-1">{app.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${app.status === 'Applied' ? 'bg-blue-50 text-blue-600' :
                                            app.status === 'Interviewing' ? 'bg-amber-50 text-amber-600' :
                                                app.status === 'Hired' ? 'bg-emerald-50 text-emerald-600' :
                                                    'bg-slate-100 text-slate-500'
                                            }`}>
                                            {app.status}
                                        </span>
                                        <a href={app.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-slate-50 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                                            <FileText size={12} /> CV
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {app.status === 'Applied' && (
                                            <button
                                                onClick={() => handleUpdateApplicationStatus(app.id, 'Interviewing')}
                                                className="py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-all"
                                            >

                                                Interview
                                            </button>
                                        )}
                                        {app.status === 'Interviewing' && (
                                            <button
                                                onClick={() => handleHire(app.id)}
                                                className="py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all col-span-2"
                                            >
                                                Approve Hire
                                            </button>
                                        )}
                                        {app.status !== 'Rejected' && app.status !== 'Hired' && (
                                            <button
                                                onClick={() => handleUpdateApplicationStatus(app.id, 'Rejected')}
                                                className={`py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50 hover:text-red-500 transition-all ${app.status === 'Applied' ? '' : 'col-span-2'}`}
                                            >
                                                Reject
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center text-slate-400 font-medium">
                                    No candidates have applied for this position yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JobDetails;
