import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, CheckCircle2, Circle, AlertTriangle, Save, Clock, Trash2, Plus, RotateCcw, ShieldCheck, ArrowRight } from 'lucide-react';

const ExitTab = ({ employeeId, onStatusChange }) => {
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
            alert('Exit request initiated successfully. Awaiting secondary administrator review (Maker-Checker policy).');
            await fetchResignation();
            if (onStatusChange) onStatusChange();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit resignation');
        }
    };

    const handleUpdateStatus = async (status) => {
        if (!resignation) return;
        const confirmMsg = status === 'Approved' 
            ? 'Are you sure you want to AUTHORIZE and APPROVE this exit? The employee will be marked as RESIGNED and their account access will be deactivated.' 
            : `Are you sure you want to set status to ${status}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await api.put(`/resignations/${resignation.id}`, {
                status,
                exit_interview_notes: notes
            });
            alert(`Status updated to ${status}`);
            await fetchResignation();
            if (onStatusChange) onStatusChange();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400 italic">Loading exit details...</div>;

    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'HR Manager';
    const isSelfInitiated = resignation && resignation.requested_by && String(resignation.requested_by) === String(currentUser.id);

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
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Resignation & Exit</h3>
                                <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-white/10">
                                    <ShieldCheck size={12} className="text-emerald-400" /> Maker-Checker Enabled
                                </span>
                            </div>
                            <p className="text-slate-400 font-medium">Offboarding, clearance and dual-authorization exit management</p>
                        </div>
                    </div>
                    {resignation && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex gap-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Status</p>
                                <span className={`text-xs font-black uppercase tracking-widest ${
                                    resignation.status === 'Approved' || resignation.status === 'Completed' ? 'text-emerald-400' :
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
                            <h4 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                                <FileText className="text-blue-600" size={24} /> Initiate Employee Exit / Resignation
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mb-6">
                                Submitting this request will queue it for dual approval. A secondary administrator must review and approve before final termination.
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Effective Date / Last Working Day</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold"
                                        value={lastDay}
                                        onChange={e => setLastDay(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Rationale / Reason</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-5 py-4 font-bold h-48 focus:ring-2 ring-blue-500/20"
                                        placeholder="Reason for resignation or termination..."
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                    <span>Initiate Exit Request (Maker)</span>
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 font-bold">Resignation Context</h4>
                                        {resignation.requester_name && (
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Initiated by: <span className="font-bold text-slate-700">{resignation.requester_name}</span>
                                            </p>
                                        )}
                                    </div>
                                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                                        resignation.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                                        resignation.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                        'bg-amber-50 text-amber-700'
                                    }`}>
                                        {resignation.status}
                                    </span>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 mb-8 italic text-slate-600 font-medium leading-relaxed">
                                    "{resignation.reason}"
                                </div>

                                {/* Dual Authorization Controls */}
                                {isAdmin && resignation.status === 'Pending' && (
                                    <div>
                                        {isSelfInitiated ? (
                                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 space-y-3">
                                                <div className="flex items-center gap-2 font-black text-sm text-amber-800">
                                                    <Clock className="text-amber-600" size={18} />
                                                    <span>Awaiting Secondary Authorization (Maker-Checker Policy)</span>
                                                </div>
                                                <p className="text-xs font-medium text-amber-700 leading-relaxed">
                                                    You initiated this exit record. Under the institutional governance policy, a <strong>second authorized administrator</strong> (e.g. Managing Director / Senior Admin) must review and approve this exit request.
                                                </p>
                                                <div className="pt-2">
                                                    <a href="/governance" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 underline hover:text-amber-950">
                                                        <span>View in Governance Dashboard</span> &rarr;
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-blue-900 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Initiated By (Maker)</p>
                                                        <p className="text-xs font-bold">{resignation.requester_name || 'Administrator'}</p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-blue-200 text-blue-900 rounded-full">
                                                        Secondary Reviewer (Checker)
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem]">
                                                    <button onClick={() => handleUpdateStatus('Approved')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 font-bold hover:bg-emerald-700 transition-all">
                                                        Approve & Authorize Exit (Checker)
                                                    </button>
                                                    <button onClick={() => handleUpdateStatus('Rejected')} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 font-bold hover:bg-red-700 transition-all">
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isAdmin && resignation.status === 'Approved' && (
                                    <div className="flex gap-4 p-2 bg-slate-50 rounded-[2rem] items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 px-4">Employee is currently marked as Resigned.</span>
                                        <button onClick={() => handleUpdateStatus('Rejected')} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-all flex items-center gap-1.5">
                                            <RotateCcw size={14} /> Revert to Active
                                        </button>
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
                        <CheckCircle2 className="text-blue-600" size={24} /> Asset Return & Clearance
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

    const toggleTask = async (taskId, currentCompleted) => {
        try {
            await api.put(`/onboarding/tasks/${taskId}`, { completed: !currentCompleted });
            fetchTasks();
        } catch (error) {
            alert('Failed to update task');
        }
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Remove this asset item?')) return;
        try {
            await api.delete(`/onboarding/tasks/${taskId}`);
            fetchTasks();
        } catch (error) {
            alert('Failed to delete task');
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <form onSubmit={handleAddTask} className="relative">
                    <input
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 font-bold text-xs"
                        placeholder="New item (e.g. ID Card, Laptop)..."
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                    </button>
                </form>
            </div>
            <div className="divide-y divide-slate-50">
                {tasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-3 flex-1">
                            <button onClick={() => toggleTask(task.id, task.completed)} className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}>
                                {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </button>
                            <span className={`text-xs font-bold leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {task.task_name}
                            </span>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                            <Trash2 size={14} />
                        </button>
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
