import { useState, useEffect } from 'react';
import api from '../services/api';
import { Package, CheckCircle2, Circle, Clock, Save, Plus, Trash2 } from 'lucide-react';

const OnboardingTab = ({ employeeId }) => {
    const [checklist, setChecklist] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChecklist();
    }, [employeeId]);

    const fetchChecklist = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/onboarding/checklist/${employeeId}`);
            setChecklist(res.data);
        } catch (error) {
            console.error("Error fetching checklist", error);
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
                type: 'Onboarding'
            });
            setNewTask('');
            fetchChecklist();
        } catch (error) {
            alert('Failed to add task');
        }
    };

    const handleUpdateTask = async (taskId, completed) => {
        try {
            await api.put(`/onboarding/tasks/${taskId}`, { completed });
            fetchChecklist();
        } catch (error) {
            alert('Failed to update task');
        }
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Remove this task?')) return;
        try {
            await api.delete(`/onboarding/tasks/${taskId}`);
            fetchChecklist();
        } catch (error) {
            alert('Failed to delete task');
        }
    };

    const progress = checklist.length > 0
        ? Math.round((checklist.filter(t => t.completed).length / checklist.length) * 100)
        : 0;

    if (loading) return <div className="p-8 text-center text-slate-400 italic">Synchronizing checklist...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Progress */}
            <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest mb-2">Onboarding Progress</h3>
                        <p className="text-blue-200 text-sm font-medium">Tracking integration for new team members</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1 leading-none">Completion Status</p>
                            <p className="text-4xl font-black leading-none">{progress}%</p>
                        </div>
                        <div className="w-24 h-24 relative">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-800" />
                                <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * progress / 100)} className="text-blue-400 transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-black text-xs">
                                {checklist.filter(t => t.completed).length}/{checklist.length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task List */}
                <div className="lg:col-span-2 space-y-4">
                    {checklist.map(task => (
                        <div
                            key={task.id}
                            onClick={() => handleUpdateTask(task.id, !task.completed)}
                            className={`group flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer ${task.completed ? 'bg-emerald-50 border-emerald-100 opacity-75' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-400'}`}>
                                    {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </div>
                                <div>
                                    <p className={`font-black tracking-tight ${task.completed ? 'text-emerald-900 line-through decoration-2' : 'text-slate-900'}`}>{task.task_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modified: {new Date(task.updated_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {checklist.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
                            <Package className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold">No tasks assigned yet.</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6">Issue Task</h4>
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <textarea
                                value={newTask}
                                onChange={e => setNewTask(e.target.value)}
                                placeholder="Task description..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-sm h-32 focus:ring-2 ring-blue-500/20"
                                required
                            />
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                <Plus size={18} /> Add Task
                            </button>
                        </form>
                    </div>

                    <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                        <Clock className="text-blue-400" size={24} />
                        <h4 className="font-black text-blue-900 mb-1">Activity Logged</h4>
                        <p className="text-blue-600/70 text-xs font-medium leading-relaxed">Changes to this checklist are tracked and recorded for transparency.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTab;
