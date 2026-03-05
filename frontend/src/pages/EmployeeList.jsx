import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, FileText, ChevronRight, Filter, Building2, Briefcase, Mail, Plus } from 'lucide-react';
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
            (emp.email || '').toLowerCase().includes(search.toLowerCase());

        const matchesDept = !deptFilter ||
            (emp.department && emp.department.trim().toLowerCase() === deptFilter.trim().toLowerCase());

        const matchesDesig = !desigFilter ||
            (emp.designation && emp.designation.trim().toLowerCase() === desigFilter.trim().toLowerCase());

        return matchesSearch && matchesDept && matchesDesig;
    });

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
                    <div className="p-6 md:p-10 flex flex-col lg:flex-row gap-6 bg-slate-50/30 border-b border-slate-50">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                className="w-full bg-white border-none rounded-2xl pl-16 pr-6 py-4 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 transition-all shadow-sm"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <select
                                className="bg-white border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 shadow-sm min-w-[180px]"
                                value={deptFilter}
                                onChange={e => { setDeptFilter(e.target.value); setDesigFilter(''); }}
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                            <select
                                className="bg-white border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 ring-primary-500/10 shadow-sm min-w-[180px]"
                                value={desigFilter}
                                onChange={e => setDesigFilter(e.target.value)}
                            >
                                <option value="">All Designations</option>
                                {designations
                                    .filter(d => !deptFilter ||
                                        (d.department_name && d.department_name.trim().toLowerCase() === deptFilter.trim().toLowerCase()))
                                    .map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50 text-center">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Access</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Profiles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary-100 group-hover:rotate-3 transition-transform overflow-hidden">
                                                    {emp.profile_picture ? (
                                                        <img
                                                            src={emp.profile_picture.startsWith('http') ? emp.profile_picture : `${BASE_URL}${emp.profile_picture}`}
                                                            alt={emp.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        (emp.name || 'E').charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black tracking-tight group-hover:text-primary-600 transition-colors uppercase">{emp.name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 tabular-nums">#{emp.emp_code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <Mail size={14} className="text-slate-300" />
                                                <span>{emp.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Building2 size={12} className="text-primary-400" />
                                                    <span>{emp.department || 'Not Assigned'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Briefcase size={12} className="text-emerald-400" />
                                                    <span>{emp.designation || 'Trainee'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${emp.role === 'Admin' ? 'bg-red-50 text-red-600' :
                                                emp.role === 'HR Manager' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Link
                                                to={`/employees/${emp.id}`}
                                                className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-slate-100 active:scale-95"
                                            >
                                                Profile <ChevronRight size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
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
