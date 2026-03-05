import { useState, useEffect } from 'react';

const AnalogClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const hourDeg = (hours % 12) * 30 + minutes * 0.5;
    const minuteDeg = minutes * 6;
    const secondDeg = seconds * 6;

    return (
        <div className="relative w-48 h-48 bg-white rounded-full border-8 border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden group">
            {/* Clock Face Details */}
            <div className="absolute inset-0 p-4">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-3 bg-slate-200"
                        style={{
                            left: '50%',
                            top: '2px',
                            transformOrigin: '50% 90px',
                            transform: `translateX(-50%) rotate(${i * 30}deg)`
                        }}
                    ></div>
                ))}
            </div>

            {/* Hands */}
            {/* Hour Hand */}
            <div
                className="absolute w-1.5 h-12 bg-slate-800 rounded-full"
                style={{
                    bottom: '50%',
                    left: 'calc(50% - 0.75px)',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${hourDeg}deg)`
                }}
            ></div>

            {/* Minute Hand */}
            <div
                className="absolute w-1 h-16 bg-slate-500 rounded-full"
                style={{
                    bottom: '50%',
                    left: 'calc(50% - 0.5px)',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${minuteDeg}deg)`
                }}
            ></div>

            {/* Second Hand */}
            <div
                className="absolute w-0.5 h-18 bg-blue-500 rounded-full"
                style={{
                    bottom: '50%',
                    left: 'calc(50% - 0.25px)',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${secondDeg}deg)`
                }}
            ></div>

            {/* Center Pin */}
            <div className="absolute w-3 h-3 bg-slate-900 rounded-full z-10 border-2 border-white shadow-sm"></div>

            {/* digital display below */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center pointer-events-none">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Time</span>
                <span className="text-xs font-black text-slate-800 tabular-nums">
                    {time.getHours().toString().padStart(2, '0')}:
                    {time.getMinutes().toString().padStart(2, '0')}
                </span>
            </div>

            {/* Digital Overlay on Hover */}
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">System Time</span>
                <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                    {time.getHours().toString().padStart(2, '0')}:
                    {time.getMinutes().toString().padStart(2, '0')}:
                    {time.getSeconds().toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">24H Format Active</span>
            </div>
        </div>
    );
};

export default AnalogClock;
