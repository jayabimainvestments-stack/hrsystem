import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../services/api';
import Navbar from '../components/Navbar';
import EmployeeDocuments from '../components/EmployeeDocuments';
import OnboardingTab from '../components/OnboardingTab';
import ExitTab from '../components/ExitTab';
import EmployeeSalaryStructure from '../components/EmployeeSalaryStructure';
import EditEmployeeModal from '../components/EditEmployeeModal';
import PerformanceTab from '../components/PerformanceTab';
import ComplianceTab from '../components/ComplianceTab';
import { useAuth } from '../context/AuthContext';
import {
    User, FileText, Settings, LogOut, CreditCard, Star,
    ShieldAlert, Edit3, ArrowUpCircle, Phone, Mail, MapPin,
    Calendar, Hash, Briefcase, Building2, Lock, KeyRound, CheckCircle2, X
} from 'lucide-react';

const EmployeeProfile = ({ isMe }) => {
    const { user: currentUser } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [promoteData, setPromoteData] = useState({
        action_type: 'Promotion',
        new_department: '',
        new_designation: '',
        new_salary: '',
        reason: ''
    });

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');

    useEffect(() => {
        if (employee) {
            setEditedName(employee.name);
        }
    }, [employee]);

    const handleNameUpdate = async () => {
        try {
            await api.put(`/employees/${id || employee.id}`, { ...employee, name: editedName });
            setEmployee(prev => ({ ...prev, name: editedName }));
            setIsEditingName(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update name');
        }
    };

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const endpoint = isMe ? '/employees/me' : `/employees/${id}`;
                const { data } = await api.get(endpoint);
                setEmployee(data);
                setPromoteData(prev => ({ ...prev, new_department: data.department, new_designation: data.designation }));
            } catch (error) {
                console.error("Error fetching employee", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id, isMe]);

    useEffect(() => {
        if (showPromoteModal && departments.length === 0) {
            const fetchMeta = async () => {
                try {
                    const [deptRes, desigRes] = await Promise.all([
                        api.get('/meta/departments'),
                        api.get('/meta/designations')
                    ]);
                    setDepartments(deptRes.data);
                    setDesignations(desigRes.data);
                } catch (error) {
                    console.error("Error fetching meta data", error);
                }
            };
            fetchMeta();
        }
    }, [showPromoteModal, departments.length]);

    const handlePromote = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.put(`/employees/${id}/promote`, promoteData);
            setEmployee(prev => ({ ...prev, ...data }));
            setShowPromoteModal(false);
            alert('Employee updated successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to promote employee');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return alert("New passwords do not match");
        }
        setPasswordLoading(true);
        try {
            await api.post('/auth/change-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            alert('Password updated successfully');
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
    if (!employee) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm">
                <ShieldAlert className="mx-auto text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-black text-slate-800 mb-2">Employee Not Found</h2>
                <p className="text-slate-500 mb-6">The requested profile might have been deleted or is inaccessible.</p>
                <button onClick={() => navigate('/employees')} className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold">Back to Directory</button>
            </div>
        </div>
    );

    const tabs = [
        { id: 'details', label: 'Overview', icon: User, color: 'blue' },
        { id: 'documents', label: 'Docs', icon: FileText, color: 'blue' },
        { id: 'onboarding', label: 'Onboard', icon: Settings, color: 'slate' },
        { id: 'salary', label: 'Payroll', icon: CreditCard, color: 'emerald' },
        { id: 'performance', label: 'Reviews', icon: Star, color: 'amber' },
        { id: 'compliance', label: 'Legal', icon: ShieldAlert, color: 'red' },
        { id: 'exit', label: 'Exit', icon: LogOut, color: 'pink' }
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="h-24 w-24 bg-blue-600 rounded-3xl overflow-hidden flex items-center justify-center text-white shadow-xl shadow-blue-100 ring-4 ring-white">
                                {employee.profile_picture ? (
                                    <img
                                        src={employee.profile_picture.startsWith('http') || employee.profile_picture.startsWith('data:') ? employee.profile_picture : `${BASE_URL}${employee.profile_picture}`}
                                        alt={employee.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-black">{employee.name.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={editedName}
                                            onChange={e => setEditedName(e.target.value)}
                                            className="text-3xl font-black text-slate-900 tracking-tight bg-slate-50 border-b-2 border-blue-600 outline-none px-1 py-0.5 rounded-lg"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleNameUpdate();
                                                if (e.key === 'Escape') { setIsEditingName(false); setEditedName(employee.name); }
                                            }}
                                        />
                                        <button onClick={handleNameUpdate} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100">
                                            <CheckCircle2 size={20} />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setEditedName(employee.name); }} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 group">
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{employee.name}</h1>
                                        {(currentUser.role === 'Admin' || currentUser.role === 'HR Manager') && (
                                            <button
                                                onClick={() => setIsEditingName(true)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                                                title="Edit Name"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 mt-2">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-blue-100 flex items-center gap-1.5">
                                        <Briefcase size={14} /> {employee.designation || 'Staff'}
                                    </span>
                                    <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 flex items-center gap-1.5">
                                        <Building2 size={14} /> {employee.department || 'General'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                        {employee.status || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            {(currentUser.role === 'Admin' || currentUser.role === 'HR Manager') && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <Edit3 size={18} /> Edit Profile
                                </button>
                            )}
                            {(currentUser.role === 'Admin' || currentUser.role === 'HR Manager') && !isMe && (
                                <button
                                    onClick={() => setShowPromoteModal(true)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] transition-all shadow-xl shadow-blue-100"
                                >
                                    <ArrowUpCircle size={18} /> Update Career
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-10 -mb-8 overflow-x-auto">
                        <div className="flex gap-4 border-b border-slate-100 pb-0.5 min-w-max">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${isActive
                                            ? `border-blue-600 text-blue-600 bg-blue-50/10`
                                            : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        <Icon size={16} /> {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {activeTab === 'details' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Column */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Contact Information</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Mail size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                                            <p className="font-bold text-slate-700">{employee.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Phone size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Phone</p>
                                            <p className="font-bold text-slate-700">{employee.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><MapPin size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-nowrap">Address</p>
                                            <p className="font-bold text-slate-700 text-sm leading-relaxed">{employee.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-600 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-100 text-white">
                                <h3 className="text-sm font-black text-blue-200 uppercase tracking-widest mb-6 opacity-80">Employment Details</h3>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-3xl">
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} className="text-blue-200" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-50">Hired On</span>
                                        </div>
                                        <span className="font-black">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-3xl">
                                        <div className="flex items-center gap-3">
                                            <Hash size={18} className="text-blue-200" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-blue-50">NIC / Pass</span>
                                        </div>
                                        <span className="font-black">{employee.nic_passport || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Security Section */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 flex items-center gap-2">
                                    <Lock size={16} className="text-slate-400" /> Account Security
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><User size={20} /></div>
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Login Username</p>
                                            <p className="font-black text-slate-800 truncate">{employee.email}</p>
                                        </div>
                                    </div>
                                    {isMe && (
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                                        >
                                            <KeyRound size={16} /> Change Password
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Content */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <div className="w-4 h-1 bg-blue-500 rounded-full"></div> Personal Info
                                        </h3>
                                        <dl className="space-y-6">
                                            <div>
                                                <dt className="text-[10px] font-black text-slate-400 uppercase mb-1">Gender</dt>
                                                <dd className="font-bold text-slate-800">{employee.gender || 'Not Specified'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-black text-slate-400 uppercase mb-1">Date of Birth</dt>
                                                <dd className="font-bold text-slate-800">{employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[10px] font-black text-slate-400 uppercase mb-1">Marital Status</dt>
                                                <dd className="font-bold text-slate-800">{employee.marital_status || 'N/A'}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <div className="w-4 h-1 bg-emerald-500 rounded-full"></div> Banking & Legal
                                        </h3>
                                        {employee.bank_details ? (
                                            <dl className="space-y-6">
                                                <div>
                                                    <dt className="text-[10px] font-black text-slate-400 uppercase mb-1">Bank Name</dt>
                                                    <dd className="font-bold text-slate-800 uppercase text-xs">{employee.bank_details.bank_name}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-[10px] font-black text-slate-400 uppercase mb-1">Account Number</dt>
                                                    <dd className="font-black text-blue-600 font-mono tracking-wider">{employee.bank_details.account_number}</dd>
                                                </div>
                                                <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                                                    <div>
                                                        <dt className="text-[9px] font-black text-slate-400 uppercase mb-1">EPF Status</dt>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${employee.is_epf_eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                                                            {employee.is_epf_eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[9px] font-black text-slate-400 uppercase mb-1">ETF Status</dt>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${employee.is_etf_eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>
                                                            {employee.is_etf_eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </dl>
                                        ) : (
                                            <div className="bg-slate-50 rounded-3xl p-6 text-center text-slate-400 italic font-medium">No banking information configured.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-50">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <div className="w-4 h-1 bg-red-500 rounded-full"></div> Emergency Contact
                                    </h3>
                                    {employee.emergency_contact ? (
                                        <div className="bg-slate-50 rounded-3xl p-6 flex justify-between items-center">
                                            <div>
                                                <p className="font-black text-slate-800 mb-1 leading-none">{employee.emergency_contact.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{employee.emergency_contact.relation}</p>
                                            </div>
                                            <div className="bg-white px-4 py-2 rounded-xl font-black text-blue-600 shadow-sm border border-blue-50">
                                                {employee.emergency_contact.phone}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50/50 rounded-3xl p-6 text-center text-red-300 italic font-medium">Emergency contact missing.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'documents' ? (
                    <EmployeeDocuments employeeId={id || employee.id} />
                ) : activeTab === 'onboarding' ? (
                    <OnboardingTab employeeId={id || employee.id} />
                ) : activeTab === 'exit' ? (
                    <ExitTab employeeId={id || employee.id} />
                ) : activeTab === 'salary' ? (
                    <EmployeeSalaryStructure employeeId={id || employee.id} />
                ) : activeTab === 'performance' ? (
                    <PerformanceTab employeeId={id || employee.id} />
                ) : (
                    <ComplianceTab employeeId={id || employee.id} />
                )}
            </main>

            {/* Promotion Modal */}
            {showPromoteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-1 leading-tight">Career Update</h2>
                            <p className="text-blue-100 font-medium">Internal transition for {employee.name}</p>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handlePromote} className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Action Type</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                            value={promoteData.action_type}
                                            onChange={e => setPromoteData({ ...promoteData, action_type: e.target.value })}
                                        >
                                            <option>Promotion</option>
                                            <option>Transfer</option>
                                            <option>Demotion</option>
                                            <option>Role Change</option>
                                            <option>Other Update</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Salary (LKR)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                            value={promoteData.new_salary}
                                            onChange={e => setPromoteData({ ...promoteData, new_salary: e.target.value })}
                                            required
                                            placeholder="e.g. 75000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-nowrap">New Department</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={promoteData.new_department}
                                        onChange={e => setPromoteData({ ...promoteData, new_department: e.target.value, new_designation: '' })}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Designation</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={promoteData.new_designation}
                                        onChange={e => setPromoteData({ ...promoteData, new_designation: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Designation</option>
                                        {designations
                                            .filter(d => !promoteData.new_department ||
                                                (d.department_name && d.department_name.trim().toLowerCase() === promoteData.new_department.trim().toLowerCase()))
                                            .map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Change</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        rows="2"
                                        value={promoteData.reason}
                                        onChange={e => setPromoteData({ ...promoteData, reason: e.target.value })}
                                        placeholder="Brief justification..."
                                    ></textarea>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowPromoteModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Apply Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-1">Security Update</h2>
                            <p className="text-slate-400 font-medium">Update your account password</p>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handlePasswordChange} className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={passwordData.oldPassword}
                                        onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <EditEmployeeModal
                    employee={employee}
                    onClose={() => setShowEditModal(false)}
                    onEmployeeUpdated={() => window.location.reload()}
                />
            )}
        </div>
    );
};

export default EmployeeProfile;
