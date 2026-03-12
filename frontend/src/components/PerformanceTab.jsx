import { useState, useEffect } from 'react';
import api from '../services/api';
import { Star, TrendingUp, Target, Plus, Download, ChevronRight, Award, ChevronUp, FileText } from 'lucide-react';

const PerformanceTab = ({ employeeId }) => {
    const [appraisals, setAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        appraisal_period: '',
        goals_achieved: '',
        skills_rating: '3',
        behavior_rating: '3',
        reviewer_comments: '',
        status: 'Submitted'
    });

    const token = sessionStorage.getItem('token');

    useEffect(() => {
        fetchAppraisals();
    }, [employeeId]);

    const fetchAppraisals = async () => {
        try {
            const res = await api.get(`/performance/employee/${employeeId}`);
            setAppraisals(res.data);
        } catch (error) {
            console.error("Error fetching performance", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/performance', {
                ...formData,
                employee_id: employeeId
            });
            setShowAddForm(false);
            setFormData({
                appraisal_period: '',
                goals_achieved: '',
                skills_rating: '3',
                behavior_rating: '3',
                reviewer_comments: '',
                status: 'Submitted'
            });
            fetchAppraisals();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit appraisal');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading performance data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Performance Appraisals</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    {showAddForm ? <ChevronUp size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'New Appraisal'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Appraisal Period (e.g., 2025-H1, 2024-Q4)</label>
                            <input
                                type="text"
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={formData.appraisal_period}
                                onChange={e => setFormData({ ...formData, appraisal_period: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Skills Rating (1-5)</label>
                            <input
                                type="number"
                                min="1" max="5"
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={formData.skills_rating}
                                onChange={e => setFormData({ ...formData, skills_rating: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Behavior Rating (1-5)</label>
                            <input
                                type="number"
                                min="1" max="5"
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={formData.behavior_rating}
                                onChange={e => setFormData({ ...formData, behavior_rating: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Goals Achieved</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                rows="3"
                                value={formData.goals_achieved}
                                onChange={e => setFormData({ ...formData, goals_achieved: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reviewer Comments</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                rows="3"
                                value={formData.reviewer_comments}
                                onChange={e => setFormData({ ...formData, reviewer_comments: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors shadow-md font-semibold"
                            >
                                Submit Appraisal
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {appraisals.length === 0 ? (
                    <div className="bg-white p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <Star className="mx-auto text-gray-300 mb-2" size={48} />
                        <p className="text-gray-500 italic">No appraisal records found for this employee.</p>
                    </div>
                ) : (
                    appraisals.map(appraisal => (
                        <div key={appraisal.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{appraisal.appraisal_period}</h4>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                        Overall Score: <span className="text-blue-600">{Number(appraisal.overall_score).toFixed(2)} / 5.00</span>
                                    </span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${appraisal.status === 'Finalized' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {appraisal.status}
                                </span>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Ratings</h5>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                            <span className="text-sm font-medium text-slate-600">Skills & Competency</span>
                                            <span className="font-bold text-blue-600">{appraisal.skills_rating} / 5</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                            <span className="text-sm font-medium text-slate-600">Behavior & Teamwork</span>
                                            <span className="font-bold text-blue-600">{appraisal.behavior_rating} / 5</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Goals Achieved</h5>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed italic">
                                            {appraisal.goals_achieved || 'No specific goals recorded.'}
                                        </p>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Reviewer Comments</h5>
                                        <div className="flex gap-2">
                                            <FileText size={16} className="text-slate-400 mt-1 shrink-0" />
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                {appraisal.reviewer_comments || 'No comments provided.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PerformanceTab;
