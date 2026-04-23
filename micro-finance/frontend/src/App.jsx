import React, { useState, useEffect } from 'react';
import { 
  Users, 
  HandCoins, 
  Wallet, 
  BarChart3, 
  LayoutDashboard, 
  Settings, 
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Layers,
  UploadCloud
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import CollectionSheet from './components/CollectionSheet';
import CustomerManager from './components/CustomerManager';
import LoanManager from './components/LoanManager';
import DataImporter from './components/DataImporter';

const dummyData = [
  { name: 'Mon', amount: 45000 },
  { name: 'Tue', amount: 52000 },
  { name: 'Wed', amount: 48000 },
  { name: 'Thu', amount: 61000 },
  { name: 'Fri', amount: 55000 },
  { name: 'Sat', amount: 67000 },
  { name: 'Sun', amount: 40000 },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_customers: 0,
    active_loans: 0,
    total_disbursed: 0,
    total_collected: 0
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'loans', label: 'Loans', icon: HandCoins },
    { id: 'collections', label: 'Collections', icon: Wallet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-white">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/10 flex flex-col p-6 glass">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center">
            <Layers className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Jayabima <span className="text-brand-accent">Next</span></h1>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10 space-y-2">
          <button 
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all w-full ${
              activeTab === 'sync' 
                ? 'bg-brand-accent/20 text-brand-accent shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UploadCloud size={20} />
            <span className="font-medium">Data Sync</span>
          </button>
          <button className="flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-white transition-colors w-full">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        {activeTab === 'dashboard' && (
          <>
            {/* Header */}
            <header className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-bold">Good Morning, Krishantha</h2>
                <p className="text-gray-400 mt-1">Here's what's happening with your portfolio today.</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search NIC or Name..." 
                    className="input-field pl-10 w-64 text-sm"
                  />
                </div>
                <button className="btn-primary">
                  <Plus size={20} />
                  New Loan
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-10">
              {[
                { label: 'Total Collections', value: 'LKR 842K', trend: '+12.5%', icon: Wallet, color: 'text-blue-500' },
                { label: 'Active Loans', value: '124', trend: '+3', icon: HandCoins, color: 'text-purple-500' },
                { label: 'Customers', value: '3,842', trend: '+24', icon: Users, color: 'text-green-500' },
                { label: 'Loan Stock', value: 'LKR 12.4M', trend: '+5.2%', icon: BarChart3, color: 'text-orange-500' },
              ].map((stat, i) => (
                <div key={i} className="glass-card relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                      <stat.icon size={22} />
                    </div>
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <stat.icon size={100} />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts & Details */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 glass-card">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-wider text-gray-400">Weekly Performance</h3>
                    <p className="text-2xl font-bold">LKR 412,500 <span className="text-sm font-normal text-gray-500 ml-2">this week</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold hover:bg-brand-accent transition-colors">7D</button>
                    <button className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold hover:bg-brand-accent transition-colors">1M</button>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dummyData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorAmount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card">
                <h3 className="text-lg font-bold mb-6">Recent Collections</h3>
                <div className="space-y-6">
                  {[
                    { name: 'Nimal Siripala', id: '1024', amount: 'LKR 2,500', time: '10 mins ago' },
                    { name: 'Kumara Perera', id: '1088', amount: 'LKR 1,800', time: '24 mins ago' },
                    { name: 'Sunil Shantha', id: '1121', amount: 'LKR 3,000', time: '1 hour ago' },
                    { name: 'Kamal Bandara', id: '1105', amount: 'LKR 2,200', time: '2 hours ago' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors">
                        {item.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-gray-500">ID: {item.id} • {item.time}</p>
                      </div>
                      <p className="font-bold text-green-400">{item.amount}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-8 py-3 rounded-xl bg-white/5 text-sm font-bold text-gray-400 hover:text-white transition-colors">
                  View All Transactions
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'collections' && <CollectionSheet />}

        {activeTab === 'customers' && <CustomerManager />}

        {activeTab === 'loans' && <LoanManager />}

        {activeTab === 'sync' && <DataImporter />}

        {['reports'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-48 opacity-50">
            <Layers size={64} className="mb-4" />
            <h3 className="text-2xl font-bold">Coming Soon</h3>
            <p>This module is currently being optimized for high-volume data.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
