import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Award, Search, Calendar, ChevronRight, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const ComplianceManager = () => {
    const [disciplinary, setDisciplinary] = useState([]);
    const [training, setTraining] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeView, setActiveView] = useState('disciplinary'); // 'disciplinary' or 'training'

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [discRes, trainRes] = await Promise.all([
                api.get('/legal/disciplinary'),
                api.get('/legal/training')
            ]);
            setDisciplinary(discRes.data);
            setTraining(trainRes.data);
        } catch (error) {
            console.error("Error fetching global compliance", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = (activeView === 'disciplinary' ? disciplinary : training).filter(rec =>
        (rec.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadCSV = () => {
        let headers, rows;
        if (activeView === 'disciplinary') {
            headers = ["Employee", "Incident Date", "Description", "Action Taken", "Status", "Authorized By"];
            rows = disciplinary.filter(rec => rec.employee_name.toLowerCase().includes(searchTerm.toLowerCase())).map(rec => [
                rec.employee_name,
                new Date(rec.incident_date).toLocaleDateString(),
                `"${(rec.description || '').replace(/"/g, '""')}"`,
                rec.action_taken,
                rec.status,
                rec.created_by_name
            ]);
        } else {
            headers = ["Employee", "Training Name", "Provider", "Type", "Completion Date", "Expiry"];
            rows = training.filter(rec => rec.employee_name.toLowerCase().includes(searchTerm.toLowerCase())).map(rec => [
                rec.employee_name,
                rec.training_name,
                rec.provider,
                rec.type,
                new Date(rec.completion_date).toLocaleDateString(),
                rec.expiry_date ? new Date(rec.expiry_date).toLocaleDateString() : 'N/A'
            ]);
        }

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeView}_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Compliance & Legal Log</h1>
                        <p className="text-slate-500 mt-1 font-medium">Tracking company-wide disciplinary actions and certifications</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                            <button
                                onClick={() => setActiveView('disciplinary')}
                                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'disciplinary' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Disciplinary
                            </button>
                            <button
                                onClick={() => setActiveView('training')}
                                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeView === 'training' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Training
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by employee name..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {
                    loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                        {activeView === 'disciplinary' ? (
                                            <>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Date</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized By</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Name</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Completion</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                            </>
                                        )}
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-medium italic italic">No records found.</td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map(rec => (
                                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${activeView === 'disciplinary' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {activeView === 'disciplinary' ? <ShieldAlert size={18} /> : <Award size={18} />}
                                                        </div>
                                                        <span className="font-bold text-slate-900">{rec.employee_name}</span>
                                                    </div>
                                                </td>

                                                {activeView === 'disciplinary' ? (
                                                    <>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${rec.action_taken === 'Termination' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {rec.action_taken}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                                            {new Date(rec.incident_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-bold">
                                                            {rec.created_by_name}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-bold text-slate-900">{rec.training_name}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{rec.provider}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                                            {new Date(rec.completion_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-tight">
                                                                {rec.type}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}

                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        to={`/employees/${rec.employee_id}`}
                                                        className="inline-flex items-center justify-center p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </main >
        </div >
    );
};

export default ComplianceManager;
