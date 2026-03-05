import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    TrendingUp, Calendar, Target, Award, CheckCircle,
    ChevronDown, ChevronUp, AlertCircle, HelpCircle,
    ArrowLeft, DollarSign, Briefcase
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const PerformanceSummary = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedWeeks, setExpandedWeeks] = useState({});

    useEffect(() => {
        fetchPerformanceSummary();
    }, [selectedMonth]);

    const fetchPerformanceSummary = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await api.get(`/performance/my/summary/${selectedMonth}`);
            setSummary(data);
        } catch (err) {
            console.error("Error fetching performance summary", err);
            setError(err.response?.data?.message || "Failed to load performance data");
        } finally {
            setLoading(false);
        }
    };

    const toggleWeek = (weekStarting) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekStarting]: !prev[weekStarting]
        }));
    };

    if (loading && !summary) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="flex-1">
                        <Link to="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors mb-4 group w-fit">
                            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl font-black tracking-tight leading-tight uppercase">
                            Performance Journal
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Track your weekly performance metrics and estimated payouts.
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-primary-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Period</span>
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 font-black text-xs outline-none focus:border-primary-500 transition-all text-slate-800"
                        />
                    </div>
                </header>

                {error ? (
                    <div className="bg-white rounded-[3rem] p-20 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500">
                            <AlertCircle size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase">Data Not Available</h3>
                            <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">{error}</p>
                        </div>
                        <button
                            onClick={fetchPerformanceSummary}
                            className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors"
                        >
                            Retry Loading
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card-premium p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50 group-hover:bg-primary-100 transition-colors"></div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-primary-100/50 text-primary-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <Award size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Mark</p>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter tabular-nums">{summary?.total_marks || 0}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points earned</span>
                                </div>
                            </div>

                            <div className="card-premium p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50 group-hover:bg-emerald-100 transition-colors"></div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-emerald-100/50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <DollarSign size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Allowance</p>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter tabular-nums text-emerald-600">{(summary?.total_amount || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600/50">LKR</span>
                                </div>
                            </div>

                            <div className="card-premium p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50 group-hover:bg-amber-100 transition-colors"></div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-amber-100/50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <TrendingUp size={24} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Point Valuation</p>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter tabular-nums">{summary?.point_value || 0}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LKR per point</span>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Breakdown Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase flex items-center gap-3">
                                <Target className="text-primary-600" size={24} /> Weekly Progress
                            </h2>

                            <div className="space-y-4">
                                {summary?.weekly_breakdown?.map((week, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-500"
                                    >
                                        <button
                                            onClick={() => toggleWeek(week.week_starting)}
                                            className="w-full px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${week.status === 'Processed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                                        {new Date(week.week_starting).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(week.week_ending).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">
                                                        Week {summary.weekly_breakdown.length - idx} Summary
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-center md:text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Week Points</p>
                                                    <p className={`font-black text-xl ${week.total_marks > 0 ? 'text-primary-600' : 'text-slate-300'}`}>
                                                        {week.total_marks} Pts
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${week.status === 'Processed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                        {week.status}
                                                    </span>
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                        {expandedWeeks[week.week_starting] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {expandedWeeks[week.week_starting] && (
                                            <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                                                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-slate-200">
                                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Performance Metric</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center">Measured Value</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Points Earned</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {week.metrics.map((m, midx) => (
                                                                <tr key={midx} className="hover:bg-white/50 transition-colors">
                                                                    <td className="px-6 py-5">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                                                            <span className="font-bold text-sm text-slate-700">{m.metric_name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-5 text-center">
                                                                        <span className="font-black text-xs tabular-nums bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                                                                            {m.value}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-5 text-right">
                                                                        <span className={`font-black text-sm ${m.mark > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                            +{m.mark}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {(!summary?.weekly_breakdown || summary.weekly_breakdown.length === 0) && (
                                    <div className="p-16 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                                            <AlertCircle size={32} />
                                        </div>
                                        <p className="text-slate-400 font-bold italic">No weekly records found for this period.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Professional Note */}
                        <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden text-white/80">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="w-16 h-16 bg-white/5 backdrop-blur-3xl rounded-[1.5rem] border border-white/10 flex items-center justify-center text-primary-400">
                                    <HelpCircle size={32} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-black uppercase tracking-tight text-lg mb-2">How are points calculated?</h4>
                                    <p className="text-xs font-medium leading-relaxed max-w-2xl">
                                        Each point is valued at <span className="text-white font-bold">LKR {summary?.point_value || 1000}</span>. Your weekly measurements are matched against individualized performance targets set by your department manager. Points shown here are estimates until the final payroll approval.
                                    </p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-2xl px-8 py-6 rounded-[2rem] border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Briefcase size={16} className="text-primary-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">HR Governance</span>
                                    </div>
                                    <p className="text-[10px] font-bold mt-2 text-white/40">Real-time tracking system active.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PerformanceSummary;
