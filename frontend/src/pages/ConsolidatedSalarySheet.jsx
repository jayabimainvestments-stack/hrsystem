import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { FileText, Download, Calendar, ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConsolidatedSalarySheet = () => {
    const navigate = useNavigate();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalGross: 0, totalNet: 0, totalEpf8: 0, totalEpf12: 0, totalEtf3: 0 });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/reports/payroll/consolidated?month=${month}`);
            setData(response.data.data);
            calculateStats(response.data.data);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (records) => {
        const s = records.reduce((acc, r) => ({
            totalGross: acc.totalGross + r.gross_pay,
            totalNet: acc.totalNet + r.net_pay,
            totalEpf8: acc.totalEpf8 + (r.deductions['EPF (Employee 8%)'] || r.deductions['EPF 8%'] || 0),
            totalEpf12: acc.totalEpf12 + r.employer_contributions.epf_12,
            totalEtf3: acc.totalEtf3 + r.employer_contributions.etf_3
        }), { totalGross: 0, totalNet: 0, totalEpf8: 0, totalEpf12: 0, totalEtf3: 0 });
        setStats(s);
    };

    useEffect(() => {
        fetchReport();
    }, [month]);

    const handlePrint = () => {
        window.print();
    };

    const getAddition = (row, name) => row.additions[name] || 0;
    const getDeduction = (row, name) => row.deductions[name] || 0;

    return (
        <div className="min-h-screen bg-slate-50 font-sans print:bg-white">
            <div className="print:hidden">
                <Navbar />
                <div className="bg-slate-900 pt-20 pb-16 px-6">
                    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/payroll')}
                                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                            >
                                <ArrowLeft size={14} /> Back to Payroll
                            </button>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                                Consolidated <span className="text-primary-500">Salary Sheet</span>
                            </h1>
                            <p className="text-slate-400 text-sm font-medium">Detailed monthly payroll breakdown and statutory summary.</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-3 px-4">
                                <Calendar size={18} className="text-primary-500" />
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="bg-transparent border-none text-white font-black text-sm outline-none focus:ring-0 cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={handlePrint}
                                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary-500 hover:text-white transition-all shadow-xl shadow-black/20"
                            >
                                <Printer size={16} /> Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto p-4 md:p-8 -mt-8 print:mt-0 print:p-0">
                <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                    {/* Header in Print */}
                    <div className="hidden print:block p-8 border-b-2 border-slate-900 mb-8">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tight">JAYABIMA INVESTMENTS (PVT) LTD.</h1>
                                <p className="text-sm font-bold text-slate-600">Dambulla</p>
                                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">CONSOLIDATED SALARY SHEET - {month}</p>
                            </div>
                            <div className="text-right text-xs font-mono text-slate-400">
                                Generated: {new Date().toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full border-collapse border border-slate-300 text-[10px] print:text-[8px]">
                            <thead className="bg-slate-50 text-slate-900 uppercase font-black tracking-wider text-center">
                                <tr>
                                    <th rowSpan="2" className="border border-slate-300 px-2 py-3 w-8">EPF</th>
                                    <th rowSpan="2" className="border border-slate-300 px-4 py-3 min-w-[200px] text-left">Name</th>
                                    <th colSpan="3" className="border border-slate-300 px-2 py-2 bg-slate-100">Consolidated Salary</th>
                                    <th rowSpan="2" className="border border-slate-300 px-2 py-3 bg-slate-200 w-24">Gross Pay</th>
                                    <th colSpan="6" className="border border-slate-300 px-2 py-2 bg-rose-50/50">Deductions</th>
                                    <th rowSpan="2" className="border border-slate-300 px-2 py-3 bg-emerald-50 w-24">Net Pay</th>
                                    <th colSpan="3" className="border border-slate-300 px-2 py-2 bg-indigo-50/50">Employer Dues</th>
                                    <th rowSpan="2" className="border border-slate-300 px-4 py-3 min-w-[120px]">Signature</th>
                                </tr>
                                <tr className="text-[9px] print:text-[7px]">
                                    <th className="border border-slate-300 px-2 py-2 w-20">Basic Salary</th>
                                    <th className="border border-slate-300 px-2 py-2 w-20">Allowances</th>
                                    <th className="border border-slate-300 px-2 py-2 w-20">Total</th>

                                    <th className="border border-slate-300 px-2 py-2 w-16">EPF 8%</th>
                                    <th className="border border-slate-300 px-2 py-2 w-16">Advance</th>
                                    <th className="border border-slate-300 px-2 py-2 w-16">No Pay</th>
                                    <th className="border border-slate-300 px-2 py-2 w-16">Welfare 2%</th>
                                    <th className="border border-slate-300 px-2 py-2 w-16">Loan</th>
                                    <th className="border border-slate-300 px-2 py-2 w-20 bg-rose-100/30">Total Ded.</th>

                                    <th className="border border-slate-300 px-2 py-2 w-16">EPF 12%</th>
                                    <th className="border border-slate-300 px-2 py-2 w-16">ETF 3%</th>
                                    <th className="border border-slate-300 px-2 py-2 w-20 bg-indigo-100/30">Total Due</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold text-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="16" className="py-20 text-center border border-slate-300">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                                                <p className="text-xs uppercase tracking-widest text-slate-400 font-black">Assembling Data Matrix...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan="16" className="py-20 text-center border border-slate-300 text-slate-400 italic">
                                            No approved payroll records found for this period.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.map((row) => (
                                            <tr key={row.idx} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                                                <td className="border border-slate-300 px-2 py-2 text-center text-slate-400">{row.idx}</td>
                                                <td className="border border-slate-300 px-4 py-2">
                                                    <div className="uppercase tracking-tight leading-tight">{row.name}</div>
                                                    <div className="text-[8px] text-slate-400 mt-1 flex gap-2">
                                                        <span>NIC: {row.nic || 'N/A'}</span>
                                                        <span>A/C: {row.account_no || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{row.consolidated.basic.toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{row.consolidated.allowance.toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums bg-slate-50 font-black">{row.gross_pay.toLocaleString()}</td>

                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums bg-slate-100/50 font-black text-slate-900">{row.gross_pay.toLocaleString()}</td>

                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{(getDeduction(row, 'EPF (Employee 8%)') || getDeduction(row, 'EPF 8%') || 0).toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{(getDeduction(row, 'SALARY ADVANCE') || getDeduction(row, 'Salary Advance and Others') || 0).toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{getDeduction(row, 'No Pay').toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{getDeduction(row, 'Welfare 2%').toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums text-rose-600">{(Object.keys(row.deductions).reduce((sum, k) => k.toLowerCase().includes('loan') ? sum + row.deductions[k] : sum, 0)).toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums bg-rose-50/50 font-black">{(row.gross_pay - row.net_pay).toLocaleString()}</td>

                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums bg-emerald-50/50 text-emerald-700 font-black text-base">{row.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>

                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{row.employer_contributions.epf_12.toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums">{row.employer_contributions.etf_3.toLocaleString()}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-right tabular-nums bg-indigo-50 font-black">{(row.employer_contributions.epf_12 + row.employer_contributions.etf_3).toLocaleString()}</td>
                                                <td className="border border-slate-300 px-4 py-2 italic text-slate-300 font-normal">........................</td>
                                            </tr>
                                        ))}

                                        {/* TOTALS ROW */}
                                        <tr className="bg-slate-900 text-white font-black uppercase text-[11px] print:text-[8px]">
                                            <td colSpan="2" className="border border-slate-800 px-6 py-4 text-center">TOTAL SALARY DETAILS</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + r.consolidated.basic, 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + r.consolidated.allowance, 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + r.gross_pay, 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums bg-primary-600">{stats.totalGross.toLocaleString()}</td>

                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{stats.totalEpf8.toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + (getDeduction(r, 'SALARY ADVANCE') || getDeduction(r, 'Salary Advance and Others') || 0), 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + getDeduction(r, 'No Pay'), 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + getDeduction(r, 'Welfare 2%'), 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{(data.reduce((sum, r) => sum + Object.keys(r.deductions).reduce((s, k) => k.toLowerCase().includes('loan') ? s + r.deductions[k] : s, 0), 0)).toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums bg-rose-600">{(stats.totalGross - stats.totalNet).toLocaleString()}</td>

                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums bg-emerald-600 text-lg">{stats.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>

                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{stats.totalEpf12.toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums">{stats.totalEtf3.toLocaleString()}</td>
                                            <td className="border border-slate-800 px-2 py-4 text-right tabular-nums bg-indigo-600">{(stats.totalEpf12 + stats.totalEtf3).toLocaleString()}</td>
                                            <td className="border border-slate-800 bg-white"></td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-12 print:mt-16 bg-white">
                        <div className="grid grid-cols-3 gap-12 text-center">
                            <div className="space-y-12">
                                <div className="border-t-2 border-slate-900 pt-4 font-black uppercase tracking-widest text-[10px]">Prepared By</div>
                                <div className="text-[10px] text-slate-400 font-bold tracking-widest leading-relaxed">HR Executive</div>
                            </div>
                            <div className="space-y-12">
                                <div className="border-t-2 border-slate-900 pt-4 font-black uppercase tracking-widest text-[10px]">Checked By</div>
                                <div className="text-[10px] text-slate-400 font-bold tracking-widest leading-relaxed">Accountant / GM</div>
                            </div>
                            <div className="space-y-12">
                                <div className="border-t-2 border-slate-900 pt-4 font-black uppercase tracking-widest text-[10px]">Approved By</div>
                                <div className="text-[10px] text-slate-400 font-bold tracking-widest leading-relaxed">Managing Director</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; background: white !important; }
                    .print-hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default ConsolidatedSalarySheet;
