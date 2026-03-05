import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../services/api';
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
                    {items.map((item, index) => {
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
                { to: "/compliance-manager", icon: ShieldAlert, label: "Compliance", desc: "Policy and audit" }
            ]
        },
        {
            label: "Finance",
            icon: Landmark,
            paths: ["/payroll"],
            items: [
                { to: "/payroll", icon: CreditCard, label: "Payroll", desc: "Salary processing" },
                { to: "/welfare-ledger", icon: Wallet, label: "Welfare Ledger", desc: "Fund collections and spending" },
                { to: "/finance/manual-deduction", icon: LayoutGrid, label: "Salary Details", desc: "Salary Components, Fuel, Loans" },
                { to: "/payroll/settings", icon: Settings, label: "Payroll Settings", desc: "Tax and deductions" }
            ]
        },
        {
            label: "System",
            icon: Shield,
            show: user?.role === 'Admin' || user?.role === 'HR Manager',
            paths: ["/org-manager", "/audit-logs", "/security/roles"],
            items: [
                { to: "/org-manager", icon: Layout, label: "Organization", desc: "Company structure" },
                { to: "/audit-logs", icon: ShieldCheck, label: "Audit Logs", desc: "System activities" },
                { to: "/governance", icon: Shield, label: "Approvals", desc: "Approval queue" },
                { to: "/security/roles", icon: ClipboardCheck, label: "Permissions", desc: "Access control" }
            ]
        }
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm" aria-label="Main Navigation">
            <div className="px-4 mx-auto max-w-screen-2xl sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3 font-display font-black text-2xl text-slate-900 tracking-tighter">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-100 ring-2 ring-primary-50 transition-transform hover:rotate-3">
                                <Layers className="text-white" size={20} />
                            </div>
                            <span className="hidden xl:block uppercase">HR Portal</span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-1 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100">
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

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-black text-slate-900 leading-none uppercase tracking-tight">{user?.name}</span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 leading-none">{user?.role}</span>
                            </div>
                        </div>

                        <Link to="/profile" className="h-14 w-14 rounded-[1.25rem] bg-blue-600 overflow-hidden shadow-2xl shadow-blue-100 ring-4 ring-white transition-all hover:scale-110 active:scale-95 group/navav">
                            {user?.profile_picture ? (
                                <img
                                    src={user.profile_picture.startsWith('http') ? user.profile_picture : `${BASE_URL}${user.profile_picture}`}
                                    alt={user.name}
                                    className="w-full h-full object-cover group-hover/navav:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-lg font-black uppercase">
                                    {user?.name?.charAt(0)}
                                </div>
                            )}
                        </Link>

                        <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>

                        <button
                            onClick={logout}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
