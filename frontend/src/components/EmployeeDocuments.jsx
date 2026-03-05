import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../services/api';
import { FileText, Download, Trash2, Upload, X, Shield, History, Plus } from 'lucide-react';

const EmployeeDocuments = ({ employeeId }) => {
    const [documents, setDocuments] = useState([]);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    useEffect(() => {
        fetchDocs();
    }, [employeeId]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/documents/employee/${employeeId}`);
            setDocuments(res.data);
        } catch (error) {
            console.error("Error fetching documents", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title) return;

        const formData = new FormData();
        formData.append('document', file);
        formData.append('title', title);

        setUploading(true);
        try {
            await api.post(`/documents/employee/${employeeId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Document saved successfully');
            setTitle('');
            setFile(null);
            setShowUpload(false);
            fetchDocs();
        } catch (error) {
            alert('Failed to save document');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.delete(`/documents/${id}`);
            fetchDocs();
        } catch (error) {
            alert('Action blocked');
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 italic">Loading documents...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Shield className="text-blue-600" size={32} /> Document Hub
                    </h3>
                    <p className="text-slate-500 font-medium tracking-tight">Secure storage for employee files and contracts</p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                    <Upload size={18} /> Upload Document
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(doc => (
                    <div key={doc.id} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-4">
                            <button
                                onClick={() => handleDelete(doc.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-6">
                            <FileText size={24} />
                        </div>
                        <h4 className="font-black text-slate-900 mb-1 truncate pr-8">{doc.title}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-1">
                            <History size={10} /> Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        <a
                            href={`${BASE_URL}${doc.file_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-all underline decoration-2 underline-offset-4"
                        >
                            <Download size={14} /> Download
                        </a>
                    </div>
                ))}

                {documents.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No documents found.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-widest leading-none mb-1">Upload Document</h2>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Document Management System</p>
                            </div>
                            <button onClick={() => setShowUpload(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Title</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm"
                                    placeholder="e.g. Identity Document / NIC Scan"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source File</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center group-hover:border-blue-300 transition-all">
                                        <Plus className="mx-auto text-slate-300 mb-2 group-hover:text-blue-400" size={32} />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tight truncate px-4">
                                            {file ? file.name : 'Select or drop file here'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                className={`w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 flex items-center justify-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 transition-all'}`}
                            >
                                {uploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDocuments;
