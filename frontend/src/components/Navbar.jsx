import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../services/api';
import Logo from '../assets/logo_base64';
import {
    LayoutDashboard, Users, Calendar, CreditCard, FileText, LogOut,
    Settings, ShieldCheck, ClipboardCheck, UserPlus, UserMinus,
    Clock, Layers, UserCircle, ShieldAlert, Star, Layout,
    ChevronDown, Briefcase, Activity, Shield, Landmark, Cpu, LayoutGrid, Wallet
} from 'lucide-react';

const HubDropdown = ({ label, icon: Icon, items, activePaths }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const dropdownRef = useRef(null);

    const isActive = activePaths.some(path => location.pathname.startsWith(path));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-xl ${isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-transparent'
                    }`}
            >
                <Icon size={18} />
                <span>{label}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-[1.5rem] py-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    </div>
                    {items.filter(item => item.show !== false).map((item, index) => {
                        const ItemIcon = item.icon;
                        const isItemActive = location.pathname === item.to;
                        return (
                            <Link
                                key={index}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all ${isItemActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : 'bg-slate-50 text-slate-400 group-hover:bg-white'}`}>
                                    <ItemIcon size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold leading-none">{item.label}</span>
                                    {item.desc && <span className={`text-[10px] font-medium mt-1 ${isItemActive ? 'text-blue-100' : 'text-slate-400'}`}>{item.desc}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const hubs = [
        {
            label: "Dashboard",
            icon: Cpu,
            paths: ["/", "/profile"],
            items: [
                { to: "/", icon: LayoutDashboard, label: "Overview", desc: "Main summary" },
                { to: "/profile", icon: UserCircle, label: "My Profile", desc: "My account details" }
            ]
        },
        {
            label: "HR",
            icon: Briefcase,
            show: user?.role === 'Admin' || user?.role === 'HR Manager',
            paths: ["/employees", "/performance", "/recruitment", "/resignations"],
            items: [
                { to: "/employees", icon: Users, label: "Staff Directory", desc: "Personnel records" },
                { to: "/performance-manager", icon: Star, label: "Performance", desc: "Reviews and appraisals" },
                { to: "/recruitment", icon: UserPlus, label: "Recruitment", desc: "Hiring pipeline" },
                { to: "/resignations", icon: UserMinus, label: "Offboarding", desc: "Employee transitions" }
            ]
        },
        {
            label: "Operations",
            icon: Activity,
            paths: ["/attendance", "/leaves", "/documents", "/compliance"],
            items: [
                { to: "/attendance", icon: Clock, label: "Attendance", desc: "Real-time records" },
                { to: "/leaves", icon: Calendar, label: "Leaves", desc: "Leave management" },
                { to: "/documents", icon: FileText, label: "Documents", desc: "Document management" },
                { to: "/compliance-manager", icon: ShieldAlert, label: "Compliance", desc: "Policy and audit", show: user?.role === 'Admin' || user?.role === 'HR Manager' }
            ]
        },
        {
            label: "Finance",
            icon: Landmark,
            show: user?.role === 'Admin' || user?.role === 'HR Manager',
            paths: ["/payroll"],
            items: [
                { to: "/payroll", icon: CreditCard, label: "Payroll", desc: "Salary processing" },
                { to: "/welfare-ledger", icon: Wallet, label: "Welfare Ledger", desc: "Fund collections and spending" },
                { to: "/finance/manual-deduction", icon: LayoutGrid, label: "Salary Details", desc: "Salary Components, Fuel, Loans", show: user?.role === 'Admin' || user?.role === 'HR Manager' },
                { to: "/payroll/settings", icon: Settings, label: "Payroll Settings", desc: "Tax and deductions", show: user?.role === 'Admin' || user?.role === 'HR Manager' }
            ]
        },
        {
            label: "System",
            icon: Shield,
            show: user?.role === 'Admin' || user?.role === 'HR Manager',
            paths: ["/org-manager", "/audit-logs", "/security/roles", "/holidays"],
            items: [
                { to: "/org-manager", icon: Layout, label: "Organization", desc: "Company structure" },
                { to: "/audit-logs", icon: ShieldCheck, label: "Audit Logs", desc: "System activities" },
                { to: "/governance", icon: Shield, label: "Approvals", desc: "Approval queue" },
                { to: "/security/roles", icon: ClipboardCheck, label: "Permissions", desc: "Access control" },
                { to: "/holidays", icon: Calendar, label: "Holidays", desc: "Company calendar" }
            ]
        }
    ];

    return (
        <nav className="sticky top-0 z-50 flex flex-col w-full" aria-label="Main Navigation">
            {/* 2. Navigation Bar (Clean & Professional) */}
            <div className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 sticky top-0 px-4 sm:px-6 lg:px-8 py-3">
                <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
                    {/* Brand & Navigation Links (Hubs) */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-3 mr-6 group">
                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <img src={Logo} alt="Logo" className="h-8 w-auto" />
                            </div>
                        </Link>
                        
                        <div className="hidden lg:flex items-center gap-1">
                            {hubs.filter(h => h.show !== false).map((hub, i) => (
                                <HubDropdown
                                    key={i}
                                    label={hub.label}
                                    icon={hub.icon}
                                    items={hub.items}
                                    activePaths={hub.paths}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Mobile Menu Placeholder or Minimal Links */}
                    <div className="lg:hidden flex items-center gap-4">
                        <Link to="/" className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Dashboard</Link>
                    </div>

                    {/* Right Side: Profile & Logout */}
                    <div className="flex items-center gap-5">
                        <div className="hidden sm:flex flex-col items-end border-r border-slate-200 pr-3">
                            <span className="text-[13px] font-bold text-slate-700">
                                {formatName(user?.name)}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mt-0.5">{user?.role}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link to="/profile" className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 hover:border-secondary-400 transition-all hover:scale-105 active:scale-95 group/navav shadow-sm">
                                {user?.profile_picture ? (
                                    <img
                                        src={user.profile_picture.startsWith('http') || user.profile_picture.startsWith('data:') ? user.profile_picture : `${BASE_URL}${user.profile_picture}`}
                                        alt={user.name}
                                        className="w-full h-full object-cover group-hover/navav:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-black uppercase">
                                        {user?.name?.charAt(0)}
                                    </div>
                                )}
                            </Link>

                            <button
                                onClick={logout}
                                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                title="Exit Session"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
