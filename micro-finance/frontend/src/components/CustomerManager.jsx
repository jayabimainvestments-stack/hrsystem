import React, { useState, useEffect } from 'react';
import { 
    Users, MapPin, Plus, Search, Filter, MoreVertical, ShieldCheck, 
    User, Briefcase, Users2, ChevronRight, ChevronLeft, CheckCircle2,
    CornerDownRight, Clock, Navigation
} from 'lucide-react';
import axios from 'axios';

const CustomerManager = () => {
    const [view, setView] = useState('customers'); // 'customers' or 'centers'
    const [customers, setCustomers] = useState([]);
    const [centers, setCenters] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formStep, setFormStep] = useState(1);

    // Form states
    const [newCenter, setNewCenter] = useState({ 
        name: '', collector_name: '', manager_name: '', collection_day: 'Monday',
        meeting_time: '10:00', meeting_place: '', village: '', gnd: '', ds_division: '',
        max_capacity: 30, latitude: '', longitude: ''
    });
    
    const [newCustomer, setNewCustomer] = useState({
        nic: '', full_name: '', phone: '', phone_home: '', address_permanent: '', postal_address: '', 
        center_id: '', gender: 'Male', civil_status: 'Married', occupation: '', 
        spouse_name: '', spouse_nic: '', monthly_income: '', 
        guarantor_1_name: '', guarantor_1_nic: '', guarantor_1_phone: '',
        guarantor_2_name: '', guarantor_2_nic: '', guarantor_2_phone: ''
    });

    const API_BASE = 'http://localhost:5001/api';

    useEffect(() => {
        fetchData();
    }, [view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [custRes, centerRes] = await Promise.all([
                axios.get(`${API_BASE}/customers`),
                axios.get(`${API_BASE}/centers`)
            ]);
            setCustomers(custRes.data);
            setCenters(centerRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCenter = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/centers`, newCenter);
            setShowModal(false);
            setFormStep(1);
            fetchData();
            alert('Detailed Center Setup Complete!');
        } catch (err) {
            alert('Error adding center: ' + err.message);
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/customers`, newCustomer);
            setShowModal(false);
            setFormStep(1);
            fetchData();
            alert('Detailed Customer Registration Successful!');
        } catch (err) {
            alert('Error adding customer: ' + err.message);
        }
    };

    const nextStep = () => setFormStep(prev => prev + 1);
    const prevStep = () => setFormStep(prev => prev - 1);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold">{view === 'customers' ? 'Customer Directory' : 'Center Management'}</h2>
                    <p className="text-gray-400 mt-1">Manage your {view} and their assignments.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-white/5 p-1 rounded-xl">
                        <button 
                            onClick={() => setView('customers')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'customers' ? 'bg-brand-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Customers
                        </button>
                        <button 
                            onClick={() => setView('centers')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'centers' ? 'bg-brand-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Centers
                        </button>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <Plus size={20} />
                        Add {view === 'customers' ? 'Customer' : 'Center'}
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="glass-card !p-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input type="text" placeholder={`Search ${view}...`} className="input-field pl-10 py-1.5 text-sm w-80" />
                    </div>
                    <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                            <tr>
                                {view === 'customers' ? (
                                    <>
                                        <th className="px-6 py-4 font-semibold">Customer Name</th>
                                        <th className="px-6 py-4 font-semibold">NIC</th>
                                        <th className="px-6 py-4 font-semibold text-center">Center</th>
                                        <th className="px-6 py-4 font-semibold">Phone</th>
                                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold"></th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 font-semibold">Center Name</th>
                                        <th className="px-6 py-4 font-semibold">Location (Village / GND)</th>
                                        <th className="px-6 py-4 font-semibold">Meeting Schedule</th>
                                        <th className="px-6 py-4 font-semibold text-center">Members</th>
                                        <th className="px-6 py-4 font-semibold text-center">GPS</th>
                                        <th className="px-6 py-4 font-semibold"></th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr><td colSpan="6" className="py-20 text-center text-gray-500 animate-pulse">Loading data...</td></tr>
                            ) : (view === 'customers' ? customers : centers).map((item, idx) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    {view === 'customers' ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center font-bold text-sm">
                                                        {item.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium truncate max-w-[200px]">{item.full_name}</p>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{item.occupation || 'Personal Account'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-sm font-mono">{item.nic}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-white/5 px-3 py-1 rounded-full text-[11px] font-bold border border-white/10 text-gray-400">
                                                    {item.center_name || 'UNASSIGNED'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-sm">{item.phone || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="flex items-center justify-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg w-max mx-auto shadow-sm shadow-green-900/10">
                                                    <CheckCircle2 size={12} />
                                                    VERIFIED
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-bold tracking-wide">
                                                {item.name}
                                                <p className="text-[10px] text-gray-500 font-normal uppercase tracking-wider mt-0.5">Collector: {item.collector_name}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium">{item.village || 'N/A'}</div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 font-bold">
                                                    <CornerDownRight size={10} /> GND: {item.gnd || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-400/5 px-2 py-1 rounded-lg w-max font-bold">
                                                    <Calendar size={14} />
                                                    {item.collection_day}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 font-mono">
                                                    <Clock size={12} /> {item.meeting_time || '--:--'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="text-lg font-bold text-gray-300">{item.cluster_size || 0}</div>
                                                <div className="text-[10px] text-gray-600 uppercase">Members</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.latitude ? (
                                                    <div className="flex flex-col items-center gap-1 text-blue-400 hover:text-blue-300 cursor-pointer">
                                                        <Navigation size={18} />
                                                        <span className="text-[8px] font-mono">TRACKED</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-800"><Navigation size={18} /></div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-600 hover:text-white transition-colors"><MoreVertical size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Expanded Detailed Forms View */}
            {showModal && (
                <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-3xl flex items-center justify-center z-[60] p-6 overflow-y-auto">
                    <div className="glass-card max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5">
                        
                        {/* WIZARD HEADER */}
                        <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
                            {view === 'customers' ? (
                                [
                                    { id: 1, icon: User, label: 'Identity' },
                                    { id: 2, icon: Briefcase, label: 'Financial' },
                                    { id: 3, icon: Users2, label: 'Security' }
                                ].map((s) => (
                                    <div key={s.id} className={`flex items-center gap-3 ${formStep >= s.id ? 'text-brand-accent' : 'text-gray-600'} transition-all`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${formStep >= s.id ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-800'}`}>
                                            <s.icon size={16} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">{s.label}</span>
                                        {s.id < 3 && <div className={`w-12 h-px ${formStep > s.id ? 'bg-brand-accent' : 'bg-gray-800'} hidden sm:block`} />}
                                    </div>
                                ))
                            ) : (
                                [
                                    { id: 1, icon: MapPin, label: 'General' },
                                    { id: 2, icon: Navigation, label: 'Location' }
                                ].map((s) => (
                                    <div key={s.id} className={`flex items-center gap-3 ${formStep >= s.id ? 'text-brand-accent' : 'text-gray-600'} transition-all`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${formStep >= s.id ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-800'}`}>
                                            <s.icon size={16} />
                                        </div>
                                        <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">{s.label}</span>
                                        {s.id < 2 && <div className={`w-24 h-px ${formStep > s.id ? 'bg-brand-accent' : 'bg-gray-800'} hidden sm:block`} />}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* CENTER FORM START */}
                        {view === 'centers' ? (
                            <form className="space-y-6" onSubmit={handleAddCenter}>
                                {formStep === 1 ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase tracking-wider">Center Branding Information</label>
                                        <input type="text" className="input-field w-full text-lg font-bold" value={newCenter.name} onChange={e => setNewCenter({...newCenter, name: e.target.value})} required placeholder="Unique Center Name (e.g. Dambulla 04)" /></div>
                                        
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Assigned Collector</label>
                                            <input type="text" className="input-field w-full" value={newCenter.collector_name} onChange={e => setNewCenter({...newCenter, collector_name: e.target.value})} placeholder="Field Officer Name" /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Field Manager</label>
                                            <input type="text" className="input-field w-full" value={newCenter.manager_name} onChange={e => setNewCenter({...newCenter, manager_name: e.target.value})} placeholder="Supervisor Name" /></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Collection Day</label>
                                            <select className="input-field w-full shadow-lg" value={newCenter.collection_day} onChange={e => setNewCenter({...newCenter, collection_day: e.target.value})}>
                                                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Meeting Time</label>
                                            <input type="time" className="input-field w-full" value={newCenter.meeting_time} onChange={e => setNewCenter({...newCenter, meeting_time: e.target.value})} /></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <div className="grid grid-cols-3 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Village</label>
                                            <input type="text" className="input-field w-full" value={newCenter.village} onChange={e => setNewCenter({...newCenter, village: e.target.value})} /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">GND Division</label>
                                            <input type="text" className="input-field w-full font-bold text-orange-400" value={newCenter.gnd} onChange={e => setNewCenter({...newCenter, gnd: e.target.value})} placeholder="වසම" /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">DS Division</label>
                                            <input type="text" className="input-field w-full" value={newCenter.ds_division} onChange={e => setNewCenter({...newCenter, ds_division: e.target.value})} /></div>
                                        </div>
                                        
                                        <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Meeting Venue / Place</label>
                                        <textarea className="input-field w-full h-16" value={newCenter.meeting_place} onChange={e => setNewCenter({...newCenter, meeting_place: e.target.value})} placeholder="Detailed location description..." /></div>
                                        
                                        <div className="p-6 rounded-2xl bg-brand-accent/5 border border-brand-accent/20 space-y-4">
                                            <h4 className="text-xs font-bold text-brand-accent uppercase tracking-widest flex items-center gap-2">
                                                <Navigation size={14} /> GPS Coordinate Integration
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="text-[10px] text-gray-500 mb-1 block uppercase">Latitude</label>
                                                <input type="text" className="input-field w-full font-mono text-sm" value={newCenter.latitude} onChange={e => setNewCenter({...newCenter, latitude: e.target.value})} placeholder="7.54xx" /></div>
                                                <div><label className="text-[10px] text-gray-500 mb-1 block uppercase">Longitude</label>
                                                <input type="text" className="input-field w-full font-mono text-sm" value={newCenter.longitude} onChange={e => setNewCenter({...newCenter, longitude: e.target.value})} placeholder="80.62xx" /></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex gap-4 mt-10 pt-6 border-t border-white/10">
                                    <button type="button" onClick={() => { setShowModal(false); setFormStep(1); }} className="px-6 py-3 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                                    <div className="flex-1 flex gap-4 justify-end">
                                        {formStep > 1 && (
                                            <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-colors">
                                                <ChevronLeft size={18} /> Back
                                            </button>
                                        )}
                                        {formStep < 2 ? (
                                            <button type="button" onClick={nextStep} className="flex items-center gap-2 px-10 py-3 rounded-xl bg-brand-accent font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                                                Location Details <ChevronRight size={18} />
                                            </button>
                                        ) : (
                                            <button type="submit" className="flex items-center gap-2 px-10 py-3 rounded-xl bg-green-500 font-bold hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-900/20 text-white">
                                                Activate Center <CheckCircle2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        ) : (
                            /* CUSTOMER FORM START (Previously Implemented) */
                            <form className="space-y-6">
                                {formStep === 1 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Customer Full Name*</label>
                                            <input type="text" className="input-field w-full" value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} required placeholder="As per NIC" /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">NIC Number*</label>
                                            <input type="text" className="input-field w-full font-mono" value={newCustomer.nic} onChange={e => setNewCustomer({...newCustomer, nic: e.target.value})} required placeholder="123456789V" /></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Mobile Phone*</label>
                                            <input type="text" className="input-field w-full" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Home Phone</label>
                                            <input type="text" className="input-field w-full" value={newCustomer.phone_home} onChange={e => setNewCustomer({...newCustomer, phone_home: e.target.value})} /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Gender</label>
                                            <select className="input-field w-full" value={newCustomer.gender} onChange={e => setNewCustomer({...newCustomer, gender: e.target.value})}>
                                                <option>Male</option><option>Female</option>
                                            </select></div>
                                        </div>
                                        <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Permanent Address</label>
                                        <textarea className="input-field w-full h-20 text-sm" value={newCustomer.address_permanent} onChange={e => setNewCustomer({...newCustomer, address_permanent: e.target.value})} /></div>
                                    </div>
                                )}

                                {formStep === 2 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Primary Occupation</label>
                                            <input type="text" className="input-field w-full" value={newCustomer.occupation} onChange={e => setNewCustomer({...newCustomer, occupation: e.target.value})} placeholder="e.g. Farming" /></div>
                                            <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Estimated Monthly Income (LKR)</label>
                                            <input type="number" className="input-field w-full" value={newCustomer.monthly_income} onChange={e => setNewCustomer({...newCustomer, monthly_income: e.target.value})} /></div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Users2 size={14} /> Spouse Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="text-xs text-gray-500 mb-1 block">Spouse Name</label>
                                                <input type="text" className="input-field w-full" value={newCustomer.spouse_name} onChange={e => setNewCustomer({...newCustomer, spouse_name: e.target.value})} /></div>
                                                <div><label className="text-xs text-gray-500 mb-1 block">Spouse NIC</label>
                                                <input type="text" className="input-field w-full font-mono" value={newCustomer.spouse_nic} onChange={e => setNewCustomer({...newCustomer, spouse_nic: e.target.value})} /></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formStep === 3 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                        <div><label className="text-xs text-gray-500 mb-2 block font-bold uppercase">Assigned Center*</label>
                                        <select className="input-field w-full font-bold text-brand-accent" value={newCustomer.center_id} onChange={e => setNewCustomer({...newCustomer, center_id: e.target.value})} required>
                                            <option value="">Select a Collection Center...</option>
                                            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select></div>
                                        
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Guarantor 01</h4>
                                                <input type="text" placeholder="Full Name" className="input-field w-full text-xs" value={newCustomer.guarantor_1_name} onChange={e => setNewCustomer({...newCustomer, guarantor_1_name: e.target.value})} />
                                                <input type="text" placeholder="NIC Number" className="input-field w-full text-xs font-mono" value={newCustomer.guarantor_1_nic} onChange={e => setNewCustomer({...newCustomer, guarantor_1_nic: e.target.value})} />
                                                <input type="text" placeholder="Phone" className="input-field w-full text-xs" value={newCustomer.guarantor_1_phone} onChange={e => setNewCustomer({...newCustomer, guarantor_1_phone: e.target.value})} />
                                            </div>
                                            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Guarantor 02</h4>
                                                <input type="text" placeholder="Full Name" className="input-field w-full text-xs" value={newCustomer.guarantor_2_name} onChange={e => setNewCustomer({...newCustomer, guarantor_2_name: e.target.value})} />
                                                <input type="text" placeholder="NIC Number" className="input-field w-full text-xs font-mono" value={newCustomer.guarantor_2_nic} onChange={e => setNewCustomer({...newCustomer, guarantor_2_nic: e.target.value})} />
                                                <input type="text" placeholder="Phone" className="input-field w-full text-xs" value={newCustomer.guarantor_2_phone} onChange={e => setNewCustomer({...newCustomer, guarantor_2_phone: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 mt-10 pt-6 border-t border-white/10">
                                    <button type="button" onClick={() => { setShowModal(false); setFormStep(1); }} className="px-6 py-3 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                                    <div className="flex-1 flex gap-4 justify-end">
                                        {formStep > 1 && (
                                            <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-colors">
                                                <ChevronLeft size={18} /> Back
                                            </button>
                                        )}
                                        {formStep < 3 ? (
                                            <button type="button" onClick={nextStep} className="flex items-center gap-2 px-10 py-3 rounded-xl bg-brand-accent font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                                                Next Step <ChevronRight size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={handleAddCustomer} className="flex items-center gap-2 px-10 py-3 rounded-xl bg-green-500 font-bold hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-900/20 text-white">
                                                Complete Registration <CheckCircle2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;
