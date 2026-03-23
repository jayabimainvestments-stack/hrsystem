import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Users, Calendar, FileText, CheckCircle, CheckCircle2,
    TrendingUp, AlertCircle, Clock, ChevronRight,
    Briefcase, ShieldCheck, UserCircle, CreditCard,
    Camera, Loader2, DollarSign, Award, Activity
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AddEmployee from '../components/AddEmployee';
import AnalogClock from '../components/AnalogClock';
import { Link } from 'react-router-dom';

const formatName = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    
    const initials = parts.slice(0, -1)
        .map(p => p.charAt(0).toUpperCase() + '.')
        .join(' ');
    const lastName = parts[parts.length - 1];
    const titledLast = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
    
    return `${initials} ${titledLast}`;
};

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

    const isAdmin = user.role === 'Admin' || user.role === 'HR Manager';
    const statCards = [
        { label: 'Active Staff', value: stats.employeeCount, icon: Users, color: 'green', link: '/employees', show: isAdmin },
        { label: 'Current Hub Time', value: currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), icon: Clock, color: 'blue', link: '/attendance' },
        { label: 'Performance Journal', value: `${stats.myPerformance} Pts`, icon: Award, color: 'amber', link: '/my-performance' },
        { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Calendar, color: 'green', link: '/leaves' },
        { label: 'Financial Requests', value: stats.pendingFinancial || 0, icon: DollarSign, color: 'rose', link: '/attendance/manual-deductions', show: isAdmin },
        { label: 'Last Payroll', value: stats.latestPayroll, icon: CreditCard, color: 'blue', link: '/payroll' }
    ];

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {/* Compact Welcome Header */}
                <header className="mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group">
                        {/* Decorative Accent */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:bg-primary-100 transition-colors"></div>
                        
                        <div className="flex-1 z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-0.5 w-8 bg-primary-500 rounded-full"></div>
                                <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">
                                    Administrative Hub
                                </h2>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
                                Salutations, <span className="text-primary-600 font-black">{formatName(user.name)}</span>.
                            </h1>
                            <p className="text-slate-500 text-sm font-medium max-w-xl leading-relaxed">
                                Welcome to your central command center. All systems operational.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-6 z-10 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">System Pulse</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-lg font-black text-slate-800 tabular-nums">{currentTime.toLocaleTimeString('en-GB')}</span>
                                </div>
                            </div>
                            <AnalogClock />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center gap-2">
                                <Activity size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">All Modules Active</span>
                            </div>
                        </div>
                        
                        {(user.role === 'Admin' || user.role === 'HR Manager') && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary-compact group"
                            >
                                <UserCircle size={16} className="group-hover:scale-110 transition-transform" /> 
                                <span className="font-black uppercase tracking-widest text-[10px]">Add to Registry</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Attendance Issues Widget (High Priority) - Compact version */}
                    {stats.attendanceIssues && stats.attendanceIssues.length > 0 && (
                        <div className="col-span-full bg-amber-50/50 backdrop-blur-sm p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-amber-900 leading-tight">Action Required</h3>
                                    <p className="text-xs text-amber-700 font-medium">
                                        <span className="font-bold">{stats.attendanceIssues.length} issues</span> needing attention.
                                    </p>
                                </div>
                            </div>
                            <Link to="/leaves" className="px-4 py-2 bg-white text-amber-700 font-black uppercase text-[9px] tracking-widest rounded-xl shadow-sm hover:bg-amber-100 transition-colors">
                                Review &rarr;
                            </Link>
                        </div>
                    )}

                    {statCards.filter(card => card.show !== false).map((card, i) => {
                        const Icon = card.icon;
                        const colors = {
                            blue: 'from-blue-500 to-blue-600 shadow-blue-100',
                            green: 'from-emerald-500 to-emerald-600 shadow-emerald-100',
                            emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-100',
                            amber: 'from-amber-500 to-amber-600 shadow-amber-100',
                            rose: 'from-rose-500 to-rose-600 shadow-rose-100'
                        };
                        return (
                            <Link
                                to={card.link}
                                key={i}
                                className="bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group relative overflow-hidden"
                            >
                                 <div className={`w-10 h-10 bg-gradient-to-br ${colors[card.color] || colors.blue} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-lg`}>
                                    <Icon size={18} className="text-white" />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-xl font-black tracking-tighter tabular-nums text-slate-900">{card.value}</span>
                                    <ChevronRight size={14} className="text-slate-300 transform group-hover:translate-x-1 group-hover:text-primary-500 transition-all" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                        <h2 className="text-base font-black mb-4 flex items-center gap-2">
                            <TrendingUp className="text-primary-600" size={18} /> System Pulse
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ShieldCheck size={16} /></div>
                                    <div>
                                        <p className="text-xs font-bold">Security</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Protection Active</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Active</span>
                            </div>
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg"><Briefcase size={16} /></div>
                                    <div>
                                        <p className="text-xs font-bold">Modules</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Core Functional</p>
                                    </div>
                                </div>
                                <span className="bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Normal</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4 group/avatar cursor-pointer" onClick={handleUploadClick}>
                                <div className="w-20 h-20 rounded-2xl bg-primary-600 overflow-hidden shadow-xl ring-4 ring-slate-50 group-hover/avatar:scale-105 transition-all duration-500 relative">
                                    {uploading && (
                                        <div className="absolute inset-0 bg-primary-900/60 backdrop-blur-md z-[20] flex items-center justify-center">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-primary-900/0 group-hover/avatar:bg-primary-900/40 transition-all z-[10] flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100">
                                        <Camera size={24} className="text-white transform scale-75 group-hover/avatar:scale-100 transition-transform" />
                                    </div>
                                     {user.profile_picture ? (
                                        <img
                                            src={user.profile_picture.startsWith('http') ? user.profile_picture : `${BASE_URL}${user.profile_picture}`}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">
                                            {user.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-white flex items-center justify-center shadow-lg z-[15]">
                                    <CheckCircle2 size={10} className="text-white" />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="text-base font-bold tracking-tight text-slate-800">
                                    {formatName(user.name)}
                                </h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    {user.role} Authority
                                </p>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2">
                                <Link to="/profile" className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-primary-600 hover:text-white transition-all group/btn">
                                    <UserCircle size={18} className="mb-1" />
                                    <span className="font-bold text-[9px] uppercase tracking-tighter">Profile</span>
                                </Link>
                                <Link to="/attendance" className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-emerald-600 hover:text-white transition-all group/btn">
                                    <Clock size={18} className="mb-1" />
                                    <span className="font-bold text-[9px] uppercase tracking-tighter">Logs</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

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
