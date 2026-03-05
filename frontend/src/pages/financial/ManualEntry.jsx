import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import { Fuel, CreditCard, TrendingUp, Clock, LayoutGrid, Calculator, Wallet, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import FuelAllowance from './FuelAllowance';
import LoanInstallments from './LoanInstallments';
import PerformanceAllowance from './PerformanceAllowance';
import AttendanceAllowance from './AttendanceAllowance';
import PermanentSalary from './PermanentSalary';
import SalaryAdvance from './SalaryAdvance';
import MonthlyOverridesSummary from './MonthlyOverridesSummary';

const ManualEntry = () => {
    const [activeTab, setActiveTab] = useState('summary');

    const tabs = [
        { id: 'summary', label: 'Monthly Summary', icon: CheckCircle, color: 'emerald' },
        { id: 'permanent', label: 'Salary Structure', icon: Calculator, color: 'blue' },
        { id: 'fuel', label: 'Fuel Allowance', icon: Fuel, color: 'blue' },
        { id: 'salary_advance', label: 'Salary Advance', icon: Wallet, color: 'emerald' },
        { id: 'loans', label: 'Loan Installments', icon: CreditCard, color: 'emerald' },
        { id: 'performance', label: 'Performance Allowance', icon: TrendingUp, color: 'amber' },
        { id: 'attendance', label: 'Attendance', icon: Clock, color: 'rose' }
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <LayoutGrid className="text-blue-600" size={32} /> Manual Deductions & Allowances
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight mt-2">
                        Manually override and manage specific financial components for the upcoming payroll cycle.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm border ${isActive
                                    ? `bg-${tab.color}-600 text-white border-${tab.color}-600 shadow-xl shadow-${tab.color}-200`
                                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={16} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {activeTab === 'summary' && <MonthlyOverridesSummary />}
                    {activeTab === 'permanent' && <PermanentSalary />}
                    {activeTab === 'fuel' && <FuelAllowance />}
                    {activeTab === 'salary_advance' && <SalaryAdvance />}
                    {activeTab === 'loans' && <LoanInstallments />}
                    {activeTab === 'performance' && <PerformanceAllowance />}
                    {activeTab === 'attendance' && <AttendanceAllowance />}
                </div>
            </div>
        </div>
    );
};

export default ManualEntry;