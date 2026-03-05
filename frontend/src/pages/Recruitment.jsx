import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
    Briefcase, Plus, Users, Search,
    Filter, ChevronRight, Calendar, MapPin, DollarSign
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Recruitment = () => {
    const [jobs, setJobs] = useState([]);
    const [recentApplications, setRecentApplications] = useState([]);
    const [departments, setDepartments] = useState([]); // New state for depts
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Job Form State
    const [newJob, setNewJob] = useState({
        title: '', department: '', location: 'Colombo', type: 'Full-time', salary_range: '', description: ''
    });

    const { user } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [jobsRes, appsRes, deptRes] = await Promise.all([
                api.get('/recruitment/jobs'),
                api.get('/recruitment/applications/recent'),
                api.get('/meta/departments') // Fetch departments
            ]);
            setJobs(jobsRes.data);
            setRecentApplications(appsRes.data);
            setDepartments(deptRes.data);
        } catch (error) {
            console.error("Error fetching recruitment data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            await api.post('/recruitment/jobs', newJob);
            setShowCreateModal(false);
            fetchData();
            alert('Job posting created successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create job');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );


    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="py-10 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recruitment Hub</h1>
                        <p className="text-slate-500 font-medium">Manage job postings and track applicant pipeline</p>
                    </div>
                    {user.role === 'Admin' || user.role === 'HR Manager' ? (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                        >
                            <Plus size={20} /> New Opening
                        </button>
                    ) : null}

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Jobs List */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Briefcase className="text-blue-600" size={24} /> Active Openings
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {jobs.map(job => (
                                <Link
                                    to={`/recruitment/jobs/${job.id}`}
                                    key={job.id}
                                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Briefcase size={20} />
                                        </div>

                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${job.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mb-1">{job.title}</h3>
                                    <p className="text-slate-500 text-sm font-medium mb-4">{job.department} • {job.location}</p>
                                    <div className="flex items-center justify-between text-slate-400">
                                        <span className="text-xs font-bold uppercase tracking-wider">{job.type}</span>
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Applications Sidebar */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Users className="text-blue-600" size={24} /> Recent Applicants
                        </h2>

                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-50">
                                {recentApplications.length > 0 ? recentApplications.map(app => (
                                    <div key={app.id} className="p-5 hover:bg-slate-50 transition-colors">
                                        <p className="font-bold text-slate-900">{app.candidate_name || 'Anonymous Candidate'}</p>
                                        <p className="text-xs text-slate-500 mb-2">{app.job_title || 'Unspecified Role'}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                                                {app.status || 'Pending'}
                                            </span>

                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-slate-400 italic">No recent applications</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Job Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-widest">New Opportunity</h2>
                            <p className="text-blue-100 font-medium">Post a new opening to the careers portal</p>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleCreateJob} className="p-8 space-y-4">
                                <input
                                    placeholder="Job Title"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                    value={newJob.title}
                                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    required
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                        value={newJob.department}
                                        onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        placeholder="Location"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                        value={newJob.location}
                                        onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                        value={newJob.type}
                                        onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                                    >
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Remote</option>
                                    </select>
                                    <input
                                        placeholder="Salary Range"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold"
                                        value={newJob.salary_range}
                                        onChange={e => setNewJob({ ...newJob, salary_range: e.target.value })}
                                    />
                                </div>
                                <textarea
                                    placeholder="Job Description & Requirements..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold h-32"
                                    value={newJob.description}
                                    onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                                    required
                                ></textarea>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100">Post Job</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Recruitment;
