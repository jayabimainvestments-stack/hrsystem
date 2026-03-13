import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo_base64';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 font-display">
            <div className="w-full max-w-md p-10 bg-white rounded-[2rem] shadow-2xl border border-slate-100">
                <div className="flex flex-col items-center mb-10">
                    <img src={Logo} alt="JAYABIMA" className="h-48 mb-8 object-contain" />
                    <h2 className="text-3xl font-black text-center text-slate-900 tracking-tighter uppercase">JAYABIMA HR</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2 px-4 py-1 bg-slate-50 rounded-full">Secure Enterprise Login</p>
                </div>
                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700" htmlFor="email">Email</label>
                        <input
                            type="text"
                            id="email"
                            className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-bold text-gray-700" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-3 py-2 mb-3 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            className="w-full px-8 py-4 font-black transition-all text-white bg-primary-600 rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-100 uppercase text-xs tracking-widest"
                            type="submit"
                        >
                            Sign In to Workspace &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
