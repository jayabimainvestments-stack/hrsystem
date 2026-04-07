import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Clock, CheckCircle2, XCircle, Plus, Info, ChevronRight, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const LeaveManagement = () => {
    const [leaves, setLeaves] = useState([]);
    const [balances, setBalances] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [policy, setPolicy] = useState(null);
    const [leaveForm, setLeaveForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '', short_leave_hours: 0, start_time: '', end_time: '' });
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Draggable Modal State
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e) => {
        // Only drag from header, ignore if clicking buttons
        if (e.target.closest('button')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Always fetch Leave Types and Policy (Core for form)
            try {
                const [typesRes, policyRes] = await Promise.all([
                    api.get('/leaves/types'),
                    api.get('/attendance/policy')
                ]);
                setLeaveTypes(typesRes.data || []);
                setPolicy(policyRes.data || null);
                if (typesRes.data?.[0]) {
                    setLeaveForm(prev => ({ ...prev, leave_type_id: typesRes.data[0].id }));
                }
            } catch (err) {
                console.error("Error fetching rules/policy", err);
            }

            // 2. Fetch Leaves & Balances (Permission sensitive)
            const isAdmin = user.role === 'Admin' || user.role === 'HR Manager';
            try {
                const requests = [
                    api.get(isAdmin ? '/leaves' : '/leaves/my'),
                    api.get('/leaves/balances'),
                    api.get('/attendance/my')
                ];

                const [leavesRes, balancesRes, attRes] = await Promise.all(requests);

                setLeaves(leavesRes.data || []);
                setBalances(balancesRes.data || []);
                setAttendance(attRes.data || []);
            } catch (err) {
                console.error("Error fetching history", err);
            }

        } catch (error) {
            console.error("Critical error in fetchData", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leaves', leaveForm);
            alert('Leave request submitted successfully');
            setLeaveForm({ leave_type_id: leaveTypes[0]?.id || '', start_date: '', end_date: '', reason: '' });
            setShowForm(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleRequestForDate = (date, type) => {
        // Find appropriate leave type if possible, else default
        // For 'Absent' -> Casual or Annual? User said "Annual is planned". 
        // So maybe default to Casual (id 11) or just first available.
        // Let's just use the first available one (usually Annual, but user can change) 
        // OR if we know Casual ID, select it.
        // For 'Late' -> Short Leave (id ?? - we need to look it up)

        let targetTypeId = leaveTypes[0]?.id;

        if (type === 'Late') {
            const shortLeave = leaveTypes.find(t => t.name.toLowerCase().includes('short'));
            if (shortLeave) targetTypeId = shortLeave.id;
        } else {
            const casualLeave = leaveTypes.find(t => t.name.toLowerCase().includes('casual'));
            if (casualLeave) targetTypeId = casualLeave.id;
        }

        setLeaveForm({
            leave_type_id: targetTypeId || '',
            start_date: date,
            end_date: date,
            reason: type === 'Late' ? 'Late arrival coverage' : 'Covering unexpected absence',
            short_leave_hours: 0,
            start_time: '',
            end_time: ''
        });
        setShowForm(true);
        setPosition({ x: 0, y: 0 }); // Reset position on open
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.put(`/leaves/${id}`, { status });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update leave status');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLeaveForm(prev => ({ ...prev, [name]: value }));
    };

    const calculateRequestedDays = () => {
        const selectedType = leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase();
        if (selectedType === 'HALF DAY') return 0.5;
        if (selectedType === 'SHORT LEAVE') return 0;

        if (!leaveForm.start_date || !leaveForm.end_date) return 0;
        const start = new Date(leaveForm.start_date);
        const end = new Date(leaveForm.end_date);
        if (end < start) return 0;
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const requestedDays = calculateRequestedDays();
    const selectedBalance = balances.find(b => b.leave_type_id === parseInt(leaveForm.leave_type_id));

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    const isAdmin = user.role === 'Admin' || user.role === 'HR Manager';

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 uppercase">
                            <Calendar className="text-primary-600" size={24} /> Leave Management
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">Manage leave requests and history</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            setPosition({ x: 0, y: 0 });
                        }}
                        className="btn-primary"
                    >
                        <Plus size={16} /> Request Leave
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="card-premium p-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Requests</p>
                        <p className="text-4xl font-black tabular-nums">{leaves.length}</p>
                    </div>
                    {balances.map(b => (
                        <div key={b.id} className="card-premium p-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{b.leave_type_name} Remaining</p>
                            <p className={`text-4xl font-black tabular-nums ${parseFloat(b.remaining_days) <= 2 ? 'text-red-500' : 'text-primary-600'}`}>
                                {b.remaining_days}
                            </p>
                        </div>
                    ))}
                    {/* Policy-based limits for Short Leave / Half Day */}
                    {policy && (
                        <>
                            <div className="card-premium p-8 border-l-4 border-l-amber-400">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Short Leave Limit</p>
                                <p className="text-4xl font-black tabular-nums">{policy.short_leave_monthly_limit} <span className="text-sm text-slate-400">/ mo</span></p>
                            </div>
                            <div className="card-premium p-8 border-l-4 border-l-primary-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Half Day Limit</p>
                                <p className="text-4xl font-black tabular-nums">{policy.half_day_yearly_limit} <span className="text-sm text-slate-400">/ yr</span></p>
                            </div>
                        </>
                    )}
                </div>

                {/* Attendance Anomalies Section */}
                {attendance.some(a => {
                    if (a.status === 'Absent' || a.status === 'Late') return true;
                    if (a.status === 'Incomplete') {
                        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
                        const attDateStr = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
                        return attDateStr < todayStr;
                    }
                    return false;
                }) && (
                    <div className="mb-10">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                            <Clock className="text-amber-500" size={20} /> Recent Absences / Late Arrivals
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attendance.filter(a => {
                                if (a.status === 'Absent' || a.status === 'Late') return true;
                                if (a.status === 'Incomplete') {
                                    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
                                    const attDateStr = new Date(a.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
                                    return attDateStr < todayStr;
                                }
                                return false;
                            }).map(record => (
                                <div key={record.id} className={`p-6 rounded-[2rem] border flex items-center justify-between ${record.status === 'Absent' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                                    }`}>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${record.status === 'Absent' ? 'text-red-500' : 'text-amber-600'
                                            }`}>{record.status}</p>
                                        <p className="text-lg font-bold text-slate-900">{new Date(record.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {record.status === 'Late' ? `${record.late_minutes}m Late` : record.status === 'Incomplete' ? 'Incomplete Attendance' : 'Recorded as Absent'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const d = new Date(record.date);
                                            const localDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                            handleRequestForDate(localDate, record.status);
                                        }}
                                        className="px-4 py-2 bg-white rounded-xl shadow-sm text-xs font-black uppercase tracking-widest hover:shadow-md transition-all text-slate-700"
                                    >
                                        Fix
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="card-premium overflow-hidden mb-10">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Details</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested On</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Breakdown</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved By</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leaves.map(leave => (
                                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-xs">{(leave.name || leave.employee_name || 'U').charAt(0)}</div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 leading-tight">{leave.name || leave.employee_name || 'Unknown Staff'}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">{leave.email || 'No email registered'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black tabular-nums">{new Date(leave.created_at).toLocaleDateString()}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter tabular-nums">{new Date(leave.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">{leave.leave_type || leave.type}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-black tracking-tight tabular-nums">
                                                {new Date(leave.start_date).toLocaleDateString()}
                                                <span className="text-slate-300 mx-2">→</span>
                                                {new Date(leave.end_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1 tabular-nums">
                                                {leave.leave_type === 'Short Leave' ? (
                                                    <span className="text-[10px] font-bold text-amber-600">{leave.short_leave_hours} Hours</span>
                                                ) : leave.leave_type === 'Half Day' ? (
                                                    <span className="text-[10px] font-bold text-primary-600">0.5 Day</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-emerald-600">{leave.paid_days} Paid</span>
                                                )}
                                                {parseFloat(leave.unpaid_days) > 0 && (
                                                    <span className="text-[10px] font-bold text-red-500">{leave.unpaid_days} Unpaid (NOPAY)</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className={`w-fit px-3 py-1 rounded-[10px] text-[10px] font-black uppercase tracking-widest ${leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    leave.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                                                        'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {leave.status}
                                                </span>
                                                {leave.status === 'Pending' && leave.user_id === user.id && (
                                                    <span className="text-[10px] font-bold text-slate-400 italic">This leave must be approved by another HR manager.</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                {leave.approved_by_name ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-[10px]">
                                                            {leave.approved_by_name.charAt(0)}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600">{leave.approved_by_name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400 italic">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {isAdmin && leave.status === 'Pending' && (
                                                <button
                                                    onClick={() => window.location.href = '/governance'}
                                                    className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-primary-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 active:scale-95"
                                                >
                                                    Process <ChevronRight size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leaves.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center text-slate-400 italic">No leave requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-10 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-14 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-80 h-80 bg-primary-600 rounded-full blur-3xl opacity-20 -mr-40 -mb-40"></div>
                    <div className="flex-1 relative z-10">
                        <h3 className="text-2xl font-black mb-4 uppercase tracking-widest leading-none">Automated Payroll Impact</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">Leaves marked as 'Approved' are automatically synchronized with the upcoming payroll calculation. Unpaid leaves will trigger deductions based on the employee's base salary configuration.</p>
                    </div>
                    <div className="bg-white/10 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm relative z-10 w-full md:w-auto text-center min-w-[240px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Policy Compliance</p>
                        <p className="text-emerald-400 font-black flex items-center justify-center gap-2 tracking-tight">
                            <CheckCircle2 size={14} /> 100% Verified Logic
                        </p>
                    </div>
                </div>
            </main>

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px)`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                        }}
                        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 relative"
                    >
                        <div
                            onMouseDown={handleMouseDown}
                            className="p-8 bg-primary-600 text-white flex justify-between items-center cursor-move active:cursor-grabbing"
                        >
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-widest mb-1">Request Leave</h2>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Leave request management</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><XCircle size={18} /></button>
                        </div>
                        <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleApply} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Type</label>
                                    </div>
                                    <select
                                        name="leave_type_id"
                                        value={leaveForm.leave_type_id}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 ring-blue-500/20 transition-all"
                                        required
                                    >
                                        <option value="">-- Choose Leave Type --</option>
                                        {leaveTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>

                                    {/* Balance Insight Boxes */}
                                    {leaveForm.leave_type_id && (
                                        <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Allocated</p>
                                                <p className="text-xl font-black text-slate-900 tabular-nums">{selectedBalance?.allocated_days || 0} <span className="text-[10px] text-slate-400 uppercase">Days</span></p>
                                            </div>
                                            <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-primary-400 mb-1">Available</p>
                                                <p className="text-xl font-black text-primary-600 tabular-nums">{selectedBalance?.remaining_days || 0} <span className="text-[10px] text-primary-400 uppercase">Days</span></p>
                                            </div>
                                        </div>
                                    )}
                                    {leaveForm.leave_type_id && leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase() === 'SHORT LEAVE' && (
                                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 mt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-amber-700 uppercase">Short Leave Limit</span>
                                                <span className="text-xs font-black text-amber-900">{policy?.short_leave_monthly_limit || 2} Per Month</span>
                                            </div>
                                        </div>
                                    )}
                                    {leaveForm.leave_type_id && leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase() === 'ANNUAL LEAVE' && (
                                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 mt-2">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className="text-blue-600" />
                                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Must be requested 1 day in advance</span>
                                            </div>
                                        </div>
                                    )}
                                    {leaveForm.leave_type_id && leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase() === 'HALF DAY' && (
                                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 mt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-blue-700 uppercase">Half Day Limit</span>
                                                <span className="text-xs font-black text-blue-900">{policy?.half_day_yearly_limit || 4} Per Year</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={leaveForm.start_date}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={leaveForm.end_date}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Request Duration Insight */}
                                {requestedDays > 0 && (
                                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                                                <Calendar size={16} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Leave Period</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-emerald-600 tracking-tight tabular-nums">{requestedDays.toFixed(1)} Days</p>
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Net Duration</p>
                                        </div>
                                    </div>
                                )}

                                {(leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase() === 'SHORT LEAVE' ||
                                    leaveTypes.find(t => t.id === parseInt(leaveForm.leave_type_id))?.name.trim().toUpperCase() === 'HALF DAY') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <Clock size={12} className="text-blue-400" /> Start Time
                                                </label>
                                                <input
                                                    name="start_time"
                                                    type="time"
                                                    value={leaveForm.start_time}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-blue-500/5 focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <Clock size={12} className="text-blue-400" /> End Time
                                                </label>
                                                <input
                                                    name="end_time"
                                                    type="time"
                                                    value={leaveForm.end_time}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none ring-2 ring-blue-500/5 focus:ring-blue-500/20"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason & Context</label>
                                    <textarea
                                        name="reason"
                                        value={leaveForm.reason}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-5 py-4 font-bold h-32 outline-none focus:ring-2 ring-blue-500/20"
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl shadow-xl shadow-primary-100 font-black uppercase text-xs tracking-widest hover:bg-primary-700 transition-all active:scale-95">Submit for Approval</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveManagement;
