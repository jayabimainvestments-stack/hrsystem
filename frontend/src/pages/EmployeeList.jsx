import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
    Search, UserPlus, FileText, ChevronRight, Filter, Building2, 
    Briefcase, Mail, Plus, UserX, Clock, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AddEmployee from '../components/AddEmployee';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [desigFilter, setDesigFilter] = useState('');
    const [contractFilter, setContractFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // '' = all, 'Active', 'Resigned'
    const [showAddModal, setShowAddModal] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [empRes, deptRes, desigRes] = await Promise.all([
                    api.get('/employees'),
                    api.get('/meta/departments'),
                    api.get('/meta/designations')
                ]);
                setEmployees(empRes.data);
                setDepartments(deptRes.data);
                setDesignations(desigRes.data);
            } catch (error) {
                console.error("Error fetching employee data", error);
                setError(`Failed to load data. ${error.response?.data?.message || error.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (emp.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (emp.emp_code ? String(emp.emp_code).toLowerCase().includes(search.toLowerCase()) : false);

        const matchesDept = !deptFilter ||
            (emp.department && emp.department.trim().toLowerCase() === deptFilter.trim().toLowerCase());

        const matchesDesig = !desigFilter ||
            (emp.designation && emp.designation.trim().toLowerCase() === desigFilter.trim().toLowerCase());

        const isExited = emp.employment_status === 'Resigned' || emp.employment_status === 'Terminated' || emp.employment_status === 'Inactive';

        const matchesStatus = !statusFilter ||
            (statusFilter === 'Active' ? !isExited : isExited);

        const matchesContract = !contractFilter ||
            (contractFilter === 'Probation' ? (emp.contract_type === 'Probation') :
             contractFilter === 'Permanent' ? (emp.contract_type === 'Permanent' || !emp.contract_type) :
             (emp.contract_type === contractFilter));

        return matchesSearch && matchesDept && matchesDesig && matchesStatus && matchesContract;
    });

    const activeCount = employees.filter(e => !(e.employment_status === 'Resigned' || e.employment_status === 'Terminated' || e.employment_status === 'Inactive')).length;
    const exitedCount = employees.filter(e => e.employment_status === 'Resigned' || e.employment_status === 'Terminated' || e.employment_status === 'Inactive').length;

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="py-10 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Staff Directory</h1>
                        <p className="text-slate-500 font-medium">View and manage all members of the team</p>
                    </div>
                    {user?.role === 'Admin' && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary"
                        >
                            <UserPlus size={20} /> Add New Employee
                        </button>
                    )}
                </div>

                <div className="card-premium overflow-hidden mb-8">
                    {/* Status Tabs */}
                    <div className="flex border-b border-slate-200/80 px-6 pt-3 bg-slate-50/70 gap-2 overflow-x-auto">
                        <button
                            onClick={() => setStatusFilter('')}
                            className={`px-5 py-3 font-black text-xs uppercase tracking-wider rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                statusFilter === ''
                                    ? 'border-primary-600 text-primary-600 bg-white shadow-sm'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            All Personnel
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-black">
                                {employees.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Active')}
                            className={`px-5 py-3 font-black text-xs uppercase tracking-wider rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                statusFilter === 'Active'
                                    ? 'border-emerald-600 text-emerald-600 bg-white shadow-sm'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Active Staff
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-black">
                                {activeCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Resigned')}
                            className={`px-5 py-3 font-black text-xs uppercase tracking-wider rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                statusFilter === 'Resigned'
                                    ? 'border-rose-600 text-rose-600 bg-white shadow-sm'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <UserX size={14} className="text-rose-500" />
                            Resigned / Exited
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-black">
                                {exitedCount}
                            </span>
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-4 bg-white border-b border-slate-100">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-16 pr-6 py-3.5 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 transition-all shadow-sm"
                                placeholder="Search by name, email or code..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 shadow-sm min-w-[170px]"
                                value={deptFilter}
                                onChange={e => { setDeptFilter(e.target.value); setDesigFilter(''); }}
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                            <select
                                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 shadow-sm min-w-[170px]"
                                value={desigFilter}
                                onChange={e => setDesigFilter(e.target.value)}
                            >
                                <option value="">All Designations</option>
                                {designations
                                    .filter(d => !deptFilter ||
                                        (d.department_name && d.department_name.trim().toLowerCase() === deptFilter.trim().toLowerCase()))
                                    .map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
                            </select>
                            <select
                                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 shadow-sm min-w-[150px]"
                                value={contractFilter}
                                onChange={e => setContractFilter(e.target.value)}
                            >
                                <option value="">All Contracts</option>
                                <option value="Probation">Probation (පරිවාස)</option>
                                <option value="Permanent">Permanent (ස්ථිර)</option>
                                <option value="Contract">Contract (ගිවිසුම්)</option>
                                <option value="Trainee">Trainee (පුහුණු)</option>
                            </select>
                        </div>
                    </div>

                    {/* Employee Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50 text-center">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Access</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Profiles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                                {filteredEmployees.map((emp) => {
                                    const isExited = emp.employment_status === 'Resigned' || emp.employment_status === 'Terminated' || emp.employment_status === 'Inactive';
                                    const isProbation = !isExited && emp.contract_type === 'Probation';

                                    return (
                                        <tr 
                                            key={emp.id} 
                                            className={`transition-all group ${
                                                isExited 
                                                    ? 'bg-rose-50/30 hover:bg-rose-50/60 border-l-4 border-l-rose-500' 
                                                    : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                                            }`}
                                        >
                                            {/* Employee Identity */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform overflow-hidden shrink-0 ${
                                                        isExited 
                                                            ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                                                            : 'bg-primary-600 text-white shadow-primary-100 group-hover:rotate-3'
                                                    }`}>
                                                        {emp.profile_picture ? (
                                                            <img
                                                                src={emp.profile_picture.startsWith('http') || emp.profile_picture.startsWith('data:') ? emp.profile_picture : `${BASE_URL}${emp.profile_picture}`}
                                                                alt={emp.name}
                                                                className={`w-full h-full object-cover ${isExited ? 'grayscale opacity-75' : ''}`}
                                                            />
                                                        ) : isExited ? (
                                                            <UserX size={20} className="text-rose-600" />
                                                        ) : (
                                                            (emp.name || 'E').charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className={`font-black tracking-tight uppercase ${
                                                                isExited 
                                                                    ? 'text-slate-500 line-through decoration-rose-400 decoration-2' 
                                                                    : 'text-slate-800 group-hover:text-primary-600 transition-colors'
                                                            }`}>
                                                                {emp.name}
                                                            </p>
                                                            {isExited && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300 shadow-sm animate-pulse">
                                                                    <UserX size={11} /> {emp.employment_status || 'RESIGNED'} (ඉවත් වූ)
                                                                </span>
                                                            )}
                                                            {isProbation && (
                                                                (() => {
                                                                    if (!emp.probation_end_date) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                                                                <Clock size={10} /> PROBATION
                                                                            </span>
                                                                        );
                                                                    }
                                                                    const diff = Math.ceil((new Date(emp.probation_end_date) - new Date()) / (1000 * 60 * 60 * 24));
                                                                    if (diff < 0) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                                                                                ⚠️ DUE ({Math.abs(diff)}d AGO)
                                                                            </span>
                                                                        );
                                                                    } else if (diff <= 30) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                                                                ⏳ DUE IN {diff}d
                                                                            </span>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                                                <Clock size={10} /> PROBATION
                                                                            </span>
                                                                        );
                                                                    }
                                                                })()
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 tabular-nums">
                                                            #{emp.emp_code} {isExited ? '• EXITED PROFILE' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-8 py-6">
                                                <div className={`flex items-center gap-2 text-sm ${isExited ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    <Mail size={14} className="text-slate-300" />
                                                    <span className={isExited ? 'line-through decoration-slate-300' : ''}>{emp.email}</span>
                                                </div>
                                            </td>

                                            {/* Organization */}
                                            <td className="px-8 py-6">
                                                <div className={`space-y-1 ${isExited ? 'opacity-70' : ''}`}>
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <Building2 size={12} className={isExited ? 'text-slate-400' : 'text-primary-400'} />
                                                        <span>{emp.department || 'Not Assigned'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <Briefcase size={12} className={isExited ? 'text-slate-400' : 'text-emerald-400'} />
                                                        <span>{emp.designation || 'Former Staff'}</span>
                                                    </div>
                                                    {isExited && (
                                                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-slate-200/80 text-slate-600">
                                                            Login Deactivated
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Access / Status */}
                                            <td className="px-8 py-6 text-center">
                                                {isExited ? (
                                                    <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 border border-rose-200">
                                                        EXITED
                                                    </span>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                        emp.role === 'Admin' ? 'bg-red-50 text-red-600' :
                                                        emp.role === 'HR Manager' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-emerald-50 text-emerald-600'
                                                    }`}>
                                                        {emp.role}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Profile Link */}
                                            <td className="px-8 py-6 text-right">
                                                <Link
                                                    to={`/employees/${emp.id}`}
                                                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                                                        isExited 
                                                            ? 'bg-slate-200 text-slate-700 hover:bg-rose-600 hover:text-white' 
                                                            : 'bg-slate-900 text-white hover:bg-primary-600 shadow-slate-100'
                                                    }`}
                                                >
                                                    {isExited ? 'Exit File' : 'Profile'} <ChevronRight size={12} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center text-slate-400 italic">No personnel match your search criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddEmployee
                    onClose={() => setShowAddModal(false)}
                    onEmployeeAdded={() => window.location.reload()}
                />
            )}
        </div>
    );
};

export default EmployeeList;
