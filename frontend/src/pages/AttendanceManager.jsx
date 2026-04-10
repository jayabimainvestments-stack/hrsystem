import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
    Calendar, Clock, User, Users, Download, Search,
    ChevronLeft, ChevronRight, Plus, Tablet, Upload, Save, X, RefreshCw, Trash2, Activity, Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Helper to determine early departure before 16:31 (4:31 PM)
const isEarlyDeparture = (clockOutTime) => {
    if (!clockOutTime || clockOutTime === '--:--') return false;
    
    // Parse the clockOutTime (HH:mm or HH:mm:ss) into a Date object for today
    const timeMatch = clockOutTime.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;
    
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    
    // 16:31 is the policy end time (16 * 60 + 31 = 991 minutes)
    const outMinutes = hours * 60 + minutes;
    return outMinutes < 991;
};

// Helper to determine late arrival after 8:30
const isLateArrival = (clockInTime) => {
    if (!clockInTime || clockInTime === '--:--') return false;
    
    const timeMatch = clockInTime.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;
    
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    
    // 08:30 is the policy start time (8 * 60 + 30 = 510 minutes)
    const inMinutes = hours * 60 + minutes;
    return inMinutes > 510;
};

// Helper to ensure time is in 24H format for input fields
const ensure24h = (timeStr) => {
    if (!timeStr || timeStr === '--:--' || timeStr === 'null') return '';
    
    // Extract HH:mm:ss and AM/PM
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return timeStr;
    
    let [_, h, m, s, ampm] = match;
    let hours = parseInt(h, 10);
    const minutes = m;
    const seconds = s || '00';
    
    if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
};

const AttendanceManager = () => {
    const [activeTab, setActiveTab] = useState('daily'); // daily, summary, leaves, history, devices
    const [attendance, setAttendance] = useState([]);
    const [summary, setSummary] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [historyAttendance, setHistoryAttendance] = useState([]);
    const [myAttendance, setMyAttendance] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const todayStr = new Date().toLocaleDateString('en-CA');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [historyEmpId, setHistoryEmpId] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [departments, setDepartments] = useState([]);

    const [editing, setEditing] = useState(null);
    const [showInPicker, setShowInPicker] = useState(false);
    const [showOutPicker, setShowOutPicker] = useState(false);

    // Optimized helper to prepare record for editing (pre-format times to 24H)
    const startEditing = (record) => {
        setEditing({
            ...record,
            clock_in: ensure24h(record.clock_in),
            clock_out: record.clock_out ? ensure24h(record.clock_out) : ''
        });
    };
    const [adding, setAdding] = useState(false);
    const [addingDevice, setAddingDevice] = useState(false);
    const [newRecord, setNewRecord] = useState({ employee_id: '', clock_in: '', clock_out: '', status: 'Present' });
    const [newDevice, setNewDevice] = useState({ device_name: '', branch_name: '', ip_address: '' });
    const [syncing, setSyncing] = useState(false);
    const [syncingDevice, setSyncingDevice] = useState(false);
    const [syncResult, setSyncResult] = useState(null); // { success, message }

    // Column Filters
    const [nameSearch, setNameSearch] = useState('');
    const [statusSearch, setStatusSearch] = useState('');
    const [sourceSearch, setSourceSearch] = useState('');

    const { user } = useAuth();
    const canManage = user?.role?.includes('Admin') || user?.role?.includes('HR');

    useEffect(() => {
        // Redirect regular employees to 'my' tab if they try to access admin tabs
        if (!canManage && activeTab !== 'my') {
            setActiveTab('my');
        }
    }, [canManage]);

    useEffect(() => {
        if (activeTab === 'my') fetchMyAttendance();
        if (activeTab === 'daily') fetchAttendance();
        if (activeTab === 'summary') fetchSummary();
        if (activeTab === 'leaves') fetchLeaves();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'devices') fetchDevices();

        if (canManage && employees.length === 0) {
            fetchEmployees();
            fetchMeta();
        }
    }, [activeTab, startDate, endDate, deptFilter, historyEmpId]);


    const filteredAttendance = attendance.filter(record => {
        const matchesName = record.employee_name?.toLowerCase().includes(nameSearch.toLowerCase());
        
        let matchesStatus = false;
        if (statusSearch === '') {
            matchesStatus = true;
        } else if (statusSearch === 'Present') {
            matchesStatus = record.status === 'Present' && !isLateArrival(record.clock_in) && !isEarlyDeparture(record.clock_out);
        } else if (statusSearch === 'Delayed Present') {
            matchesStatus = record.status === 'Present' && (isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out));
        } else if (statusSearch === 'Incomplete') {
            matchesStatus = record.status === 'Incomplete' || isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out);
        } else {
            matchesStatus = record.status === statusSearch;
        }

        const matchesSource = record.source?.toLowerCase().includes(sourceSearch.toLowerCase());
        return matchesName && matchesStatus && matchesSource;
    });

    const filteredSummary = summary.filter(row =>
        row.name?.toLowerCase().includes(nameSearch.toLowerCase())
    );

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (deptFilter) params.append('department', deptFilter);
            if (historyEmpId) params.append('employee_id', historyEmpId);

            const { data } = await api.get(`/attendance?${params.toString()}`);
            setAttendance(data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (deptFilter) params.append('department', deptFilter);
            if (historyEmpId) params.append('employee_id', historyEmpId);

            const { data } = await api.get(`/attendance/summary?${params.toString()}`);
            setSummary(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/leaves');
            setLeaves(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!historyEmpId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('employee_id', historyEmpId);

            const { data } = await api.get(`/attendance?${params.toString()}`);
            setHistoryAttendance(data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/attendance/my');
            setMyAttendance(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLeaveStatus = async (id, status) => {
        try {
            await api.put(`/leaves/${id}`, { status });
            fetchLeaves();
            // Refresh attendance data so approved leaves appear immediately
            if (activeTab === 'daily') fetchAttendance();
            if (activeTab === 'summary') fetchSummary();
            if (activeTab === 'history') fetchHistory();
        } catch (error) {
            alert('Failed to update leave status');
        }
    };

    const fetchMeta = async () => {
        try {
            const { data } = await api.get('/meta/departments');
            setDepartments(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/biometric/devices');
            setDevices(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees');
            setEmployees(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleBiometricUSB = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ensure we have a device selected
        if (devices.length === 0) {
            alert('Please register a Biometric Device first in the "Devices" tab.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const punches = [];

            // ZktEco format: UserID\tTimestamp\tStatus...
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                
                // Try tab separation first (Standard ZktEco)
                let parts = line.split('\t');
                if (parts.length < 2) parts = line.split(/\s+/); // Fallback to any whitespace
                
                if (parts.length >= 2) {
                    const biometric_id = parts[0].trim();
                    const punch_time = parts[1].trim();
                    
                    // Validate punch_time looks like a date/time
                    if (punch_time.includes(':') && (punch_time.includes('-') || punch_time.includes('/'))) {
                        punches.push({ biometric_id, punch_time });
                    }
                }
            }

            if (punches.length === 0) {
                alert('No valid biometric logs found in file. Ensure it is a .dat or .txt file from the device.');
                return;
            }

            // For now, use the first active device's API Key
            // Optimization: Let user choose if multiple devices exist
            const deviceRes = await api.get('/biometric/devices');
            const activeDevice = deviceRes.data.find(d => d.status === 'Active');
            
            if (!activeDevice) {
                alert('No active biometric device found to authorize this upload.');
                return;
            }

            const device_key = prompt(`Please enter the API Key for device "${activeDevice.device_name}" to authorize this upload:`);
            if (!device_key) return;

            try {
                const { data } = await api.post('/biometric/punch-bulk', { punches, device_key });
                alert(data.message);
                fetchAttendance();
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to upload biometric data');
            }
        };
        reader.readAsText(file);
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const records = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const [employee_id, date, clock_in, clock_out, status] = line.split(',');
                records.push({
                    employee_id: employee_id.trim(),
                    date: date.trim(),
                    clock_in: clock_in?.trim(),
                    clock_out: clock_out?.trim(),
                    status: status?.trim() || 'Present',
                    source: 'Bulk CSV'
                });
            }

            if (records.length === 0) {
                alert('No valid records found in CSV');
                return;
            }

            try {
                await api.post('/attendance/bulk', { records });
                alert(`Successfully uploaded ${records.length} records!`);
                fetchAttendance();
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to upload bulk attendance');
            }
        };
        reader.readAsText(file);
    };

    const handleAddRecord = async (e) => {
        e.preventDefault();
        try {
            await api.post('/attendance', { ...newRecord, date: startDate, source: 'Manual' });
            setAdding(false);
            fetchAttendance();

        } catch (error) {
            alert('Failed to add record');
        }
    };

    const handleUpdateRecord = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.put(`/attendance/${editing.id}`, {
                clock_in: editing.clock_in,
                clock_out: editing.clock_out,
                status: editing.status
            });
            alert(data.message || 'Correction submitted for approval');
            setEditing(null);
            fetchAttendance();
        } catch (error) {
            alert('Failed to update record');
        }
    };

    const handleAddDevice = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/biometric/register', newDevice);
            alert(`Device Registered! API Key: ${data.api_key}\nSAVE THIS KEY! It will not be shown again.`);
            setAddingDevice(false);
            fetchDevices();
        } catch (error) {
            alert('Failed to register device');
        }
    };

    const deleteDevice = async (id) => {
        if (!window.confirm('Delete this device permanently?')) return;
        try {
            await api.delete(`/biometric/devices/${id}`);
            fetchDevices();
        } catch (error) {
            alert('Failed to delete device');
        }
    };

    const handleSyncDevice = async () => {
        setSyncingDevice(true);
        setSyncResult(null);
        try {
            // Call the local bridge server running on the office PC (port 7700)
            // This is needed because the ZKTeco device is on the LAN and cannot
            // be reached by the cloud backend server.
            const response = await fetch('http://localhost:7700/trigger-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(45000) // 45s overall timeout
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setSyncResult({ success: true, message: data.message });
                fetchAttendance();
            } else {
                setSyncResult({ success: false, message: data.message || 'Device sync failed.' });
            }
        } catch (error) {
            // If connection refused, the bridge is not running on the office PC
            const isOffline = error.name === 'TypeError' || error.name === 'TimeoutError' || error.message?.includes('fetch');
            const msg = isOffline
                ? '⚠️ Local Sync Bridge is not running. Please start AUTO_SYNC_BRIDGE.bat on the office PC first.'
                : error.message || 'Device sync failed. Ensure the device is on the same network as this server.';
            setSyncResult({ success: false, message: msg });
        } finally {
            setSyncingDevice(false);
        }
    };


    const handleSyncAttendance = async () => {
        if (!window.confirm(`Synchronize attendance with leave records for ${startDate} to ${endDate}? This will mark missing records as Absent or Leave.`)) return;
        setSyncing(true);
        try {
            const syncStart = startDate;
            const syncEnd = endDate;

            const { data } = await api.post('/attendance/sync', { startDate: syncStart, endDate: syncEnd });
            alert(`Sync Complete!\nLeaves marked: ${data.results.marked_leave}\nAbsences marked: ${data.results.marked_absent}`);

            activeTab === 'daily' ? fetchAttendance() : fetchSummary();
        } catch (error) {
            alert(error.response?.data?.message || 'Synchronization failed');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <div className="py-8 px-4 mx-auto max-w-screen-2xl sm:px-6 lg:px-8">
                {/* Modern Page Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 ring-4 ring-white">
                                <Activity className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Attendance Center</h1>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Real-time movement tracking & reporting</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {canManage ? (
                            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                                {['daily', 'summary', 'leaves', 'history', 'devices'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === t
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                            : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        {t === 'daily' ? 'Daily Logs' : t === 'summary' ? 'Report' : t === 'leaves' ? 'Leaves' : t === 'history' ? 'History' : 'Devices'}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">My Attendance Logs</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Refined Global Filter Bar */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

                        {/* 1. Unified Date Range Picker */}
                        <div className="lg:col-span-4 space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-blue-500" />
                                Selection Range
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full border-2 border-slate-50 bg-slate-50 p-3 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                    />
                                    <span className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">From</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full border-2 border-slate-50 bg-slate-50 p-3 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                    />
                                    <span className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-black text-slate-400 uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">To</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Department & Employee Filter */}
                        <div className="lg:col-span-3 space-y-3 border-l border-slate-50 pl-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users size={12} className="text-blue-500" />
                                Identity & Group
                            </label>
                            <div className="flex flex-col gap-3">
                                <select
                                    value={deptFilter}
                                    onChange={e => setDeptFilter(e.target.value)}
                                    className="w-full border-2 border-slate-50 bg-slate-50 p-3 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>

                                {['daily', 'summary', 'history'].includes(activeTab) && (
                                    <select
                                        className="w-full border-2 border-slate-50 bg-slate-50 p-3 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                        value={historyEmpId}
                                        onChange={e => setHistoryEmpId(e.target.value)}
                                    >
                                        <option value="">{activeTab === 'history' ? 'Select Employee' : 'All Employees'}</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                )}

                                {activeTab === 'daily' && (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Quick filter table..."
                                            value={nameSearch}
                                            onChange={e => setNameSearch(e.target.value)}
                                            className="w-full border-2 border-slate-50 bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Status Quick Filter Area */}
                        {(activeTab === 'daily' || activeTab === 'summary') && (
                            <div className="lg:col-span-3 space-y-3 border-l border-slate-50 pl-6">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12} className="text-blue-500" />
                                    Status Overlay
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {[
                                        { id: 'Present', label: 'Present', color: 'emerald' },
                                        { id: 'Delayed Present', label: 'Delayed Present', color: 'rose' },
                                        { id: 'Incomplete', label: 'Incomplete', color: 'indigo' },
                                        { id: 'Absent', label: 'Absent', color: 'rose' },
                                        { id: 'Leave', label: 'Leave', color: 'sky' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setStatusSearch(statusSearch === item.id ? '' : item.id)}
                                            className={`px-3 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] transition-all border-2 text-center group ${
                                                statusSearch === item.id
                                                    ? `bg-${item.color}-600 text-white border-${item.color}-600 shadow-lg shadow-${item.color}-200/50 scale-95`
                                                    : `bg-white text-slate-400 border-slate-50 hover:border-${item.color}-200 hover:text-${item.color}-600 hover:shadow-md hover:shadow-${item.color}-50/50`
                                            }`}
                                        >
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={`${statusSearch === item.id ? 'text-white' : `text-${item.color}-500/40 group-hover:text-${item.color}-500`} transition-colors`}>
                                                    <Activity size={10} />
                                                </span>
                                                {item.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Action Stack */}
                        <div className={`lg:col-span-2 flex flex-col gap-2 justify-end ${activeTab !== 'daily' && activeTab !== 'summary' ? 'lg:col-start-11' : ''}`}>
                            {canManage && activeTab === 'daily' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="bg-slate-900 text-white p-2 rounded-2xl cursor-pointer hover:bg-slate-800 transition-all border border-slate-900 shadow-lg shadow-slate-200 flex flex-col items-center justify-center gap-1 group">
                                        <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center">CSV</span>
                                        <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                                    </label>
                                    <label className="bg-blue-600 text-white p-2 rounded-2xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex flex-col items-center justify-center gap-1 group ring-2 ring-blue-50">
                                        <Tablet size={14} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center">USB</span>
                                        <input type="file" accept=".dat,.txt" className="hidden" onChange={handleBiometricUSB} />
                                    </label>
                                    <button
                                        onClick={handleSyncAttendance}
                                        disabled={syncing}
                                        className="bg-white text-amber-500 border-2 border-amber-50 p-2 rounded-2xl hover:bg-amber-50 transition-all flex flex-col items-center justify-center gap-1"
                                        title="Synchronize with Leaves"
                                    >
                                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center">Sync</span>
                                    </button>
                                    {/* Biometric Device Pull Button */}
                                    <button
                                        onClick={handleSyncDevice}
                                        disabled={syncingDevice}
                                        className={`p-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                                            syncingDevice
                                                ? 'bg-purple-50 text-purple-400 border-purple-100 cursor-not-allowed'
                                                : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-100'
                                        }`}
                                        title="Pull latest data from ZKTeco device over LAN"
                                    >
                                        <Tablet size={14} className={syncingDevice ? 'animate-pulse' : ''} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center">
                                            {syncingDevice ? 'Sync...' : 'Device'}
                                        </span>
                                    </button>
                                </div>
                            )}
                            {canManage && activeTab === 'daily' && (
                                <button
                                    onClick={() => setAdding(true)}
                                    className="w-full bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 flex items-center justify-center gap-2 ring-4 ring-blue-50"
                                >
                                    <Plus size={14} />
                                    New Entry
                                </button>
                            )}
                            {activeTab === 'summary' && (
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-slate-900 text-white p-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-auto"
                                >
                                    <Download size={14} />
                                    PDF Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Device Sync Result Toast */}
                {syncResult && (
                    <div
                        className={`mb-4 px-6 py-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300 ${
                            syncResult.success
                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                : 'bg-red-50 border border-red-100 text-red-700'
                        }`}
                        onClick={() => setSyncResult(null)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{syncResult.success ? '✅' : '❌'}</span>
                            <span className="text-sm font-bold">{syncResult.message}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Click to dismiss</span>
                    </div>
                )}

                <div className="bg-white shadow-2xl shadow-slate-200/50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                    {activeTab === 'my' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-100">
                                            {user?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 leading-tight">My Attendance History</h3>
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Personal Records</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last 30 Days</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{myAttendance.length} Entries</p>
                                    </div>
                                </div>
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Punch In/Out</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myAttendance.map(record => (
                                            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col min-w-[60px]">
                                                            <span className="text-xs font-black text-slate-900">{record.clock_in || '--:--'}</span>
                                                            <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 leading-none">Input</span>
                                                            {isLateArrival(record.clock_in) && (
                                                                <span className="text-[10px] font-bold text-red-500 mt-1 leading-none">Late Arrived</span>
                                                            )}
                                                        </div>
                                                        <div className="h-px w-3 bg-slate-200 self-start mt-2"></div>
                                                        <div className="flex flex-col min-w-[60px]">
                                                            <span className="text-xs font-black text-slate-900">{record.clock_out || '--:--'}</span>
                                                            <span className="text-[9px] font-bold text-slate-300 uppercase mt-1 leading-none">Exit</span>
                                                            {isEarlyDeparture(record.clock_out) && (
                                                                <span className="text-[10px] font-bold text-red-500 mt-1 leading-none">Early Departure</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                                        record.status === 'Present' 
                                                            ? (isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out) 
                                                                ? 'bg-red-50 text-red-600 border-red-100' 
                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100')
                                                            : record.status === 'Absent' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                record.status === 'Incomplete' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-xs text-slate-400 italic">
                                                    {/* Keeping this column for general notes now */}
                                                    {record.status === 'Absent' ? 'No punch recorded.' : 'Recorded via ' + record.source}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {myAttendance.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-slate-400 font-bold italic">No personal logs recorded in the last 30 days.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'daily' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source</th>
                                            {canManage && <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>}
                                        </tr>

                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredAttendance.map(record => (
                                            <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xs">
                                                            {record.employee_name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{record.employee_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col min-w-[70px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-black text-slate-900">{record.clock_in || '--:--'}</span>
                                                                {record.raw_clock_in && record.clock_in && record.raw_clock_in !== record.clock_in && (
                                                                    <div title={`Original Biometric: ${record.raw_clock_in}`} className="text-blue-400 cursor-help">
                                                                        <Fingerprint size={12} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1">Input (24H)</span>
                                                            {isLateArrival(record.clock_in) && (
                                                                <span className="text-[10px] font-bold text-red-500 leading-none mt-1">Late Arrived</span>
                                                            )}
                                                        </div>
                                                        <div className="h-px w-4 bg-slate-200 self-start mt-2"></div>
                                                        <div className="flex flex-col min-w-[70px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-black text-slate-900">{record.clock_out || '--:--'}</span>
                                                                {record.raw_clock_out && record.clock_out && record.raw_clock_out !== record.clock_out && (
                                                                    <div title={`Original Biometric: ${record.raw_clock_out}`} className="text-blue-400 cursor-help">
                                                                        <Fingerprint size={12} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1">Exit (24H)</span>
                                                            {isEarlyDeparture(record.clock_out) && (
                                                                <span className="text-[10px] font-bold text-red-500 leading-none mt-1">Early Departure</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 w-fit ${
                                                            record.status === 'Present' 
                                                                ? (isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out)
                                                                    ? 'bg-red-50 text-red-600 border-red-100'
                                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-100/50')
                                                                : record.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    record.status === 'Absent' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                        record.status === 'Incomplete' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                            record.status?.startsWith('Pending') ? 'bg-slate-50 text-slate-500 border-slate-200 border-dashed' :
                                                                                'bg-blue-50 text-blue-600 border-blue-100' // Approved Leave Types
                                                            }`}>
                                                            {record.status}
                                                        </span>
                                                        {record.leave_reclaimed && (
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 animate-pulse">
                                                                <RefreshCw size={10} />
                                                                <span>LEAVE BALANCE RESTORED</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                        <span className="text-xs font-bold text-slate-500">{record.source}</span>
                                                    </div>
                                                </td>
                                                {canManage && (
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => startEditing(record)}
                                                            disabled={record.employee_id === employees.find(e => e.user_id === user.id)?.id}
                                                            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${record.employee_id === employees.find(e => e.user_id === user.id)?.id
                                                                ? 'text-slate-300 cursor-not-allowed'
                                                                : 'text-blue-400 hover:text-blue-600'
                                                                }`}
                                                            title={record.employee_id === employees.find(e => e.user_id === user.id)?.id ? "You cannot adjust your own attendance" : ""}
                                                        >
                                                            Adjust
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {attendance.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-slate-400 font-bold italic">No log entries found for this selection.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'summary' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Present</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Absent</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Incomplete</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Delayed Present</th>
                                            <th className="px-8 py-6 text-center text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">On Leave</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredSummary.map(row => (
                                            <tr key={row.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6 font-bold text-slate-700">{row.name}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-block w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs leading-8">{row.present_days}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-block w-8 h-8 rounded-full bg-red-50 text-red-600 font-black text-xs leading-8">{row.absent_days}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-block w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black text-xs leading-8">{row.incomplete_days || 0}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-block w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-black text-xs leading-8">{row.late_days}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-block w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs leading-8">{row.leave_days}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredSummary.length === 0 && (
                                    <div className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No employees found for this criteria.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'leaves' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Period</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                            {canManage && <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {leaves.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6 font-bold text-slate-700">{req.name}</td>
                                                <td className="px-8 py-6 text-xs text-slate-600">
                                                    {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-6 text-xs font-bold text-blue-500">{req.leave_type}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                            req.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {req.status}
                                                        </span>
                                                        {req.status === 'Pending' && req.user_id === user.id && (
                                                            <span className="text-[9px] font-bold text-slate-400 italic mt-1">This leave must be approved by another HR manager.</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {canManage && (
                                                    <td className="px-8 py-6 text-right space-x-2">
                                                        {req.status === 'Pending' && req.user_id !== user.id && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateLeaveStatus(req.id, 'Approved')}
                                                                    className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateLeaveStatus(req.id, 'Rejected')}
                                                                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-600"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {leaves.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-slate-400 font-bold italic">No coworker leave requests found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {!historyEmpId ? (
                                <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <User size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Select an employee to view history.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-100">
                                                {historyAttendance[0]?.employee_name?.charAt(0) || <Clock size={24} />}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 leading-tight">
                                                    {employees.find(e => e.id.toString() === historyEmpId.toString())?.name || 'Employee'}
                                                </h3>
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Attendance Records Spectrum</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Logs</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{historyAttendance.length}</p>
                                        </div>
                                    </div>
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule (24H)</th>
                                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {historyAttendance.map(record => (
                                                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <span className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-900">{record.clock_in || '--:--'}</span>
                                                                <span className="text-[9px] font-bold text-slate-300 uppercase">Input</span>
                                                            </div>
                                                            <div className="h-px w-3 bg-slate-200"></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-900">{record.clock_out || '--:--'}</span>
                                                                <span className="text-[9px] font-bold text-slate-300 uppercase">Exit</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${
                                                            record.status === 'Present' 
                                                                ? (isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out)
                                                                    ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/30'
                                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/30')
                                                                : record.status === 'Absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    record.status === 'Incomplete' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                        'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                            {record.status}
                                                        </span>
                                                        {(isLateArrival(record.clock_in) || isEarlyDeparture(record.clock_out)) && record.status === 'Present' && (
                                                            <div className="flex flex-wrap gap-1 justify-center">
                                                                {isLateArrival(record.clock_in) && (
                                                                    <span className="text-[7px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 rounded-sm border border-rose-100">Late</span>
                                                                )}
                                                                {isEarlyDeparture(record.clock_out) && (
                                                                    <span className="text-[7px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 rounded-sm border border-rose-100">Early</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-xs text-slate-500 font-medium italic">{record.source}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {historyAttendance.length === 0 && (
                                        <div className="py-20 text-center">
                                            <p className="text-slate-400 font-bold italic">No log entries found for this selection and range.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'devices' && (
                        <div className="p-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {devices.map(dev => (
                                    <div key={dev.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`p-4 rounded-2xl ${dev.status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <Tablet size={24} />
                                                </div>
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${dev.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                    {dev.status}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{dev.device_name}</h3>
                                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                {dev.branch_name || 'Global HQ'}
                                            </p>

                                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-black text-slate-400 uppercase tracking-widest">Address</span>
                                                    <span className="font-bold text-slate-900">{dev.ip_address || 'Cloud Gateway'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
                                                    <span className="font-bold text-slate-600 italic">
                                                        {dev.last_sync ? new Date(dev.last_sync).toLocaleTimeString() : 'Never'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
                                            <button className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest">Logs</button>
                                            <button
                                                onClick={() => deleteDevice(dev.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setAddingDevice(true)}
                                    className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-slate-50 transition-all text-slate-300 hover:text-blue-500 group"
                                >
                                    <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
                                        <Plus size={32} />
                                    </div>
                                    <span className="font-black uppercase text-xs tracking-[0.2em]">Add Device</span>
                                </button>
                            </div>

                            {devices.length === 0 && (
                                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <Tablet size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No devices connected.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            {adding && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white">
                            <h2 className="text-2xl font-black uppercase tracking-widest">Manual Entry</h2>
                            <p className="text-blue-100 font-medium">Manually log attendance for an employee</p>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleAddRecord} className="p-10 space-y-6">
                                <select className="w-full border p-2 rounded" value={newRecord.employee_id} onChange={e => setNewRecord({ ...newRecord, employee_id: e.target.value })} required>
                                    <option value="">Select Employee</option>
                                    {employees
                                        .filter(e => e.user_id !== user.id) // Cannot log for self
                                        .map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                                    }
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock In (24H)</label>
                                        <div className={`flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 shadow-sm group hover:border-blue-300 transition-all ${!newRecord.clock_in ? 'opacity-50' : ''}`}>
                                            <select 
                                                value={newRecord.clock_in ? newRecord.clock_in.split(':')[0] : ''} 
                                                onChange={e => {
                                                    const p = (newRecord.clock_in || '08:00:00').split(':');
                                                    setNewRecord({...newRecord, clock_in: `${e.target.value}:${p[1] || '00'}:${p[2] || '00'}`});
                                                }}
                                                className="bg-transparent border-none font-bold text-base text-slate-700 outline-none cursor-pointer appearance-none"
                                            >
                                                {!newRecord.clock_in && <option value="">--</option>}
                                                {[...Array(24)].map((_, i) => {
                                                    const v = i.toString().padStart(2, '0');
                                                    return <option key={i} value={v}>{v}</option>
                                                })}
                                            </select>
                                            <span className="font-bold text-slate-300">:</span>
                                            <select 
                                                value={newRecord.clock_in ? (newRecord.clock_in.split(':')[1] || '00') : ''} 
                                                onChange={e => {
                                                    const p = (newRecord.clock_in || '08:00:00').split(':');
                                                    setNewRecord({...newRecord, clock_in: `${p[0] || '08'}:${e.target.value}:${p[2] || '00'}`});
                                                }}
                                                className="bg-transparent border-none font-bold text-base text-slate-700 outline-none cursor-pointer appearance-none"
                                            >
                                                {!newRecord.clock_in && <option value="">--</option>}
                                                {[...Array(60)].map((_, i) => {
                                                    const v = i.toString().padStart(2, '0');
                                                    return <option key={i} value={v}>{v}</option>
                                                })}
                                            </select>
                                            <div className="ml-auto text-blue-400 opacity-30">
                                                <Clock size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock Out (24H)</label>
                                        <div className={`flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 shadow-sm group hover:border-blue-300 transition-all ${!newRecord.clock_out ? 'opacity-50' : ''}`}>
                                            <select 
                                                value={newRecord.clock_out ? newRecord.clock_out.split(':')[0] : ''} 
                                                onChange={e => {
                                                    const p = (newRecord.clock_out || '17:00:00').split(':');
                                                    setNewRecord({...newRecord, clock_out: `${e.target.value}:${p[1] || '00'}:${p[2] || '00'}`});
                                                }}
                                                className="bg-transparent border-none font-bold text-base text-slate-700 outline-none cursor-pointer appearance-none"
                                            >
                                                {!newRecord.clock_out && <option value="">--</option>}
                                                {[...Array(24)].map((_, i) => {
                                                    const v = i.toString().padStart(2, '0');
                                                    return <option key={i} value={v}>{v}</option>
                                                })}
                                            </select>
                                            <span className="font-bold text-slate-300">:</span>
                                            <select 
                                                value={newRecord.clock_out ? (newRecord.clock_out.split(':')[1] || '00') : ''} 
                                                onChange={e => {
                                                    const p = (newRecord.clock_out || '17:00:00').split(':');
                                                    setNewRecord({...newRecord, clock_out: `${p[0] || '17'}:${e.target.value}:${p[2] || '00'}`});
                                                }}
                                                className="bg-transparent border-none font-bold text-base text-slate-700 outline-none cursor-pointer appearance-none"
                                            >
                                                {!newRecord.clock_out && <option value="">--</option>}
                                                {[...Array(60)].map((_, i) => {
                                                    const v = i.toString().padStart(2, '0');
                                                    return <option key={i} value={v}>{v}</option>
                                                })}
                                            </select>
                                            <div className="ml-auto text-blue-400 opacity-30">
                                                <Clock size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Save Entry</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {
                addingDevice && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-8 bg-blue-600 text-white">
                                <h2 className="text-2xl font-black uppercase tracking-widest">Register Hardware</h2>
                                <p className="text-blue-100 font-medium">Link new biometric device to the network</p>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <form onSubmit={handleAddDevice} className="p-10 space-y-6">
                                    <input placeholder="Device Name (e.g. Front Gate ZK6)" className="w-full border p-2 rounded" value={newDevice.device_name} onChange={e => setNewDevice({ ...newDevice, device_name: e.target.value })} required />
                                    <input placeholder="Branch / Location" className="w-full border p-2 rounded" value={newDevice.branch_name} onChange={e => setNewDevice({ ...newDevice, branch_name: e.target.value })} required />
                                    <input placeholder="IP Address (Optional)" className="w-full border p-2 rounded" value={newDevice.ip_address} onChange={e => setNewDevice({ ...newDevice, ip_address: e.target.value })} />
                                    <div className="flex gap-2 pt-2">
                                        <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Register & Key</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            

            {
                editing && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                            <div className="p-8 bg-slate-900 text-white relative">
                                <button onClick={() => setEditing(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                                <h2 className="text-2xl font-black uppercase tracking-widest">Adjust Entry</h2>
                                <p className="text-slate-400 font-medium">Correcting logs for {editing.employee_name}</p>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <form onSubmit={handleUpdateRecord} className="p-10 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock In (24H)</label>
                                            <div className={`flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-2 px-4 shadow-sm group hover:border-blue-300 transition-all ${!editing.clock_in ? 'opacity-50' : ''}`}>
                                                <select 
                                                    value={editing.clock_in ? editing.clock_in.split(':')[0] : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_in || '08:00:00').split(':');
                                                        setEditing({...editing, clock_in: `${e.target.value}:${p[1] || '00'}:${p[2] || '00'}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-lg text-slate-700 outline-none cursor-pointer hover:text-blue-600 appearance-none pr-1"
                                                >
                                                    {!editing.clock_in && <option value="">--</option>}
                                                    {[...Array(24)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <span className="font-bold text-slate-300">:</span>
                                                <select 
                                                    value={editing.clock_in ? (editing.clock_in.split(':')[1] || '00') : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_in || '08:00:00').split(':');
                                                        setEditing({...editing, clock_in: `${p[0] || '08'}:${e.target.value}:${p[2] || '00'}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-lg text-slate-700 outline-none cursor-pointer hover:text-blue-600 appearance-none px-1"
                                                >
                                                    {!editing.clock_in && <option value="">--</option>}
                                                    {[...Array(60)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <span className="font-bold text-slate-300">:</span>
                                                <select 
                                                    value={editing.clock_in ? (editing.clock_in.split(':')[2] || '00') : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_in || '08:00:00').split(':');
                                                        setEditing({...editing, clock_in: `${p[0] || '08'}:${p[1] || '00'}:${e.target.value}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-base text-slate-400 outline-none cursor-pointer hover:text-blue-600 appearance-none pl-1"
                                                >
                                                    {!editing.clock_in && <option value="">--</option>}
                                                    {[...Array(60)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <div className="ml-auto flex items-center gap-2">
                                                    {editing.clock_in && (
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setEditing({...editing, clock_in: ''}); }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Clear Time"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    <div className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                                        <Clock size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock Out (24H)</label>
                                            <div className={`flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-2 px-4 shadow-sm group hover:border-blue-300 transition-all ${!editing.clock_out ? 'opacity-50' : ''}`}>
                                                <select 
                                                    value={editing.clock_out ? editing.clock_out.split(':')[0] : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_out || '17:00:00').split(':');
                                                        setEditing({...editing, clock_out: `${e.target.value}:${p[1] || '00'}:${p[2] || '00'}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-lg text-slate-700 outline-none cursor-pointer hover:text-blue-600 appearance-none pr-1"
                                                >
                                                    {!editing.clock_out && <option value="">--</option>}
                                                    {[...Array(24)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <span className="font-bold text-slate-300">:</span>
                                                <select 
                                                    value={editing.clock_out ? (editing.clock_out.split(':')[1] || '00') : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_out || '17:00:00').split(':');
                                                        setEditing({...editing, clock_out: `${p[0] || '17'}:${e.target.value}:${p[2] || '00'}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-lg text-slate-700 outline-none cursor-pointer hover:text-blue-600 appearance-none px-1"
                                                >
                                                    {!editing.clock_out && <option value="">--</option>}
                                                    {[...Array(60)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <span className="font-bold text-slate-300">:</span>
                                                <select 
                                                    value={editing.clock_out ? (editing.clock_out.split(':')[2] || '00') : ''} 
                                                    onChange={e => {
                                                        const p = (editing.clock_out || '17:00:00').split(':');
                                                        setEditing({...editing, clock_out: `${p[0] || '17'}:${p[1] || '00'}:${e.target.value}`});
                                                    }}
                                                    className="bg-transparent border-none font-bold text-base text-slate-400 outline-none cursor-pointer hover:text-blue-600 appearance-none pl-1"
                                                >
                                                    {!editing.clock_out && <option value="">--</option>}
                                                    {[...Array(60)].map((_, i) => {
                                                        const v = i.toString().padStart(2, '0');
                                                        return <option key={i} value={v}>{v}</option>
                                                    })}
                                                </select>
                                                <div className="ml-auto flex items-center gap-2">
                                                    {editing.clock_out && (
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); setEditing({...editing, clock_out: ''}); }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Clear Time"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    <div className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                                        <Clock size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Work Status is now automated based on punch times */}

                                    <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100 font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all mt-4">
                                        Authorize Adjustments
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    </div>
);
    };

export default AttendanceManager;
