import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, User, ShieldCheck, CreditCard, Phone, Save, Camera, Loader2 } from 'lucide-react';
import { BASE_URL } from '../services/api';

const EditEmployeeModal = ({ employee, onClose, onEmployeeUpdated }) => {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '', email: '',
        nic_passport: '', designation: '', department: '', hire_date: '', phone: '', address: '',
        dob: '', gender: '', marital_status: '', blood_group: '',
        bank_name: '', branch_code: '', account_number: '', account_holder_name: '',
        emergency_name: '', emergency_relation: '', emergency_phone: '',
        is_epf_eligible: true,
        is_etf_eligible: true,
        biometric_id: '',
        password: ''
    });
    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [profilePic, setProfilePic] = useState(null);
    const [picPreview, setPicPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

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

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name || '',
                email: employee.email || '',
                nic_passport: employee.nic_passport || '',
                designation: employee.designation || '',
                department: employee.department || '',
                hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
                phone: employee.phone || '',
                address: employee.address || '',
                dob: employee.dob ? employee.dob.split('T')[0] : '',
                gender: employee.gender || 'Male',
                marital_status: employee.marital_status || 'Single',
                blood_group: employee.blood_group || '',
                is_epf_eligible: employee.is_epf_eligible !== undefined ? employee.is_epf_eligible : true,
                is_etf_eligible: employee.is_etf_eligible !== undefined ? employee.is_etf_eligible : true,

                bank_name: employee.bank_details?.bank_name || employee.bank_name || '',
                branch_code: employee.bank_details?.branch_code || employee.branch_code || '',
                account_number: employee.bank_details?.account_number || employee.account_number || employee.bank_account_no || '',
                account_holder_name: employee.bank_details?.account_holder_name || employee.account_holder_name || employee.name || '',

                emergency_name: employee.emergency_contact?.name || employee.emergency_contact_name || '',
                emergency_relation: employee.emergency_contact?.relation || '',
                emergency_phone: employee.emergency_contact?.phone || employee.emergency_contact_phone || '',
                biometric_id: employee.biometric_id || employee.epf_no || ''
            });
        }
    }, [employee]);

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
            await api.put(`/employees/${employee.id}`, payload);

            // Upload photo if selected
            if (profilePic && employee.user_id) {
                setUploading(true);
                const picFormData = new FormData();
                picFormData.append('image', profilePic);
                await api.post(`/auth/profile-picture/${employee.user_id}`, picFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert('Employee updated successfully');
            onEmployeeUpdated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error updating employee');
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
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-1 relative z-10">Edit Employee</h2>
                    <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">Updating profile for {employee.name}</p>
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
                    {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100">{error}</div>}

                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto px-1 space-y-6 custom-scrollbar">
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-pic-upload').click()}>
                                <div className="w-24 h-24 rounded-3xl bg-slate-100 overflow-hidden flex items-center justify-center shadow-lg ring-4 ring-white group-hover:ring-primary-100 transition-all">
                                    {picPreview ? (
                                        <img src={picPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : employee.profile_picture ? (
                                        <img
                                            src={employee.profile_picture.startsWith('http') ? employee.profile_picture : `${BASE_URL}${employee.profile_picture}`}
                                            alt={employee.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-300 group-hover:text-primary-500 transition-colors">
                                            <Camera size={24} />
                                            <span className="text-[8px] font-black uppercase mt-1">Change Photo</span>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-primary-600/40 backdrop-blur-sm flex items-center justify-center">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input id="edit-pic-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />

                            <div className="mt-6 w-full max-w-md">
                                <label className={`${labelClass} text-center`}>Full Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`${inputClass} text-center text-xl`}
                                    required
                                    placeholder="Enter full name"
                                />
                            </div>
                        </div>

                        {activeTab === 'basic' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Email Address (Username)</label>
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`${inputClass} ${currentUser.role !== 'Admin' ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
                                        required
                                        readOnly={currentUser.role !== 'Admin'}
                                    />
                                </div>
                                {currentUser.role === 'Admin' && (
                                    <div>
                                        <label className={labelClass}>Reset Password (Optional)</label>
                                        <input
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={inputClass}
                                            placeholder="Leave blank to keep current"
                                        />
                                    </div>
                                )}
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
                            </div>
                        )}

                        {activeTab === 'personal' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>NIC / Passport</label>
                                    <input name="nic_passport" value={formData.nic_passport} onChange={handleChange} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Biometric Enrollment ID</label>
                                    <input name="biometric_id" value={formData.biometric_id} onChange={handleChange} className={`${inputClass} tabular-nums`} placeholder="e.g. 101" />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone Number</label>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Date of Birth</label>
                                    <input name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
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
                                    <textarea name="address" value={formData.address} onChange={handleChange} className={`${inputClass} h-24 pt-4 resize-none`}></textarea>
                                </div>
                                <div className="col-span-2 flex gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 justify-center">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="is_epf_eligible" checked={formData.is_epf_eligible} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-100 transition-all" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-primary-600">EPF Eligible</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="is_etf_eligible" checked={formData.is_etf_eligible} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-100 transition-all" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-primary-600">ETF Eligible</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'banking' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className={labelClass}>Bank Name</label>
                                    <input name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} />
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
                                    <input name="emergency_relation" value={formData.emergency_relation} onChange={handleChange} className={inputClass} />
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
                        <button type="submit" disabled={loading} className="flex-1 py-5 bg-primary-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-500 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Commit Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEmployeeModal;
