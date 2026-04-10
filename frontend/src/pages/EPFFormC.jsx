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
    
    // Split records into pages (max 15 records per page, standard for EPF C Form)
    const records = data?.data || [];
    const CHUNK_SIZE = 15; 
    const pages = [];
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        pages.push(records.slice(i, i + CHUNK_SIZE));
    }
    if (pages.length === 0) pages.push([]);

    return (
        <div className="min-h-screen bg-[#f1f5f9] print:bg-white pb-20 font-serif overflow-x-auto text-black">
            <div className="print:hidden relative z-50">
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
                            <p className="text-slate-400 text-sm font-sans">Exact Background Overlay Printout</p>
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
                                <Printer size={16} /> Print Official Form
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1000px] mx-auto mt-8 flex flex-col items-center gap-12 print:gap-0 print:mt-0">
                {pages.map((pageRecords, pageIndex) => {
                    // Calculate Page Totals
                    const pageTotal20 = pageRecords.reduce((acc, r) => acc + (r.total_20 || 0), 0);
                    const pageEmployer12 = pageRecords.reduce((acc, r) => acc + (r.employer_12 || 0), 0);
                    const pageEmployee8 = pageRecords.reduce((acc, r) => acc + (r.employee_8 || 0), 0);
                    const pageEarnings = pageRecords.reduce((acc, r) => acc + (r.earnings || 0), 0);

                    // Check if last page to show Grand Total at Top Box
                    const isLastPage = pageIndex === pages.length - 1;
                    const grandTotalRemittance = records.reduce((acc, r) => acc + (r.total_20 || 0), 0);

                    return (
                        <div key={pageIndex} className="a4-page relative bg-white shadow-2xl print:shadow-none mx-auto overflow-hidden">
                            {/* Background Image Wrapper */}
                            <div 
                                className="absolute inset-0 w-full h-full z-0 opacity-100" 
                                style={{ 
                                    backgroundImage: "url('/epf-form-c-bg.png')",
                                    backgroundSize: "100% 100%",
                                    backgroundPosition: "center",
                                    backgroundRepeat: "no-repeat"
                                }}
                            />

                            {/* Data Overlay Container (Positioned absolutely over specific coordinates) */}
                            <div className="relative z-10 w-full h-full font-sans text-black font-bold text-[12px] uppercase">
                                
                                {/* Employer Registration Number */}
                                {/* Adjust top/left percentages based on visual tuning */}
                                <div className="absolute top-[10.5%] left-[58%] text-[14px] tracking-widest bg-white/80 px-1">
                                    65432 / B
                                </div>
                                
                                {/* Month & Year */}
                                <div className="absolute top-[13.8%] left-[64%] text-[14px] tabular-nums tracking-widest bg-white/80 px-1">
                                    {mm} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {yyyy}
                                </div>

                                {/* Header Contributions (Usually put on Last Page, else leave empty or show page subtotal) */}
                                {isLastPage && (
                                    <>
                                        <div className="absolute top-[17.5%] left-[75%] w-[20%] text-right text-[14px] tabular-nums bg-white/80 px-1">
                                            {grandTotalRemittance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        {/* Surcharges Default 0.00 */}
                                        <div className="absolute top-[20.8%] left-[75%] w-[20%] text-right text-[14px] tabular-nums bg-white/80 px-1">
                                            0.00
                                        </div>
                                        <div className="absolute top-[24%] left-[75%] w-[20%] text-right text-[16px] underline decoration-double font-black tabular-nums bg-white/80 px-1">
                                            {grandTotalRemittance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </>
                                )}

                                {/* TABLE ROWS CONTAINER */}
                                <div className="absolute top-[35.1%] left-[3.2%] w-[94.8%] h-[47%]">
                                    {pageRecords.map((row, idx) => {
                                        // Approximate row height ~ 3.1% of table area
                                        const topPos = `${idx * 6.55}%`;
                                        return (
                                            <div key={idx} className="absolute w-full h-[6.55%]" style={{ top: topPos }}>
                                                {/* Employee Name */}
                                                <div className="absolute left-[0%] top-[20%] w-[33%] whitespace-nowrap overflow-hidden text-ellipsis px-1 bg-white/80">
                                                    {row.name}
                                                </div>
                                                {/* NIC */}
                                                <div className="absolute left-[33.5%] top-[20%] w-[19%] text-center px-1 bg-white/80">
                                                    {row.nic || '-'}
                                                </div>
                                                {/* Member No */}
                                                <div className="absolute left-[52.5%] top-[20%] w-[10%] text-center font-black px-1 bg-white/80">
                                                    {row.member_no}
                                                </div>
                                                {/* Total 20% */}
                                                <div className="absolute left-[62.5%] top-[20%] w-[9%] text-right tabular-nums px-1 bg-white/80">
                                                    {row.total_20.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                {/* Employer 12% */}
                                                <div className="absolute left-[71.5%] top-[20%] w-[9%] text-right tabular-nums px-1 bg-white/80">
                                                    {row.employer_12.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                {/* Employee 8% */}
                                                <div className="absolute left-[80.5%] top-[20%] w-[9%] text-right tabular-nums px-1 bg-white/80">
                                                    {row.employee_8.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                {/* Gross Wages */}
                                                <div className="absolute left-[89.5%] top-[20%] w-[10%] text-right tabular-nums px-1 bg-white/80">
                                                    {row.earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* PAGE TOTALS (Bottom Row of Table) */}
                                <div className="absolute top-[82.2%] left-[62.5%] w-[9%] text-right tabular-nums text-[13px] bg-white/80 px-1">
                                    {pageTotal20.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="absolute top-[82.2%] left-[71.5%] w-[9%] text-right tabular-nums text-[13px] bg-white/80 px-1">
                                    {pageEmployer12.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="absolute top-[82.2%] left-[80.5%] w-[9%] text-right tabular-nums text-[13px] bg-white/80 px-1">
                                    {pageEmployee8.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="absolute top-[82.2%] left-[89.5%] w-[10%] text-right tabular-nums text-[13px] underline decoration-double bg-white/80 px-1">
                                    {pageEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* CSS Variables for precise printing and overlay tuning */}
            <style>{`
                /* Standard A4 size in mm to ensure perfect printing aspect ratio */
                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    page-break-after: always;
                }

                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 0; /* Remove browser margins, the image covers fully */
                    }
                    body { 
                        background: white !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        margin: 0;
                        padding: 0;
                    }
                    .print:hidden { display: none !important; }
                    /* Make sure background images load during print */
                    .a4-page {
                        page-break-after: always;
                        box-shadow: none !important;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default EPFFormC;
