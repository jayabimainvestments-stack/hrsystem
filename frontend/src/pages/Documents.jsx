import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../services/api';
import { FileText, Search, Plus, Filter, Download, Trash2, Shield, Upload, X, History, FileCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [search, setSearch] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/documents');
            const data = Array.isArray(res.data) ? res.data : (res.data.rows || []);
            setDocuments(data);
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
            await api.post('/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Document uploaded successfully');
            setTitle(''); setFile(null); setShowUpload(false);
            fetchDocuments();
        } catch (error) {
            alert('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.delete(`/documents/${id}`);
            fetchDocuments();
        } catch (error) {
            alert('Failed to delete document');
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.employee_name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Shield className="text-blue-600" size={32} /> Document Hub
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">Manage and access company documents securely</p>
                    </div>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Upload Document
                    </button>
                </div>

                {/* Subheader Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><FileText size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Documents</p>
                            <p className="text-2xl font-black">{documents.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><FileCheck size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Legally Verified</p>
                            <p className="text-2xl font-black">100%</p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-900 flex items-center px-8 text-white">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Secure Storage</p>
                                <p className="text-2xl font-black uppercase tracking-widest">Encrypted</p>
                            </div>
                            <Shield className="absolute right-8 text-white/10" size={64} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-10">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-16 pr-6 py-4 font-bold text-lg focus:ring-2 ring-blue-500/20"
                            placeholder="Search documents by title or owner..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="group bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-6">
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="p-5 bg-blue-50 text-blue-600 rounded-[2rem] w-fit mb-8">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 truncate pr-10 tracking-tight">{doc.title}</h3>
                            <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> {doc.employee_name || 'Global'}
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-8 border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                    <History size={10} /> {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                                <a
                                    href={`${BASE_URL}${doc.file_path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                                >
                                    <Download size={18} />
                                </a>
                            </div>
                        </div>
                    ))}
                    {filteredDocs.length === 0 && (
                        <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-100 rounded-[4rem]">
                            <FileText className="mx-auto text-slate-100 mb-6" size={80} />
                            <p className="text-slate-400 font-black text-xl tracking-widest uppercase">No Documents Found</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-10 bg-blue-600 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-widest leading-none mb-2">Upload Document</h2>
                                <p className="text-blue-200 font-bold uppercase tracking-widest text-[10px]">Secure Document Management</p>
                            </div>
                            <button onClick={() => setShowUpload(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleUpload} className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Title</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 font-bold text-lg focus:ring-2 ring-blue-500/20"
                                    placeholder="e.g. Annual Strategy Report"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File Selection</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] p-16 text-center group-hover:border-blue-300 transition-all">
                                        <Upload className="mx-auto text-slate-200 mb-4 group-hover:text-blue-400 transition-colors" size={48} />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{file ? file.name : 'Drop file here'}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                className={`w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-100 flex items-center justify-center gap-4 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:-translate-y-1'}`}
                            >
                                {uploading ? 'Uploading...' : (
                                    <>
                                        <Shield size={20} /> Save to Records
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
