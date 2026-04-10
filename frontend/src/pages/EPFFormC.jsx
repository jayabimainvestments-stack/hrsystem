import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EPFFormC = () => {
    const navigate = useNavigate();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/reports/payroll/epf-form-c?month=${month}`);
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
                                EPF <span className="text-primary-500">Official Form C</span>
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
                                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700 transition-all font-sans"
                            >
                                <Printer size={16} /> Print A4 Form
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1000px] mx-auto p-4 md:p-8 print:p-0 mt-4 print:mt-0">
                <div className="bg-white p-10 print:p-6 shadow-2xl print:shadow-none min-h-[1050px] border border-slate-200 print:border-none relative">

                    {/* Top Row: Postage and Form ID */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <div className="border border-black bg-black text-white px-4 py-1.5 text-center text-[11px] font-black tracking-tight">
                                තැපැල් ගාස්තු ගෙවන ලදී M - 13
                            </div>
                            <div className="mt-4 text-[10px] font-bold leading-tight text-slate-700">
                                භාරදිය නොහැකි වුවහොත් ආපසු එවන්න.<br />
                                අධිකාරි, සේවක අර්ථසාධක අරමුදල,<br />
                                ශ්‍රී ලංකා මහ බැංකුව, තැ.පෙ. 1299, කොළඹ.
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-start gap-3">
                                <div className="text-[11px] font-bold text-right leading-tight pr-1 pt-1">
                                    වාර්තාව<br />படிவம்<br />FORM
                                </div>
                                <div className="border-2 border-black rounded-full w-12 h-12 flex items-center justify-center text-3xl font-black">
                                    C
                                </div>
                                <div className="text-[9px] font-bold text-left leading-tight pt-1 pl-1">
                                    1958 අංක 15 දරණ සේ.අ.අ පනත<br />
                                    ஊ. சே. நி. 1958 - 15ம் பிரிவின்படி<br />
                                    EPF Act No. 15 of 1958
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header Detail Box */}
                    <div className="flex justify-end mb-4">
                        <div className="w-[420px] border border-slate-800 border-collapse">
                            <div className="border-b border-slate-800 p-1.5 flex justify-between items-center bg-slate-50">
                                <span className="text-[9px] font-black leading-tight max-w-[250px]">සේ.අ.අ. සේව්‍ය අංකය / ஊ.සේ.නි பதிவிலக்கம் / E.P.F. Registration No.</span>
                                <span className="text-lg font-black border-l border-slate-800 pl-4 h-8 flex items-center tracking-widest leading-none">65432 / B</span>
                            </div>
                            <div className="border-b border-slate-800 p-1.5 flex justify-between items-center">
                                <span className="text-[9px] font-black leading-tight max-w-[250px]">දායක මුදල් අදාල වර්ෂය සහ මාසය / மாதமும் வருடமும் / Month and Year</span>
                                <span className="text-lg font-black border-l border-slate-800 pl-4 h-8 flex items-center tabular-nums leading-none">{mm} / {yyyy}</span>
                            </div>
                            <div className="flex text-[9px] font-bold h-14">
                                <div className="w-1/2 border-r border-slate-800 p-1.5 flex flex-col justify-between">
                                    <span className="font-black text-slate-600">දායක මුදල් / Contributions</span>
                                    <span className="text-base font-black text-right pr-1 tabular-nums leading-none">
                                        {data?.data.reduce((acc, r) => acc + r.total_20, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="w-1/2 p-1.5 flex flex-col justify-between">
                                    <span className="font-black text-slate-600">දඩ මුදල් / Surcharges</span>
                                    <span className="text-base font-black text-right pr-1 tabular-nums leading-none">0.00</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-800 p-1.5 flex justify-between items-center bg-slate-100">
                                <span className="text-[10px] font-black uppercase">මුළු ගෙවීම / Total Remittance</span>
                                <span className="text-xl font-black underline decoration-double tabular-nums leading-none">
                                    {data?.data.reduce((acc, r) => acc + r.total_20, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-[9px] font-bold mb-3 uppercase border-y border-slate-200 py-1 text-slate-600">
                        මෙම වාර්තාව නිසි ලෙස පුරවා දායක මුදල් සමඟ සේවක අර්ථසාධක අරමුදලේ අධිකාරි වෙත එවිය යුතුය. / FORM SHOULD BE RETURNED DULY COMPLETED
                    </div>

                    {/* Main Table: Full words in headers */}
                    <table className="w-full border-collapse border border-slate-800 text-[10px]">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-50 italic">
                                <th className="border-r border-slate-800 px-1 py-2 w-40 align-top text-left font-black leading-tight">
                                    Employee's Name
                                </th>
                                <th className="border-r border-slate-800 px-1 py-2 w-28 align-top font-black leading-tight">
                                    NIC Number
                                </th>
                                <th className="border-r border-slate-800 px-1 py-2 w-16 align-top font-black leading-tight">
                                    Member Number
                                </th>
                                <th className="border-r border-slate-800 px-0 py-0 align-top">
                                    <div className="border-b border-slate-800 p-1 text-center font-black">Contributions (Rs.)</div>
                                    <div className="flex font-black text-[8px]">
                                        <div className="w-1/3 border-r border-slate-800 p-1 text-center">Total</div>
                                        <div className="w-1/3 border-r border-slate-800 p-1 text-center uppercase">Employer</div>
                                        <div className="w-1/3 p-1 text-center uppercase">Employee</div>
                                    </div>
                                </th>
                                <th className="px-1 py-2 w-28 align-top text-right font-black leading-tight">
                                    Gross Wages (Rs.)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-[13px]">
                            {data?.data.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-400 h-9">
                                    <td className="border-r border-slate-800 px-2 uppercase leading-snug font-serif text-[11px] font-bold">{row.name}</td>
                                    <td className="border-r border-slate-800 px-1 text-center tracking-tighter text-[11px]">{row.nic || '---------'}</td>
                                    <td className="border-r border-slate-800 px-1 text-center font-black">{row.member_no}</td>
                                    <td className="border-r border-slate-800 px-0 py-0">
                                        <div className="flex h-full font-black">
                                            <div className="w-1/3 border-r border-slate-400 px-1 py-2 text-right bg-slate-50/50">{row.total_20.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <div className="w-1/3 border-r border-slate-400 px-1 py-2 text-right">{row.employer_12.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <div className="w-1/3 px-1 py-2 text-right font-bold text-slate-700">{row.employee_8.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                    </td>
                                    <td className="px-1.5 text-right tabular-nums">{row.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {[...Array(Math.max(0, 16 - (data?.data.length || 0)))].map((_, i) => (
                                <tr key={`empty-${i}`} className="border-b border-slate-400 h-9">
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800"></td>
                                    <td className="border-r border-slate-800 px-0">
                                        <div className="flex h-full">
                                            <div className="w-1/3 border-r border-slate-400"></div>
                                            <div className="w-1/3 border-r border-slate-400"></div>
                                            <div className="w-1/3"></div>
                                        </div>
                                    </td>
                                    <td></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 border-t border-slate-800 font-black text-[12px]">
                                <td colSpan="3" className="border-r border-slate-800 px-4 py-3 text-right uppercase italic text-slate-700">
                                    Grand Total Remittance
                                </td>
                                <td className="border-r border-slate-800 px-0 py-0 font-mono text-[14px]">
                                    <div className="flex h-full">
                                        <div className="w-1/3 border-r border-slate-800 px-1 py-3 text-right bg-slate-200">
                                            {data?.data.reduce((acc, r) => acc + r.total_20, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="w-1/3 border-r border-slate-800 px-1 py-3 text-right">
                                            {data?.data.reduce((acc, r) => acc + r.employer_12, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="w-1/3 px-1 py-3 text-right">
                                            {data?.data.reduce((acc, r) => acc + r.employee_8, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-1.5 text-right underline decoration-double text-[14px] font-mono leading-none">
                                    {data?.data.reduce((acc, r) => acc + r.earnings, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Footer: Compact Contact Fields */}
                    <div className="mt-6 flex justify-between items-end">
                        <div className="w-1/2 space-y-3">
                            <div className="text-[9px] font-bold leading-tight text-slate-700">
                                ඉහත සඳහන් විස්තර නිවැරදි බව සහතික කරමි. / I certify correctness.
                            </div>
                            <div className="pt-6 border-t border-slate-400 w-60 text-center">
                                <p className="text-[10px] font-black uppercase tracking-tighter">Signature of Employer</p>
                                <p className="text-[8px] mt-0.5">Tel: .................................</p>
                            </div>
                        </div>
                        <div className="text-right text-[8px] font-bold text-slate-400 italic">
                            Official Replica | Single-Page Submission
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @media print {
                    @page { size: portrait; margin: 8mm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    .print:hidden { display: none !important; }
                    table, th, td, div { border-collapse: collapse !important; }
                    * { border-color: #475569 !important; }
                    .border-slate-800 { border-color: #1e293b !important; }
                    .bg-black { background-color: black !important; }
                }
            `}</style>
        </div>
    );
};

export default EPFFormC;
