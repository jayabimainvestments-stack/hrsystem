import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Users, Calendar, FileText, CheckCircle, CheckCircle2,
    TrendingUp, AlertCircle, Clock, ChevronRight,
    Briefcase, ShieldCheck, UserCircle, CreditCard,
    Camera, Loader2, DollarSign, Award
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AddEmployee from '../components/AddEmployee';
import AnalogClock from '../components/AnalogClock';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const [stats, setStats] = useState({
        employeeCount: 0,
        pendingLeaves: 0,
        attendanceToday: 0,
        latestPayroll: 'N/A',
        attendanceIssues: []
    });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const { data } = await api.post('/auth/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUser({ profile_picture: data.profile_picture });
            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error("Upload failed", error);
            const message = error.response?.data?.message || error.message || "Unknown error";
            alert(`Failed to upload image: ${message}`);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const isAdmin = user.role === 'Admin' || user.role === 'HR Manager';

                // Base requests
                const requests = [
                    api.get('/attendance/my') // For attendance issues widget
                ];

                // Role-based requests
                if (isAdmin) {
                    requests.push(api.get('/employees'));
                    requests.push(api.get('/leaves'));
                    requests.push(api.get(`/attendance?date=${new Date().toISOString().slice(0, 10)}`));
                } else {
                    requests.push(api.get('/leaves/my'));
                }

                // Execute
                const results = await Promise.all(requests.map(p => p.catch(e => ({ error: e }))));

                const myAttendance = results[0].data || [];

                // Process stats based on role
                let empCount = 0;
                let pendingCount = 0;
                let attTodayCount = 0;

                if (isAdmin) {
                    const empRes = results[1];
                    const leaveRes = results[2];
                    const attRes = results[3];

                    if (!empRes.error) empCount = empRes.data.length;
                    if (!leaveRes.error) pendingCount = leaveRes.data.filter(l => l.status === 'Pending').length;
                    if (!attRes.error) attTodayCount = attRes.data.length;
                } else {
                    const myLeavesRes = results[1];
                    // For employee, pending leaves are their own pending requests
                    if (!myLeavesRes.error) pendingCount = myLeavesRes.data.filter(l => l.status === 'Pending').length;
                }

                // Payroll & Financial check
                let latestMonth = 'None';
                let financialPending = 0;
                let myPerfMarks = 0;

                try {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const perfRes = await api.get(`/performance/my/summary/${currentMonth}`);
                    myPerfMarks = perfRes.data.total_marks || 0;
                } catch (e) {
                    console.warn("My performance stats unavailable");
                }

                if (isAdmin) {
                    try {
                        const payrollRes = await api.get('/payroll');
                        if (payrollRes.data.length > 0) {
                            latestMonth = payrollRes.data[0].month;
                        }

                        const finRes = await api.get('/financial/requests');
                        financialPending = finRes.data.filter(r => r.status === 'Pending').length;

                    } catch (e) {
                        console.warn("Payroll/Financial stats unavailable");
                    }
                }

                setStats({
                    employeeCount: empCount,
                    pendingLeaves: pendingCount,
                    attendanceToday: attTodayCount,
                    latestPayroll: latestMonth,
                    pendingFinancial: financialPending,
                    myPerformance: myPerfMarks,
                    attendanceIssues: myAttendance.filter(a => a.status === 'Absent' || a.status === 'Late')
                });

            } catch (error) {
                console.error("Error fetching dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user.role]);

    const statCards = [
        { label: 'Active Staff', value: stats.employeeCount, icon: Users, color: 'green', link: '/employees' },
        { label: 'Current Hub Time', value: currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), icon: Clock, color: 'blue', link: '/attendance' },
        { label: 'Performance Journal', value: `${stats.myPerformance} Pts`, icon: Award, color: 'amber', link: '/my-performance' },
        { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Calendar, color: 'green', link: '/leaves' },
        { label: 'Financial Requests', value: stats.pendingFinancial || 0, icon: DollarSign, color: 'rose', link: '/attendance/manual-deductions' },
        { label: 'Last Payroll', value: stats.latestPayroll, icon: CreditCard, color: 'blue', link: '/payroll' }
    ];

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Welcome Header */}
                <header className="mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-0.5 w-12 bg-primary-500 rounded-full"></div>
                                <h2 className="text-xs font-black tracking-[0.4em] uppercase text-slate-400">
                                    Administrative Hub
                                </h2>
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-none mb-3">
                                Salutations, <span className="text-primary-600 font-black">{user.name?.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>.
                            </h1>
                            <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">
                                Welcome to your central command center. All systems are operational and synchronized.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">System Pulse</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-xl font-black text-slate-800 tabular-nums">{currentTime.toLocaleTimeString('en-GB')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-slate-100">
                        <div className="flex items-center gap-8">
                            <div className="hidden lg:block">
                                <AnalogClock />
                            </div>
                        </div>
                        
                        {(user.role === 'Admin' || user.role === 'HR Manager') && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary group"
                            >
                                <UserCircle size={20} className="group-hover:scale-110 transition-transform" /> 
                                <span className="font-black uppercase tracking-widest text-xs">Add Employee to Registry</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* Attendance Issues Widget (High Priority) */}
                    {stats.attendanceIssues && stats.attendanceIssues.length > 0 && (
                        <div className="col-span-full bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-amber-900">Action Required</h3>
                                    <p className="text-amber-700 font-medium">
                                        You have <span className="font-bold">{stats.attendanceIssues.length} attendance issues</span> (Absent/Late) requiring attention.
                                    </p>
                                </div>
                            </div>
                            <Link to="/leaves" className="px-8 py-4 bg-white text-amber-700 font-black uppercase text-xs tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 transition-colors">
                                Review & Fix Now &rarr;
                            </Link>
                        </div>
                    )}

                    {statCards.map((card, i) => {
                        const Icon = card.icon;
                        const colors = {
                            blue: 'bg-secondary-50 text-secondary-600',
                            green: 'bg-primary-50 text-primary-600',
                            emerald: 'bg-emerald-50 text-emerald-600',
                            amber: 'bg-amber-50 text-amber-600',
                            rose: 'bg-rose-50 text-rose-600'
                        };
                        return (
                            <Link
                                to={card.link}
                                key={i}
                                className="card-premium p-8 hover:shadow-xl hover:-translate-y-1 transition-all group"
                            >
                                 <div className={`w-14 h-14 ${colors[card.color] || colors.blue} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-md shadow-slate-100`}>
                                    <Icon size={24} className="text-white" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{card.label}</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black tracking-tighter tabular-nums text-slate-900">{card.value}</span>
                                    <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-primary-500 group-hover:text-white transition-all transform translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Quick Actions / Activity (Optional) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 card-premium p-10 relative overflow-hidden">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                            <TrendingUp className="text-primary-600" size={24} /> System Overview
                        </h2>
                        <div className="space-y-4 relative">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck size={20} /></div>
                                    <div>
                                        <p className="font-bold">Security Status</p>
                                        <p className="text-xs text-slate-400 font-medium tracking-tight">System protection is active</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black uppercase">Active</span>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary-100 text-primary-600 rounded-xl"><Briefcase size={20} /></div>
                                    <div>
                                        <p className="font-bold">System Modules</p>
                                        <p className="text-xs text-slate-400 font-medium tracking-tight">All HR modules are operational</p>
                                    </div>
                                </div>
                                <span className="bg-primary-500/10 text-primary-600 px-3 py-1 rounded-lg text-xs font-black uppercase">Normal</span>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50 group-hover:bg-primary-100 transition-colors"></div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-slate-400 flex items-center gap-2">
                            <ShieldCheck size={12} className="text-primary-500" /> My Profile
                        </h2>

                        <div className="flex flex-col items-center">
                            <div className="relative mb-6 group/avatar cursor-pointer" onClick={handleUploadClick} title="Update Profile Picture">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-primary-600 overflow-hidden shadow-2xl shadow-primary-100 ring-4 ring-white group-hover/avatar:scale-105 transition-all duration-500 relative">
                                    {uploading && (
                                        <div className="absolute inset-0 bg-primary-900/60 backdrop-blur-md z-[20] flex items-center justify-center">
                                            <Loader2 size={32} className="text-white animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-primary-900/0 group-hover/avatar:bg-primary-900/40 transition-all z-[10] flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100">
                                        <Camera size={32} className="text-white mb-2 transform scale-75 group-hover/avatar:scale-100 transition-transform" />
                                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">Modify Photo</span>
                                    </div>
                                     {user.profile_picture ? (
                                        <img
                                            src={user.profile_picture.startsWith('http') ? user.profile_picture : `${BASE_URL}${user.profile_picture}`}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black">
                                            {user.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-xl border-4 border-white flex items-center justify-center shadow-lg pointer-events-none z-[15]">
                                    <CheckCircle2 size={14} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <button
                                onClick={handleUploadClick}
                                className="text-[10px] font-black text-slate-400 hover:text-primary-600 transition-colors uppercase tracking-widest mb-4 flex items-center gap-1"
                            >
                                <Camera size={10} /> {user.profile_picture ? 'Change Photo' : 'Upload Photo'}
                            </button>

                            <div className="text-center mb-10">
                                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                                    {user.name?.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </h3>
                                <div className="flex items-center gap-2 justify-center mt-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {user.role} Authority
                                    </span>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                <Link to="/profile" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-primary-600 hover:text-white transition-all group/btn">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-xl group-hover/btn:bg-white/20 group-hover/btn:text-white transition-colors"><UserCircle size={18} /></div>
                                        <span className="font-bold text-sm tracking-tight">View Profile</span>
                                    </div>
                                    <ChevronRight size={16} className="opacity-20 group-hover/btn:opacity-100 transition-all" />
                                </Link>
                                <Link to="/attendance" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all group/btn">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl group-hover/btn:bg-white/20 group-hover/btn:text-white transition-colors"><Clock size={18} /></div>
                                        <span className="font-bold text-sm tracking-tight">Attendance Log</span>
                                    </div>
                                    <ChevronRight size={16} className="opacity-20 group-hover/btn:opacity-100 transition-all" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main >

            {showAddModal && (
                <AddEmployee
                    onClose={() => setShowAddModal(false)}
                    onEmployeeAdded={() => window.location.reload()}
                />
            )}
        </div >
    );
};

export default Dashboard;
