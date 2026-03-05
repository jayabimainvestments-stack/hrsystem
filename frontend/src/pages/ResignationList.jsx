import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { FileText, Clock, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';

const ResignationList = () => {
    const [resignations, setResignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchResignations();
    }, []);

    const fetchResignations = async () => {
        try {
            const res = await api.get('/resignations');
            setResignations(res.data);
        } catch (error) {
            console.error("Error fetching resignations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status} this resignation?`)) return;

        try {
            await api.put(`/resignations/${id}`, { status });
            fetchResignations();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="py-10 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Resignations</h1>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <ul className="divide-y divide-gray-200">
                            {resignations.length === 0 ? (
                                <li className="px-4 py-4 text-gray-500">No resignation records found.</li>
                            ) : (
                                resignations.map((res) => (
                                    <li key={res.id} className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="truncate">
                                                <div className="flex text-sm">
                                                    <p className="font-medium text-blue-600 truncate">{res.name}</p>
                                                    <p className="ml-1 flex-shrink-0 font-normal text-gray-500">({res.email})</p>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <span className="truncate">Last Day: {new Date(res.desired_last_day).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${res.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                        res.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                    {res.status}
                                                </span>

                                                {(user.role === 'Admin' || user.role === 'HR Manager') && res.status === 'Pending' && (
                                                    <button
                                                        onClick={() => window.location.href = '/governance'}
                                                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        Manage in Governance <ChevronRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                            <span className="font-medium">Reason:</span> {res.reason}
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResignationList;
