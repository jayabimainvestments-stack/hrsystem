import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ETFFormR4 = () => {
    const navigate = useNavigate();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/reports/payroll/etf-form-r4?month=${month}`);
            setData(response.data);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [month]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    const [yyyy, mm] = month.split('-');

    return (
        <div className="min-h-screen bg-[#f1f5f9] print:bg-white pb-20 font-serif overflow-x-auto text-black">
            <div className="print:hidden">
                <Navbar />
                <div className="bg-slate-900 pt-20 pb-10 px-6">
                    <div className="max-w-[1000px] mx-auto flex justify-between items-end">
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/payroll')}
                                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase font-sans"
                            >
                                <ArrowLeft size={14} /> Back to Payroll
                            </button>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter font-sans">
                                ETF <span className="text-indigo-400">Official Form R4</span>
                            </h1>
                            <p className="text-slate-400 text-sm font-sans">Thin-Line A4 Optimized Replica</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="bg-transparent border-none text-white font-bold outline-none focus:ring-0 cursor-pointer px-4 font-sans"
                            />
                            <button
                                onClick={handlePrint}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all font-sans"
                            >
                                <Printer size={16} /> Print R4 Form
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1000px] mx-auto p-4 md:p-12 print:p-0 mt-4 print:mt-0">
                <div className="bg-white p-12 print:p-6 border border-slate-200 shadow-2xl print:shadow-none min-h-[1100px] relative">

                    {/* Header: Trilingual ETF Board Title */}
                    <div className="text-center mb-6 border-b-2 border-slate-800 pb-5">
                        <h2 className="text-lg font-black uppercase leading-tight text-slate-700">සේවක භාරකාර අරමුදල් මණ්ඩලය</h2>
                        <h2 className="text-2xl font-black uppercase tracking-tight">EMPLOYEES' TRUST FUND BOARD</h2>

                        <div className="mt-4 inline-block border border-black px-10 py-1.5">
                            <h3 className="text-xl font-black">FORM R4</h3>
                            <p className="text-[9px] font-bold uppercase mt-1">REMITTANCE ADVICE</p>
                        </div>
                    </div>

                    {/* Employer Info Section */}
                    <div className="flex justify-between gap-10 mb-6 text-[11px] font-bold">
                        <div className="w-1/2 space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="uppercase text-[9px] font-black text-slate-500">Employer's Name and Address:</span>
                                <div className="border border-slate-800 border-collapse p-3 h-32 uppercase text-xs font-black leading-relaxed">
                                    {data?.employer_name}<br />
                                    MAIN STREET,<br />
                                    DAMBULLA.
                                </div>
                            </div>
                        </div>
                        <div className="w-1/2 flex flex-col items-end space-y-2">
                            <div className="flex justify-between items-center w-full border-b border-slate-800 pb-1">
                                <span className="uppercase text-[9px] font-black text-slate-500">Reg No:</span>
                                <span className="text-xl font-black tracking-widest leading-none">C / 65432 / B</span>
                            </div>
                            <div className="flex justify-between items-center w-full border-b border-slate-800 pb-1">
                                <span className="uppercase text-[9px] font-black text-slate-500">Month & Year:</span>
                                <div className="flex gap-2">
                                    <span className="border border-slate-800 px-3 py-0.5 bg-slate-50 text-lg font-black tabular-nums leading-none">{mm}</span>
                                    <span className="border border-slate-800 px-5 py-0.5 text-lg font-black tabular-nums leading-none">{yyyy}</span>
                                </div>
                            </div>
                            <div className="border-2 border-slate-800 p-3 w-full bg-slate-100 mt-2">
                                <p className="text-[10px] font-black uppercase border-b border-slate-400 mb-1.5 pb-0.5 text-center text-slate-600">Total Remittance (3%)</p>
                                <p className="text-2xl font-black text-center tabular-nums underline decoration-double leading-none">
                                    Rs. {data?.data.reduce((acc, r) => acc + r.contribution_3, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-slate-800 text-[10px] font-bold">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-50 italic">
                                <th className="border-r border-slate-800 px-1 py-2 w-44 align-top text-left">
                                    Full Name of Member
                                </th>
                                <th className="border-r border-slate-800 px-1 py-2 w-20 align-top text-center">
                                    Member Number
                                </th>
                                <th className="border-r border-slate-800 px-1 py-2 w-32 align-top text-center">
                                    NIC Number
                                </th>
                                <th className="border-r border-slate-800 px-1 py-2 w-32 align-top text-right">
                                    Gross Wages (Rs.)
                                </th>
                                <th className="px-1 py-2 w-32 align-top text-right">
                                    Contribution (3%)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-[13px]">
                            {data?.data.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-400 h-9">
                                    <td className="border-r border-slate-800 px-2 uppercase leading-snug py-1.5 font-serif text-[11px] font-black">{row.name}</td>
                                    <td className="border-r border-slate-800 px-1 text-center font-black">{row.member_no}</td>
                                    <td className="border-r border-slate-800 px-1 text-center tracking-tighter text-[11px]">{row.nic || '---------'}</td>
                                    <td className="border-r border-slate-800 px-2 text-right tabular-nums">{row.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-2 text-right font-black bg-slate-50/50">{row.contribution_3.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {[...Array(Math.max(0, 14 - (data?.data.length || 0)))].map((_, i) => (
                                <tr key={i} className="border-b border-slate-400 h-9">
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800"></td>
                                    <td></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 border-t border-slate-800 font-black text-sm">
                                <td colSpan="3" className="border-r border-slate-800 px-6 py-4 text-left font-black uppercase text-[12px] font-serif italic text-slate-700">
                                    Grand Total Remittance
                                </td>
                                <td className="border-r border-slate-800 px-2 py-4 text-right tabular-nums font-black text-[15px] leading-none">
                                    {data?.data.reduce((acc, r) => acc + r.earnings, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-4 text-right tabular-nums font-black text-xl underline decoration-double leading-none">
                                    {data?.data.reduce((acc, r) => acc + r.contribution_3, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-8 flex justify-between gap-12">
                        <div className="w-1/2 space-y-6">
                            <p className="text-[10px] font-bold leading-relaxed text-slate-800">
                                I certify that the information given above is correct and that no part of the contribution has been deducted from the earnings of the employees.
                            </p>
                            <div className="pt-8 border-t border-slate-400 w-64 text-center">
                                <p className="text-[10px] font-black uppercase">Signature of Employer</p>
                            </div>
                        </div>
                        <div className="w-1/2 flex flex-col items-end space-y-2 text-[10px] font-bold py-4">
                            <div className="flex justify-between w-full border-b border-slate-400 pb-1">
                                <span>Date:</span>
                                <span>..... / ..... / {yyyy}</span>
                            </div>
                            <div className="flex justify-between w-full border-b border-slate-400 pb-1">
                                <span>Tel:</span>
                                <span>066 1234567</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 pt-3">
                        Official Replica | Single-Page Submission
                    </div>
                </div>
            </main>

            <style>{`
                @media print {
                    @page { size: portrait; margin: 10mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    .print:hidden { display: none !important; }
                    table, th, td, div { border-collapse: collapse !important; }
                    * { border-color: #475569 !important; }
                    .border-slate-800 { border-color: #1e293b !important; }
                }
            `}</style>
        </div>
    );
};

export default ETFFormR4;
