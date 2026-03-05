import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, CheckCircle2, Circle, AlertTriangle, Save, Clock, Trash2, Plus } from 'lucide-react';

const ExitTab = ({ employeeId }) => {
    const [resignation, setResignation] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    // Form states
    const [reason, setReason] = useState('');
    const [lastDay, setLastDay] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchResignation();
    }, [employeeId]);

    const fetchResignation = async () => {
        setLoading(true);
        try {
            // Fetch focused resignation for this specific employee profile view
            const { data } = await api.get(`/resignations/employee/${employeeId}`);
            setResignation(data);
            if (data) setNotes(data.exit_interview_notes || '');
        } catch (error) {
            console.error("Error fetching resignation", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/resignations', {
                employee_id: employeeId,
                reason,
                desired_last_day: lastDay
            });
            alert('Resignation submitted successfully');
            fetchResignation();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit resignation');
        }
    };

    const handleUpdateStatus = async (status) => {
        if (!resignation) return;
        try {
            await api.put(`/resignations/${resignation.id}`, {
                status,
                exit_interview_notes: notes
            });
            alert(`Status updated to ${status}`);
            fetchResignation();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400 italic">Loading exit details...</div>;

    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'HR Manager';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-10 -mr-32 -mb-32"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-white/10 rounded-[2rem] border border-white/10">
                            <LogOut className="text-red-400" size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Resignation</h3>
                            <p className="text-slate-400 font-medium">Offboarding and exit management</p>
                        </div>
                    </div>
                    {resignation && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex gap-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Status</p>
                                <span className={`text-xs font-black uppercase tracking-widest ${resignation.status === 'Approved' ? 'text-emerald-400' :
                                    resignation.status === 'Rejected' ? 'text-red-400' :
                                        'text-amber-400'
                                    }`}>{resignation.status}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Last Day</p>
                                <p className="text-sm font-black">{resignation.desired_last_day ? new Date(resignation.desired_last_day).toLocaleDateString() : 'TBD'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {!resignation ? (
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                            <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <FileText className="text-blue-600" size={24} /> Submit Resignation
                            </h4>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Effective Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold"
                                        value={lastDay}
                                        onChange={e => setLastDay(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Rationale</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-5 py-4 font-bold h-48 focus:ring-2 ring-blue-500/20"
                                        placeholder="Reason for leaving and feedback..."
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Submit Resignation</button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 font-bold">Resignation Context</h4>
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8 italic text-slate-600 font-medium leading-relaxed">
                                    "{resignation.reason}"
                                </div>

                                {isAdmin && resignation.status === 'Pending' && (
                                    <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem]">
                                        <button onClick={() => handleUpdateStatus('Approved')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 font-bold">Approve</button>
                                        <button onClick={() => handleUpdateStatus('Rejected')} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 font-bold">Reject</button>
                                    </div>
                                )}
                            </div>

                            {/* Exit Interview (Admin Only) */}
                            {isAdmin && (
                                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                                    <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <AlertTriangle className="text-amber-500" size={24} /> Exit Interview notes
                                    </h4>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-5 font-bold h-48 mb-6"
                                        placeholder="Confidential exit interview findings..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                    <button onClick={() => handleUpdateStatus(resignation.status)} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all font-bold">
                                        <Save size={18} /> Record findings
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Clearance Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-600" size={24} /> Asset Return
                    </h2>
                    <OffboardingList employeeId={employeeId} />
                </div>
            </div>
        </div>
    );
};

const OffboardingList = ({ employeeId }) => {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, [employeeId]);

    const fetchTasks = async () => {
        try {
            const { data } = await api.get(`/onboarding/tasks/${employeeId}`);
            setTasks(data.filter(t => t.type === 'Offboarding'));
        } catch (error) {
            console.error("Error fetching tasks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        try {
            await api.post('/onboarding/tasks', {
                employee_id: employeeId,
                tasks: [newTask],
                type: 'Offboarding'
            });
            setNewTask('');
            fetchTasks();
        } catch (error) {
            alert('Failed to add task');
        }
    };

    const toggleTask = async (taskId, completed) => {
        try {
            await api.put(`/onboarding/tasks/${taskId}`, { completed });
            fetchTasks();
        } catch (error) {
            alert('Failed to update task');
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <form onSubmit={handleAddTask} className="relative">
                    <input
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 font-bold text-xs"
                        placeholder="New item (e.g. ID Card)..."
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg"><Plus size={16} /></button>
                </form>
            </div>
            <div className="divide-y divide-slate-50">
                {tasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <button onClick={() => toggleTask(task.id, !task.completed)} className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-200 hover:text-blue-400'}`}>
                                {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <span className={`text-xs font-bold leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.task_name}</span>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Inventory clear</div>
                )}
            </div>
        </div>
    );
};

export default ExitTab;
