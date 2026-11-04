import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, User, Briefcase, Building2, Phone, Mail, MapPin, CreditCard, ShieldCheck, Camera, Loader2, Clock, AlertCircle } from 'lucide-react';

const AddEmployee = ({ onClose, onEmployeeAdded }) => {
    const today = new Date().toISOString().split('T')[0];
    const defaultProbation = new Date();
    defaultProbation.setMonth(defaultProbation.getMonth() + 3);

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'Employee',
        nic_passport: '', designation: '', department: '', hire_date: today,
        contract_type: 'Probation',
        probation_duration: '3',
        probation_end_date: defaultProbation.toISOString().split('T')[0],
        confirmation_date: '',
        phone: '', address: '',
        is_epf_eligible: true,
        is_etf_eligible: true,
        dob: '', gender: 'Male', marital_status: 'Single',
        bank_name: '', branch_code: '', account_number: '', account_holder_name: '',
        emergency_name: '', emergency_relation: '', emergency_phone: ''
    });
    const [profilePic, setProfilePic] = useState(null);
    const [picPreview, setPicPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [deptRes, desigRes] = await Promise.all([
                    api.get('/meta/departments'),
                    api.get('/meta/designations')
                ]);
                setDepartments(deptRes.data);
                setDesignations(desigRes.data);
            } catch (err) {
                console.error("Error fetching meta data", err);
            }
        };
        fetchMeta();
    }, []);

    // Auto-compute probation end date based on hire date and selected duration
    useEffect(() => {
        if (formData.contract_type === 'Probation' && formData.hire_date) {
            if (formData.probation_duration !== 'custom') {
                const hire = new Date(formData.hire_date);
                if (!isNaN(hire.getTime())) {
                    hire.setMonth(hire.getMonth() + parseInt(formData.probation_duration || '3'));
                    const calculated = hire.toISOString().split('T')[0];
                    setFormData(prev => ({ ...prev, probation_end_date: calculated }));
                }
            }
        }
    }, [formData.hire_date, formData.probation_duration, formData.contract_type]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        if (name === 'department') {
            setFormData(prev => ({ ...prev, department: val, designation: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file);
            setPicPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            probation_end_date: formData.contract_type === 'Probation' ? formData.probation_end_date : null,
            bank_details: {
                bank_name: formData.bank_name,
                branch_code: formData.branch_code,
                account_number: formData.account_number,
                account_holder_name: formData.account_holder_name
            },
            emergency_contact: {
                name: formData.emergency_name,
                relation: formData.emergency_relation,
                phone: formData.emergency_phone
            }
        };

        try {
            const { data } = await api.post('/employees', payload);

            // Upload photo if selected
            if (profilePic && data.userId) {
                setUploading(true);
                const picFormData = new FormData();
                picFormData.append('image', profilePic);
                await api.post(`/auth/profile-picture/${data.userId}`, picFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert('Employee added successfully');
            onEmployeeAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error adding employee');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic', icon: User },
        { id: 'personal', label: 'Personal', icon: ShieldCheck },
        { id: 'banking', label: 'Banking', icon: CreditCard },
        { id: 'emergency', label: 'Emergency', icon: Phone }
    ];

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-primary-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="bg-slate-950 p-8 text-white relative h-32 flex flex-col justify-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-full bg-primary-600/20 blur-[100px] -mr-32 pointer-events-none"></div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 group">
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-1 relative z-10">Add Employee</h2>
                    <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Create a new organizational profile</p>
                </div>

                <div className="flex bg-white p-2 gap-1 border-b border-slate-100">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Icon size={14} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={handleSubmit} className="p-10">
                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 animate-in shake duration-300">{error}</div>}

                    <div className="max-h-[50vh] overflow-y-auto px-1 space-y-6 custom-scrollbar">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group cursor-pointer" onClick={() => document.getElementById('pic-upload').click()}>
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-primary-400 transition-all shadow-inner">
                                    {picPreview ? (
                                        <img src={picPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-300 group-hover:text-primary-500 transition-colors">
                                            <Camera size={24} />
                                            <span className="text-[8px] font-black uppercase mt-1">Add Photo</span>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-primary-600/40 backdrop-blur-sm flex items-center justify-center">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input id="pic-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Employee Identification Photo</p>
                        </div>

                        {activeTab === 'basic' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className={labelClass}>Full Name</label>
                                    <input name="name" value={formData.name} onChange={handleChange} className={inputClass} required placeholder="e.g. Alexander Hamilton" />
                                </div>
                                <div>
                                    <label className={labelClass}>Email Address</label>
                                    <input name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} required placeholder="alex@company.com" />
                                </div>
                                <div>
                                    <label className={labelClass}>Initial Password</label>
                                    <input name="password" type="password" value={formData.password} onChange={handleChange} className={inputClass} required placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className={labelClass}>System Role</label>
                                    <select name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                                        <option value="Employee">Employee</option>
                                        <option value="HR Manager">HR Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Joining Date</label>
                                    <input name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Department</label>
                                    <select name="department" value={formData.department} onChange={handleChange} className={inputClass} required>
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Designation</label>
                                    <select name="designation" value={formData.designation} onChange={handleChange} className={inputClass} required>
                                        <option value="">Select Designation</option>
                                        {designations
                                            .filter(d => !formData.department ||
                                                (d.department_name && d.department_name.trim().toLowerCase() === formData.department.trim().toLowerCase()))
                                            .map(d => <option key={d.id} value={d.title}>{d.title}</option>)}
                                    </select>
                                </div>

                                {/* Contract / Employment Type */}
                                <div>
                                    <label className={labelClass}>Employment / Contract Type</label>
                                    <select name="contract_type" value={formData.contract_type} onChange={handleChange} className={inputClass} required>
                                        <option value="Probation">Probation (පරිවාස)</option>
                                        <option value="Permanent">Permanent (ස්ථිර)</option>
                                        <option value="Contract">Contract (ගිවිසුම්ගත)</option>
                                        <option value="Trainee">Trainee / Intern (පුහුණු)</option>
                                    </select>
                                </div>

                                {formData.contract_type === 'Probation' && (
                                    <>
                                        <div>
                                            <label className={labelClass}>Probation Period</label>
                                            <select name="probation_duration" value={formData.probation_duration} onChange={handleChange} className={inputClass}>
                                                <option value="3">3 Months (මාස 3 - සම්මත)</option>
                                                <option value="6">6 Months (මාස 6)</option>
                                                <option value="12">1 Year (වසර 1)</option>
                                                <option value="custom">Custom Date (වෙනත්)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500 text-white rounded-xl">
                                                    <Clock size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider">Probation End Date (පරිවාස අවසන් දිනය)</p>
                                                    <p className="text-xs text-amber-700 font-medium">Auto-calculated from hire date. Can be customized if needed.</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="date" 
                                                name="probation_end_date" 
                                                value={formData.probation_end_date} 
                                                onChange={handleChange} 
                                                className="bg-white border border-amber-300 rounded-xl px-4 py-2 font-bold text-slate-800 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
                                                required={formData.contract_type === 'Probation'}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'personal' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>NIC / Passport</label>
                                    <input name="nic_passport" value={formData.nic_passport} onChange={handleChange} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone Number</label>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Date of Birth</label>
                                        <input name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Biometric ID</label>
                                        <input name="biometric_id" value={formData.biometric_id} onChange={handleChange} className={`${inputClass} tabular-nums`} placeholder="ID" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <select name="marital_status" value={formData.marital_status} onChange={handleChange} className={inputClass}>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Permanent Address</label>
                                    <textarea name="address" value={formData.address} onChange={handleChange} className={`${inputClass} h-24 pt-4 resize-none`} placeholder="Full residential address..."></textarea>
                                </div>

                                {/* Sri Lankan Labour Law Advisory */}
                                <div className="col-span-2 p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-start gap-3">
                                    <div className="p-2 bg-blue-600 text-white rounded-xl mt-0.5 shrink-0">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div className="text-xs">
                                        <p className="font-black text-blue-900 uppercase tracking-wider text-[11px]">ශ්‍රී ලංකා කම්කරු නීති අනුකූලතාව (Sri Lankan Labour Law Compliance)</p>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            සේවකයෙකු පරිවාස කාලයක (Probation) හෝ පුහුණු කාලයක (Trainee) සිටියද, 1958 අංක 15 දරන EPF පනත සහ 1980 අංක 46 දරන ETF පනතට අනුව <strong>පළමු වැඩකරන දිනයේ සිටම EPF (8% + 12%) සහ ETF (3%) දායකත්වය අනිවාර්ය වේ.</strong> කිසිදු හේතුවක් මත පරිවාස කාලය තුළ EPF/ETF නොගෙවා සිටීමට නීතියෙන් අවසර නැත.
                                        </p>
                                    </div>
                                </div>

                                <div className="col-span-2 flex gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 justify-center">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="is_epf_eligible" checked={formData.is_epf_eligible} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-100 transition-all" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-primary-600">EPF Eligible (අනිවාර්යයි)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="is_etf_eligible" checked={formData.is_etf_eligible} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-100 transition-all" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-primary-600">ETF Eligible (අනිවාර්යයි)</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'banking' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className={labelClass}>Bank Name</label>
                                    <input name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} placeholder="e.g. Commercial Bank of Ceylon" />
                                </div>
                                <div>
                                    <label className={labelClass}>Branch Code</label>
                                    <input name="branch_code" value={formData.branch_code} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Account Number</label>
                                    <input name="account_number" value={formData.account_number} onChange={handleChange} className={`${inputClass} tabular-nums font-mono`} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Account Holder Name</label>
                                    <input name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'emergency' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Contact Person Name</label>
                                    <input name="emergency_name" value={formData.emergency_name} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Relationship</label>
                                    <input name="emergency_relation" value={formData.emergency_relation} onChange={handleChange} className={inputClass} placeholder="e.g. Spouse, Parent" />
                                </div>
                                <div>
                                    <label className={labelClass}>Contact Phone</label>
                                    <input name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-10 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-5 bg-primary-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-500 transition-all active:scale-95">
                            {loading ? 'Processing...' : 'Register Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEmployee;
