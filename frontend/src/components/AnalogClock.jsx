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
        <div className="relative w-32 h-32 bg-white/50 backdrop-blur-md rounded-full border-4 border-slate-900 shadow-xl flex items-center justify-center overflow-hidden group">
            {/* Clock Face Details */}
            <div className="absolute inset-0 p-2">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-0.5 h-2 bg-slate-300"
                        style={{
                            left: '50%',
                            top: '1px',
                            transformOrigin: '50% 62px',
                            transform: `translateX(-50%) rotate(${i * 30}deg)`
                        }}
                    ></div>
                ))}
            </div>

            {/* Hands */}
            {/* Hour Hand */}
            <div
                className="absolute w-1 h-8 bg-slate-800 rounded-full"
                style={{
                    bottom: '50%',
                    left: 'calc(50% - 0.5px)',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${hourDeg}deg)`
                }}
            ></div>

            {/* Minute Hand */}
            <div
                className="absolute w-0.5 h-12 bg-slate-500 rounded-full"
                style={{
                    bottom: '50%',
                    left: 'calc(50% - 0.25px)',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${minuteDeg}deg)`
                }}
            ></div>

            {/* Second Hand */}
            <div
                className="absolute w-px h-13 bg-blue-500"
                style={{
                    bottom: '50%',
                    left: '50%',
                    transformOrigin: '50% 100%',
                    transform: `rotate(${secondDeg}deg)`
                }}
            ></div>

            {/* Center Pin */}
            <div className="absolute w-2 h-2 bg-slate-900 rounded-full z-10 border border-white shadow-sm"></div>

            {/* digital display below */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center pointer-events-none">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em]">Time</span>
                <span className="text-[10px] font-black text-slate-800 tabular-nums leading-none">
                    {time.getHours().toString().padStart(2, '0')}:
                    {time.getMinutes().toString().padStart(2, '0')}
                </span>
            </div>

            {/* Digital Overlay on Hover */}
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Focus</span>
                <span className="text-lg font-black text-white tracking-tighter tabular-nums">
                    {time.getHours().toString().padStart(2, '0')}:
                    {time.getMinutes().toString().padStart(2, '0')}
                </span>
            </div>
        </div>
    );
};

export default AnalogClock;
