import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import axios from 'axios';

const DataImporter = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null); // 'idle', 'success', 'error'
    const [previewData, setPreviewData] = useState(null);
    
    const fileInputRef = useRef(null);
    const API_BASE = 'http://localhost:5001/api';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) validateAndSetFile(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) validateAndSetFile(droppedFile);
    };

    const validateAndSetFile = (f) => {
        setStatus('idle');
        setPreviewData(null);
        // Basic validation for Excel files
        if (f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls')) {
            setFile(f);
        } else {
            alert('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_BASE}/sync/excel`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setStatus('success');
            setPreviewData(response.data);
            setFile(null); // Clear the file after success
            
            if(fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-bold">Data Synchronization Engine</h2>
                <p className="text-gray-400 mt-2">Upload your exported reports from the legacy JSP system to generate real-time analytics.</p>
            </div>

            {/* Drag & Drop Zone */}
            <div 
                className={`glass-card border-2 border-dashed transition-all p-12 text-center group cursor-pointer
                    ${file ? 'border-brand-accent bg-brand-accent/5' : 'border-white/10 hover:border-brand-accent/50 hover:bg-white/5'}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileChange}
                />
                
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={`p-4 rounded-full transition-colors ${file ? 'bg-brand-accent text-white' : 'bg-white/5 text-gray-400 group-hover:text-brand-accent group-hover:bg-brand-accent/10'}`}>
                        {file ? <FileSpreadsheet size={48} strokeWidth={1.5} /> : <UploadCloud size={48} strokeWidth={1.5} />}
                    </div>
                    
                    {file ? (
                        <div>
                            <p className="text-xl font-bold">{file.name}</p>
                            <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(2)} KB • Ready to sync</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xl font-bold">Drag & Drop your Excel file here</p>
                            <p className="text-sm text-gray-400 mt-1">or click to browse from your computer</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Controls */}
            <div className="flex justify-center">
                <button 
                    onClick={handleUpload} 
                    disabled={!file || uploading}
                    className={`flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg transition-all
                        ${file && !uploading 
                            ? 'bg-brand-accent hover:bg-blue-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] active:scale-95' 
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }
                    `}
                >
                    {uploading ? (
                        <><Loader2 className="animate-spin" size={24} /> Processing Data...</>
                    ) : (
                        <><UploadCloud size={24} /> Sync to Dashboard</>
                    )}
                </button>
            </div>

            {/* Status Messages */}
            {status === 'success' && previewData && (
                <div className="glass-card bg-green-500/10 border border-green-500/20 text-center animate-in zoom-in-95 duration-300">
                    <div className="flex justify-center mb-2 text-green-400">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Synchronization Successful!</h3>
                    <p className="text-green-300/80 mb-6 font-mono text-sm">Successfully parsed {previewData.recordsProcessed} records.</p>
                    
                    {/* Preview Table */}
                    <div className="overflow-x-auto text-left rounded-xl bg-black/20 border border-white/5">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest border-b border-white/10">
                                <tr>
                                    {previewData.sampleData.length > 0 && Object.keys(previewData.sampleData[0]).slice(0, 5).map(k => (
                                        <th key={k} className="px-4 py-3 font-semibold">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {previewData.sampleData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                        {Object.values(row).slice(0, 5).map((val, vIdx) => (
                                            <td key={vIdx} className="px-4 py-3 text-gray-300 truncate max-w-[150px]">{String(val)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="glass-card bg-red-500/10 border border-red-500/20 text-center flex flex-col items-center">
                    <AlertCircle size={40} className="text-red-400 mb-2" />
                    <h3 className="text-xl font-bold text-white mb-1">Sync Failed</h3>
                    <p className="text-red-300/80">There was an error processing the Excel file. Please ensure it matches the standard format.</p>
                </div>
            )}
        </div>
    );
};

export default DataImporter;
