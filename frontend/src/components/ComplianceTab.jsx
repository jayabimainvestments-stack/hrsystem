import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Award, FileText, CheckCircle2, AlertTriangle, Scale, Plus, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const ComplianceTab = ({ employeeId }) => {
    const [disciplinaryRecords, setDisciplinary] = useState([]);
    const [trainingCertifications, setTraining] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDisciplinaryForm, setShowDisciplinaryForm] = useState(false);
    const [showTrainingForm, setShowTrainingForm] = useState(false);

    // Form States
    const [discForm, setDiscForm] = useState({ description: '', action_taken: 'Verbal Warning', incident_date: '', status: 'Open' });
    const [trainForm, setTrainForm] = useState({ training_name: '', provider: '', completion_date: '', expiry_date: '', type: 'Internal' });

    // The token is now handled by the api interceptor, so this line can be removed if not used elsewhere
    // const token = localStorage.getItem('token');

    useEffect(() => {
        fetchComplianceData();
    }, [employeeId]);

    const fetchComplianceData = async () => {
        try {
            const [discRes, trainRes] = await Promise.all([
                api.get(`/legal/disciplinary/${employeeId}`),
                api.get(`/legal/training/${employeeId}`)
            ]);
            setDisciplinary(discRes.data);
            setTraining(trainRes.data);
        } catch (error) {
            console.error("Error fetching compliance data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/legal/disciplinary', { ...discForm, employee_id: employeeId });
            alert('Incident recorded successfully');
            setShowDisciplinaryForm(false);
            setDiscForm({ description: '', action_taken: 'Verbal Warning', incident_date: '', status: 'Open' });
            fetchComplianceData();
        } catch (error) {
            alert('Action blocked');
        }
    };

    const handleTrainSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/legal/training', { ...trainForm, employee_id: employeeId });
            alert('Training record saved');
            setShowTrainingForm(false);
            setTrainForm({ training_name: '', provider: '', completion_date: '', expiry_date: '', type: 'Internal' });
            fetchComplianceData();
        } catch (error) {
            alert('Action blocked');
        }
    };

    if (loading) return <div className="p-4 text-center">Loading compliance data...</div>;

    return (
        <div className="space-y-12">
            {/* Disciplinary Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-red-50 p-4 rounded-xl border border-red-100">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-600" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-red-900">Disciplinary & Grievance</h3>
                            <p className="text-sm text-red-700">Records of misconduct or formal warnings</p>
                        </div>
                    </div>
                    <button onClick={() => setShowDisciplinaryForm(!showDisciplinaryForm)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2">
                        {showDisciplinaryForm ? <ChevronUp size={18} /> : <Plus size={18} />}
                        Add Record
                    </button>
                </div>

                {showDisciplinaryForm && (
                    <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm animate-in fade-in duration-300">
                        <form onSubmit={handleDiscSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Incident Description</label>
                                <textarea required className="w-full border border-gray-300 rounded-lg p-2.5" rows="3" value={discForm.description} onChange={e => setDiscForm({ ...discForm, description: e.target.value })}></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Action Taken</label>
                                <select className="w-full border border-gray-300 rounded-lg p-2.5" value={discForm.action_taken} onChange={e => setDiscForm({ ...discForm, action_taken: e.target.value })}>
                                    <option>Verbal Warning</option>
                                    <option>Written Warning</option>
                                    <option>Suspension</option>
                                    <option>Termination</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Incident Date</label>
                                <input type="date" required className="w-full border border-gray-300 rounded-lg p-2.5" value={discForm.incident_date} onChange={e => setDiscForm({ ...discForm, incident_date: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 shadow-md font-semibold">Save Record</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    {disciplinaryRecords.length === 0 ? (
                        <div className="bg-gray-50 p-6 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-500 italic">No disciplinary records on file.</div>
                    ) : (
                        disciplinaryRecords.map(record => (
                            <div key={record.id} className="bg-white border-l-4 border-l-red-500 border border-gray-200 rounded-r-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-red-700">{record.action_taken}</span>
                                    <span className="text-sm text-gray-500 flex items-center gap-1"><Calendar size={14} /> {new Date(record.incident_date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded italic text-sm">{record.description}</p>
                                <div className="mt-2 flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gray-400">
                                    <span>Status: {record.status}</span>
                                    <span>Added on {new Date(record.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Training Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                        <Award className="text-blue-600" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-blue-900">Training & Certifications</h3>
                            <p className="text-sm text-blue-700">Completed skills development and mandatory compliance</p>
                        </div>
                    </div>
                    <button onClick={() => setShowTrainingForm(!showTrainingForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                        {showTrainingForm ? <ChevronUp size={18} /> : <Plus size={18} />}
                        Add Training
                    </button>
                </div>

                {showTrainingForm && (
                    <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm animate-in fade-in duration-300">
                        <form onSubmit={handleTrainSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Training/Certification Name</label>
                                <input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5" value={trainForm.training_name} onChange={e => setTrainForm({ ...trainForm, training_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
                                <input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5" value={trainForm.provider} onChange={e => setTrainForm({ ...trainForm, provider: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                                <select className="w-full border border-gray-300 rounded-lg p-2.5" value={trainForm.type} onChange={e => setTrainForm({ ...trainForm, type: e.target.value })}>
                                    <option>Internal</option>
                                    <option>External</option>
                                    <option>Mandatory Compliance</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Completion Date</label>
                                <input type="date" required className="w-full border border-gray-300 rounded-lg p-2.5" value={trainForm.completion_date} onChange={e => setTrainForm({ ...trainForm, completion_date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date (Optional)</label>
                                <input type="date" className="w-full border border-gray-300 rounded-lg p-2.5" value={trainForm.expiry_date} onChange={e => setTrainForm({ ...trainForm, expiry_date: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md font-semibold">Link Certificate</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trainingCertifications.length === 0 ? (
                        <div className="md:col-span-2 bg-gray-50 p-6 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-500 italic">No training certifications on record.</div>
                    ) : (
                        trainingCertifications.map(train => (
                            <div key={train.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-50 p-2 rounded-lg">
                                        <Award className="text-blue-600" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 leading-tight">{train.training_name}</h4>
                                        <p className="text-sm text-gray-500">{train.provider}</p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-blue-100 text-blue-700 rounded-full tracking-tighter">{train.type}</span>
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Calendar size={12} /> {new Date(train.completion_date).toLocaleDateString()}</span>
                                        </div>
                                        {train.expiry_date && (
                                            <div className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 p-1 rounded inline-block">Expires: {new Date(train.expiry_date).toLocaleDateString()}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplianceTab;
