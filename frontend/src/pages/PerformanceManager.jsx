import { useState, useEffect } from 'react';
import api from '../services/api';
import { Star, Filter, Search, ChevronRight, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const PerformanceManager = () => {
    const [appraisals, setAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAppraisals();
    }, []);

    const fetchAppraisals = async () => {
        try {
            const res = await api.get('/performance/global');
            setAppraisals(res.data);
        } catch (error) {
            console.error("Error fetching global performance", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAppraisals = appraisals.filter(app => {
        const matchesSearch = (app.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const downloadCSV = () => {
        const headers = ["Employee", "Period", "Appraiser", "Outcome", "Score", "Comments"];
        const rows = filteredAppraisals.map(app => [
            app.employee_name,
            app.appraisal_period,
            app.appraiser_name,
            app.status,
            app.overall_score,
            `"${(app.reviewer_comments || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `performance_report_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Performance Overview</h1>
                        <p className="text-slate-500 mt-1 font-medium">Manage and review appraisals across all departments</p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >

                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-600"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >

                            <option value="All">All Status</option>
                            <option value="Submitted">Submitted</option>
                            <option value="Reviewed">Reviewed</option>
                            <option value="Finalized">Finalized</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>

                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAppraisals.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <Star className="mx-auto text-slate-200 mb-4" size={64} />
                                <p className="text-slate-400 text-lg font-medium">No appraisals matching your criteria.</p>
                            </div>
                        ) : (
                            filteredAppraisals.map(app => (
                                <div key={app.id} className="group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 p-2 rounded-2xl text-blue-600">
                                                    <Star size={20} fill="currentColor" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{app.employee_name}</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{app.appraisal_period}</p>
                                                </div>
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${app.status === 'Finalized' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Score</p>
                                                <p className="text-xl font-bold text-blue-600">{Number(app.overall_score).toFixed(2)}</p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appraiser</p>
                                                <p className="text-sm font-semibold text-slate-700 truncate">{app.appraiser_name}</p>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-600 line-clamp-2 italic mb-4">
                                            "{app.reviewer_comments || 'No comments recorded.'}"
                                        </p>

                                        <Link
                                            to={`/employees/${app.employee_id}`}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200"
                                        >

                                            View Full Profile
                                            <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PerformanceManager;
