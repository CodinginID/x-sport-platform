/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Settings, 
  LogOut, 
  BookOpen, 
  CreditCard, 
  Menu, 
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  TrendingUp,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface UserData {
  id: string;
  full_name: string;
  role: 'admin' | 'coach' | 'client';
  tenant_id: string;
}

interface AuthState {
  token: string | null;
  user: UserData | null;
}

// --- API Helpers ---
const API_URL = '/api';

const api = {
  get: async (path: string, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  post: async (path: string, body: any, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'API Error');
    }
    return res.json();
  }
};

// --- Components ---

const LandingPage = ({ auth }: { auth: AuthState }) => {
  return (
    <div className="bg-zen-bg overflow-hidden font-sans">
      {/* Dynamic Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 z-10"
          >
            <div className="inline-flex items-center space-x-2 bg-zen-brand/10 text-zen-brand px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zen-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zen-brand"></span>
              </span>
              <span>Next Gen Studio Management</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold leading-[0.95] text-zen-ink mb-8 tracking-tight">
              Scale your <br /> 
              <span className="gradient-text">Studio Flow</span>
            </h1>
            <p className="text-lg text-zen-ink/60 max-w-lg mb-10 leading-relaxed font-medium">
              The all-in-one OS for modern Pilates studios. Manage bookings, 
              track coach performance, and delight members with a seamless digital experience.
            </p>
            <div className="flex flex-wrap gap-4">
              {auth.token ? (
                <Link to={auth.user?.role === 'admin' ? '/admin' : '/classes'} className="btn-primary flex items-center group">
                  Go to Dashboard
                  <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-primary">
                    Start Studio Demo
                  </Link>
                  <button className="px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] text-zen-ink border border-zen-ink/10 hover:bg-zen-ink hover:text-white transition-all">
                    View Pricing
                  </button>
                </>
              )}
            </div>
          </motion.div>

          <div className="lg:col-span-5 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="glass-card p-4 rounded-[40px] rotate-3 relative z-10">
                <div className="aspect-[4/5] rounded-[32px] overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1518611012118-2961720d332d?auto=format&fit=crop&q=80&w=1200" 
                    alt="Pilates Future" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-zen-accent/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-zen-brand/20 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Stats Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="bento-grid">
          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-8 md:col-span-12 glass-card p-12 rounded-[40px] flex flex-col justify-between overflow-hidden relative"
          >
            <div className="relative z-10">
              <h3 className="text-4xl font-bold mb-4 tracking-tight">Smart Scheduling</h3>
              <p className="text-zen-ink/50 max-w-md italic">Automation that feels human. Let your members book in seconds while we handle the complexity.</p>
            </div>
            <div className="mt-12 flex space-x-4 relative z-10">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-20 w-32 bg-zen-bg rounded-2xl border border-zen-brand/5 shadow-inner" />
               ))}
            </div>
            <div className="absolute bottom-[-10%] right-[-5%] text-[12rem] font-bold text-zen-brand/5 leading-none select-none">SCHEDULE</div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-4 md:col-span-12 bg-zen-brand p-12 rounded-[40px] text-white flex flex-col justify-between"
          >
            <CreditCard size={40} className="mb-12 opacity-50" />
            <div>
              <h3 className="text-3xl font-bold mb-2">Memberships</h3>
              <p className="opacity-70 text-sm">Automated billing and session tracking for scale.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-4 md:col-span-12 bg-zen-accent p-12 rounded-[40px] text-white flex flex-col justify-between"
          >
            <TrendingUp size={40} className="mb-12 opacity-50" />
            <div>
              <h3 className="text-3xl font-bold mb-2">Commissions</h3>
              <p className="opacity-70 text-sm">Real-time payouts for your dedicated coaches.</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-8 md:col-span-12 glass-card p-12 rounded-[40px] flex items-center justify-between"
          >
            <div className="max-w-xs">
              <h3 className="text-3xl font-bold mb-2">Cloud-Native</h3>
              <p className="opacity-50 text-sm italic">High availability infrastructure built for modern growth.</p>
            </div>
            <div className="hidden sm:flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-zen-bg flex items-center justify-center font-bold text-[10px] text-zen-brand overflow-hidden shadow-lg">
                  <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-4 border-white bg-zen-brand flex items-center justify-center font-bold text-[10px] text-white shadow-lg">
                +42
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Simple Tech Footer */}
      <footer className="py-20 px-6 border-t border-zen-brand/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-2xl font-bold tracking-tighter">
            ZEN<span className="text-zen-brand italic">FLOW</span>
          </div>
          <div className="flex space-x-12 text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">
            <Link to="/login" className="hover:text-zen-brand">Member Portal</Link>
            <Link to="/classes" className="hover:text-zen-brand">Class Schedule</Link>
            <a href="#" className="hover:text-zen-brand">Documentation</a>
          </div>
          <div className="text-[10px] opacity-30">© 2024 ZENFLOW V1.0.0</div>
        </div>
      </footer>
    </div>
  );
};


const Layout = ({ children, auth, onLogout }: { children: React.ReactNode, auth: AuthState, onLogout: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-zen-bg text-zen-ink font-sans pb-24 md:pb-0">
      {/* Top Navigation - Desktop only or Logo only on mobile */}
      <nav className="fixed top-6 left-6 right-6 z-50">
        <div className="max-w-5xl mx-auto glass-card h-20 rounded-[32px] px-8 flex justify-between items-center bg-white/60">
            <Link to="/" className="text-xl font-bold tracking-tighter group flex items-center">
              ZEN<span className="text-zen-brand italic transition-all group-hover:translate-x-1">FLOW</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-10">
              <Link to="/classes" className="text-[10px] uppercase tracking-[0.3em] font-bold hover:text-zen-brand transition-colors">Schedule</Link>
              <Link to="/memberships" className="text-[10px] uppercase tracking-[0.3em] font-bold hover:text-zen-brand transition-colors">Packages</Link>
              <Link to="/bookings" className="text-[10px] uppercase tracking-[0.3em] font-bold hover:text-zen-brand transition-colors">Activity</Link>
              {auth.user?.role === 'admin' && (
                <Link to="/admin" className="text-[10px] uppercase tracking-[0.3em] font-bold text-zen-brand">Intelligence</Link>
              )}
              <button 
                onClick={onLogout}
                className="text-[10px] uppercase tracking-[0.3em] font-bold text-red-400 hover:text-red-500"
              >
                Exit
              </button>
            </div>

            <div className="md:hidden">
              {/* Optional: Add a profile pic or notification icon here for mobile */}
            </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Component */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="glass-card h-16 rounded-[32px] px-6 flex justify-between items-center bg-white/90 shadow-2xl">
          <Link to="/classes" className={`flex flex-col items-center justify-center w-12 ${isActive('/classes') ? 'text-zen-brand' : 'text-zen-ink/40'}`}>
            <Calendar size={20} className={isActive('/classes') ? 'mb-1' : ''} />
            {isActive('/classes') && <span className="text-[8px] font-bold uppercase tracking-widest">Classes</span>}
          </Link>
          <Link to="/memberships" className={`flex flex-col items-center justify-center w-12 ${isActive('/memberships') ? 'text-zen-brand' : 'text-zen-ink/40'}`}>
            <CreditCard size={20} className={isActive('/memberships') ? 'mb-1' : ''} />
            {isActive('/memberships') && <span className="text-[8px] font-bold uppercase tracking-widest">Plans</span>}
          </Link>
          <Link to="/bookings" className={`flex flex-col items-center justify-center w-12 ${isActive('/bookings') ? 'text-zen-brand' : 'text-zen-ink/40'}`}>
            <BookOpen size={20} className={isActive('/bookings') ? 'mb-1' : ''} />
            {isActive('/bookings') && <span className="text-[8px] font-bold uppercase tracking-widest">History</span>}
          </Link>
          {auth.user?.role === 'admin' && (
            <Link to="/admin" className={`flex flex-col items-center justify-center w-12 ${isActive('/admin') ? 'text-zen-brand' : 'text-zen-ink/40'}`}>
              <Settings size={20} className={isActive('/admin') ? 'mb-1' : ''} />
              {isActive('/admin') && <span className="text-[8px] font-bold uppercase tracking-widest">Admin</span>}
            </Link>
          )}
          <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center justify-center w-12 text-zen-ink/40 hover:text-zen-ink transition-colors">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile Overlay Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="md:hidden fixed inset-0 z-[60] bg-white flex flex-col pt-24 px-8"
          >
            <button className="absolute top-8 right-8 p-2 bg-zen-bg rounded-full text-zen-ink" onClick={() => setIsMenuOpen(false)}>
              <X size={24} />
            </button>
            <div className="flex flex-col flex-1 pb-16">
              <div className="mb-12">
                <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-4">Account</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-zen-brand text-white rounded-full flex items-center justify-center text-xl font-serif italic">
                    {auth.user?.full_name[0] || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-lg tracking-tight">{auth.user?.full_name}</div>
                    <div className="text-xs uppercase tracking-widest opacity-50">{auth.user?.role}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-6 text-2xl font-bold tracking-tighter flex flex-col items-start pt-8 border-t border-zen-ink/10">
                <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="text-red-500 flex items-center">
                  <LogOut size={24} className="mr-4" /> Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-6 md:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: (auth: AuthState) => void }) => {
  const [email, setEmail] = useState('admin@zenflow.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password, tenantId: 't1' });
      localStorage.setItem('zenflow_auth', JSON.stringify(data));
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zen-bg p-6 relative">
      <Link to="/" className="absolute top-8 left-8 flex flex-col items-center group">
        <div className="w-12 h-12 bg-zen-brand text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-zen-brand/20 group-hover:scale-110 transition-transform">
           <span className="font-serif font-bold text-xl italic">Z</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-hover:opacity-100 transition-opacity">Back</span>
      </Link>
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 glass-card rounded-[48px] overflow-hidden">
        <div className="p-12 md:p-16 flex flex-col justify-center bg-white">
          <header className="mb-12">
            <h2 className="text-4xl font-bold tracking-tighter text-zen-ink mb-2">Member Portal</h2>
            <p className="text-zen-ink/50 font-medium italic">Access your studio headquarters.</p>
          </header>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Studio Identity</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-zen-bg border-0 rounded-2xl focus:ring-2 focus:ring-zen-brand outline-none transition-all font-medium text-sm"
                placeholder="name@studio.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Access Token</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-zen-bg border-0 rounded-2xl focus:ring-2 focus:ring-zen-brand outline-none transition-all font-medium text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zen-brand text-white py-5 rounded-2xl hover:bg-zen-ink transition-all duration-500 uppercase tracking-[0.3em] font-bold text-[10px] mt-8 shadow-lg shadow-zen-brand/20"
            >
              {loading ? 'Authenticating...' : 'Establish Session'}
            </button>
          </form>
          
          <div className="mt-12 p-6 bg-zen-bg rounded-3xl border border-zen-brand/5">
            <p className="text-[10px] uppercase tracking-widest opacity-30 font-bold mb-2">Debug Interface</p>
            <p className="text-xs font-mono opacity-60">admin@zenflow.com / admin123</p>
          </div>
        </div>
        
        <div className="hidden md:block relative bg-zen-brand/5">
          <img 
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=1200" 
            alt="Zen Space" 
            className="absolute inset-0 w-full h-full object-cover grayscale-[20%]"
          />
          <div className="absolute inset-0 bg-zen-brand/30 mix-blend-multiply" />
        </div>
      </div>
    </div>
  );
};

const ClassBooking = ({ auth }: { auth: AuthState }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/classes', auth.token!).then(setClasses).finally(() => setLoading(false));
  }, []);

  const handleBook = async (classId: string) => {
    try {
      await api.post('/bookings', { class_id: classId }, auth.token!);
      setMessage('Class booked successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 italic opacity-40">Syncing studio availability...</div>;

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zen-brand/5 pb-12">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold text-zen-ink mb-4 tracking-tighter">Live Sessions</h1>
          <p className="text-zen-ink/50 text-lg font-medium">Reserve your spot in our real-time optimized flows. Active member monitoring enabled.</p>
        </div>
        <div className="flex items-center space-x-4">
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0 }}
                className="flex items-center text-white bg-green-500 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-500/20"
              >
                <CheckCircle2 size={16} className="mr-2" />
                <span>{message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {classes.map((c) => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={c.id} 
            className="group"
          >
            <div className="glass-card rounded-[40px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-zen-brand/5">
              <div className="aspect-[16/10] bg-zen-brand/5 relative overflow-hidden">
                <img 
                  src={`https://images.unsplash.com/photo-1518611012118-2961720d332d?auto=format&fit=crop&q=80&w=800&seed=${c.id}`}
                  alt={c.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[20%] group-hover:grayscale-0"
                />
                <div className="absolute top-6 left-6 glass-card px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest font-bold">
                  {new Date(c.start_time).toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-3xl font-bold text-zen-brand tracking-tighter">${c.price}</span>
                  <div className="flex items-center text-[10px] opacity-30 font-bold uppercase tracking-widest space-x-2">
                    <Users size={12} />
                    <span>{c.capacity} Units</span>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold mb-3 tracking-tight group-hover:text-zen-brand transition-colors">{c.name}</h3>
                <p className="text-zen-ink/50 mb-8 h-12 overflow-hidden text-sm line-clamp-2 italic leading-relaxed font-medium">{c.description}</p>
                
                <div className="space-y-4 border-t border-zen-brand/5 pt-6 mb-8">
                  <div className="flex items-center text-[10px] tracking-widest uppercase font-bold opacity-50">
                    <Calendar size={14} className="mr-3 text-zen-brand" />
                    <span>{new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center text-[10px] tracking-widest uppercase font-bold opacity-50">
                    <User size={14} className="mr-3 text-zen-brand" />
                    <span>Partner: {c.coach_name}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleBook(c.id)}
                  className="w-full py-5 bg-white border border-zen-brand/20 text-zen-brand rounded-[24px] group-hover:bg-zen-brand group-hover:text-white transition-all duration-500 uppercase tracking-[0.3em] font-bold text-[10px] shadow-sm hover:shadow-lg hover:shadow-zen-brand/20"
                >
                  Confirm Availability
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Memberships = ({ auth }: { auth: AuthState }) => {
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    api.get('/memberships/packages', auth.token!).then(setPackages);
  }, []);

  const handlePurchase = async (pkgId: string) => {
    try {
      await api.post('/memberships/purchase', { package_id: pkgId }, auth.token!);
      alert('Subscription Activated.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-20">
      <header className="max-w-2xl">
        <div className="inline-block bg-zen-brand/10 text-zen-brand px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold mb-6">Tiered Access</div>
        <h1 className="text-6xl md:text-7xl font-bold text-zen-ink mb-8 tracking-tighter leading-none">Studio <span className="gradient-text">Packages</span></h1>
        <p className="text-zen-ink/50 text-xl font-medium">Select a subscription model that powers your physical growth. Integrated with real-time session tracking.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {packages.map((pkg) => (
          <div key={pkg.id} className="glass-card p-12 rounded-[48px] flex flex-col group hover:bg-white transition-all duration-700 shadow-sm hover:shadow-2xl hover:shadow-zen-brand/10 border-transparent hover:border-zen-brand/10">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mb-8">{pkg.name}</h3>
            <div className="flex items-baseline mb-12">
              <span className="text-7xl font-bold text-zen-ink tracking-tight">${pkg.price}</span>
              <span className="text-xs opacity-20 ml-2 font-bold uppercase tracking-widest">USD</span>
            </div>
            
            <div className="space-y-6 flex-grow mb-16">
              {[
                { icon: <BookOpen size={14} />, text: `${pkg.max_sessions} Reserved Units` },
                { icon: <Calendar size={14} />, text: `Valid for ${pkg.duration_days} days` },
                { icon: <Zap size={14} />, text: "Priority access to new sessions" }
              ].map((feat, i) => (
                <div key={i} className="flex items-center space-x-5 border-b border-zen-brand/5 pb-5 last:border-0 group-hover:border-zen-brand/20 transition-colors">
                  <div className="w-10 h-10 rounded-2xl bg-zen-brand/5 flex items-center justify-center text-zen-brand group-hover:bg-zen-brand group-hover:text-white transition-all">
                    {feat.icon}
                  </div>
                  <span className="text-sm font-medium opacity-60 italic">{feat.text}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handlePurchase(pkg.id)}
              className="w-full py-6 bg-zen-ink text-white rounded-[24px] hover:bg-zen-brand transition-all duration-500 uppercase tracking-[0.4em] font-bold text-[10px] shadow-xl shadow-zen-ink/10"
            >
              Initialize Purchase
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = ({ auth }: { auth: AuthState }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'master' | 'transactions' | 'attendance'>('reports');
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  // Master data state
  const [members, setMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const fetchDashboard = () => api.get('/reports/dashboard', auth.token!).then(setDashboardData);
  const fetchMasterData = () => {
    api.get('/members', auth.token!).then(setMembers);
    api.get('/products', auth.token!).then(setProducts);
    api.get('/coaches', auth.token!).then(setCoaches);
    api.get('/memberships/packages', auth.token!).then(setPackages);
    api.get('/classes', auth.token!).then(setClasses);
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchDashboard();
    if (activeTab === 'master' || activeTab === 'transactions' || activeTab === 'attendance') fetchMasterData();
  }, [activeTab]);

  const handleProductSale = async (e: any) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await api.post('/transactions/product', {
        product_id: data.get('product_id'),
        quantity: Number(data.get('quantity'))
      }, auth.token!);
      alert('Penjualan berhasil');
      e.target.reset();
    } catch(err:any) { alert(err.message); }
  };

  const handleMembershipSale = async (e: any) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await api.post('/transactions/membership', {
        user_id: data.get('user_id'),
        package_id: data.get('package_id')
      }, auth.token!);
      alert('Pembayaran paket berhasil');
      e.target.reset();
    } catch(err:any) { alert(err.message); }
  };

  const handleAttendance = async (e: any) => {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await api.post('/bookings/attend', {
        user_id: data.get('user_id'),
        class_id: data.get('class_id')
      }, auth.token!);
      alert('Kehadiran berhasil dicatat, saldo terpotong.');
      e.target.reset();
    } catch(err:any) { alert(err.message); }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start min-h-[70vh]">
      <aside className="w-full md:w-56 shrink-0 md:sticky md:top-32">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">Override</h1>
          <p className="text-zen-ink/50 text-xs uppercase tracking-widest font-bold">Admin OS</p>
        </div>

        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { id: 'reports', label: 'Reports', icon: <TrendingUp size={16} /> },
            { id: 'master', label: 'Master Data', icon: <Settings size={16} /> },
            { id: 'transactions', label: 'Transactions', icon: <CreditCard size={16} /> },
            { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 size={16} /> },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-3 px-5 py-4 rounded-2xl whitespace-nowrap transition-all uppercase tracking-widest text-[10px] font-bold ${activeTab === tab.id ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg md:bg-transparent hover:bg-zen-brand/5 text-zen-ink/50 hover:text-zen-ink'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 w-full max-w-full min-w-0">
        {activeTab === 'reports' && dashboardData && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-[32px]">
              <div className="text-[10px] uppercase font-bold opacity-30 tracking-widest mb-2">Total Penjualan</div>
              <div className="text-4xl font-bold tracking-tighter">${dashboardData.sales.toFixed(2)}</div>
            </div>
            <div className="glass-card p-8 rounded-[32px]">
              <div className="text-[10px] uppercase font-bold opacity-30 tracking-widest mb-2">Income Member</div>
              <div className="text-4xl font-bold tracking-tighter">${dashboardData.member_income.toFixed(2)}</div>
            </div>
            <div className="glass-card p-8 rounded-[32px] bg-zen-brand text-white">
              <div className="text-[10px] uppercase font-bold opacity-80 tracking-widest mb-2">Net Profit</div>
              <div className="text-4xl font-bold tracking-tighter">${dashboardData.profit.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
            <div className="glass-card p-8 rounded-[32px]">
              <h3 className="text-lg font-bold mb-6">Saldo Member (Aktif)</h3>
              <table className="w-full text-sm">
                <thead><tr className="opacity-40 text-left border-b border-zen-ink/5"><th className="pb-2">Member</th><th className="pb-2">Paket</th><th className="pb-2">Sisa</th></tr></thead>
                <tbody>
                  {dashboardData.member_balances.map((b:any, i:number) => (
                    <tr key={i} className="border-b border-zen-ink/5 h-12">
                      <td className="font-bold">{b.full_name}</td>
                      <td>{b.package_name}</td>
                      <td>{b.sessions_remaining ? `${b.sessions_remaining} sesi` : `${b.days_remaining} hari`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="glass-card p-8 rounded-[32px]">
              <h3 className="text-lg font-bold mb-6">Riwayat Komisi Coach</h3>
              <table className="w-full text-sm">
                <thead><tr className="opacity-40 text-left border-b border-zen-ink/5"><th className="pb-2">Coach</th><th className="pb-2">Deskripsi</th><th className="pb-2">Amount</th></tr></thead>
                <tbody>
                  {dashboardData.coach_commissions_history.map((c:any, i:number) => (
                    <tr key={i} className="border-b border-zen-ink/5 h-12">
                      <td className="font-bold">{c.full_name}</td>
                      <td>{c.description}</td>
                      <td className="text-zen-brand font-bold">${c.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <div className="glass-card p-10 rounded-[40px]">
             <h3 className="font-bold text-2xl mb-8">Input Penjualan Barang</h3>
             <form onSubmit={handleProductSale} className="space-y-4">
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Barang</label>
                  <select name="product_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none">
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price} | Stok: {p.stock})</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Qty</label>
                  <input type="number" name="quantity" min="1" defaultValue="1" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
               </div>
               <button type="submit" className="w-full py-4 bg-zen-ink text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Proses Transaksi</button>
             </form>
          </div>

          <div className="glass-card p-10 rounded-[40px]">
             <h3 className="font-bold text-2xl mb-8">Pembayaran Member</h3>
             <form onSubmit={handleMembershipSale} className="space-y-4">
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Member</label>
                  <select name="user_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none">
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Paket</label>
                  <select name="package_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none">
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                  </select>
               </div>
               <button type="submit" className="w-full py-4 bg-zen-brand text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Proses Pembayaran</button>
             </form>
          </div>

          <div className="glass-card p-10 rounded-[40px]">
             <h3 className="font-bold text-2xl mb-8">Input Pembayaran Komisi Coach</h3>
             <form onSubmit={async (e: any) => {
               e.preventDefault();
               const data = new FormData(e.target);
               try {
                 await api.post('/transactions/commission', {
                   coach_id: data.get('coach_id'),
                   amount: Number(data.get('amount')),
                   description: data.get('description')
                 }, auth.token!);
                 alert('Komisi berhasil ditambahkan');
                 e.target.reset();
               } catch(err:any) { alert(err.message); }
             }} className="space-y-4">
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Coach</label>
                  <select name="coach_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required>
                    {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Jumlah Komisi ($)</label>
                  <input type="number" name="amount" min="1" step="0.01" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
               </div>
               <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Catatan / Deskripsi</label>
                  <input type="text" name="description" placeholder="Komisi Paket VIP (30% dari $500)" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
               </div>
               <button type="submit" className="w-full py-4 bg-zen-accent text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Bayar Komisi</button>
             </form>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="max-w-xl mx-auto glass-card p-10 rounded-[40px]">
          <h3 className="font-bold text-2xl mb-8 tracking-tight">Catat Kehadiran Member</h3>
          <p className="text-sm opacity-60 mb-8 italic">Pilih member dan sesi. Saldo paket akan terpotong secara otomatis.</p>
          <form onSubmit={handleAttendance} className="space-y-4">
            <div>
              <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Member</label>
              <select name="user_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none">
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Pilih Class / Sesi</label>
              <select name="class_id" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({new Date(c.start_time).toLocaleString()}) - Coach {c.coach_name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-4 mt-8 bg-green-500 text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-green-500/20">Mark Attended</button>
          </form>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="space-y-10">
          <div className="glass-card p-10 rounded-[40px]">
            <h3 className="font-bold text-2xl mb-8">Input Member Baru</h3>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const data = new FormData(e.target);
              try {
                await api.post('/members', { full_name: data.get('full_name'), email: data.get('email') }, auth.token!);
                alert('Member berhasil ditambahkan');
                e.target.reset();
                fetchMasterData();
              } catch(err:any) { alert(err.message); }
            }} className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Nama Lengkap</label>
                <input type="text" name="full_name" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Email Member</label>
                <input type="email" name="email" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <button type="submit" className="w-full py-4 bg-zen-brand text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Simpan Member</button>
            </form>
            <div className="mt-8 text-sm opacity-60">Member terdaftar: {members.length} orang.</div>
          </div>

          <div className="glass-card p-10 rounded-[40px]">
            <h3 className="font-bold text-2xl mb-8">Input Coach Baru</h3>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const data = new FormData(e.target);
              try {
                await api.post('/coaches', { full_name: data.get('full_name'), email: data.get('email') }, auth.token!);
                alert('Coach berhasil ditambahkan');
                e.target.reset();
                fetchMasterData();
              } catch(err:any) { alert(err.message); }
            }} className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Nama Lengkap</label>
                <input type="text" name="full_name" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Email Coach</label>
                <input type="email" name="email" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <button type="submit" className="w-full py-4 bg-zen-brand text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Simpan Coach</button>
            </form>
            <div className="mt-8 text-sm opacity-60">Coach terdaftar: {coaches.length} orang.</div>
          </div>

          <div className="glass-card p-10 rounded-[40px]">
            <h3 className="font-bold text-2xl mb-8">Input Barang (Produk)</h3>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const data = new FormData(e.target);
              try {
                await api.post('/products', { name: data.get('name'), stock: Number(data.get('stock')), price: Number(data.get('price')) }, auth.token!);
                alert('Barang berhasil ditambahkan');
                e.target.reset();
                fetchMasterData();
              } catch(err:any) { alert(err.message); }
            }} className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Nama Barang</label>
                <input type="text" name="name" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Stok Awal</label>
                  <input type="number" name="stock" min="0" defaultValue="10" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Harga ($)</label>
                  <input type="number" name="price" min="0" step="0.01" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-zen-brand text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Simpan Barang</button>
            </form>
          </div>

          <div className="glass-card p-10 rounded-[40px]">
            <h3 className="font-bold text-2xl mb-8">Input Paket Servis Baru</h3>
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const data = new FormData(e.target);
              try {
                await api.post('/memberships/packages', { 
                  name: data.get('name'), 
                  type: data.get('type'),
                  price: Number(data.get('price')),
                  max_sessions: Number(data.get('max_sessions')),
                  duration_days: Number(data.get('duration_days'))
                }, auth.token!);
                alert('Paket berhasil ditambahkan');
                e.target.reset();
                fetchMasterData();
              } catch(err:any) { alert(err.message); }
            }} className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Nama Paket</label>
                <input type="text" name="name" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
              </div>
              <div>
                <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Jenis Paket</label>
                <select name="type" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required>
                  <option value="standard">Standard Sesi</option>
                  <option value="unlimited">Unlimited (Per Bulan / Hari)</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Harga ($)</label>
                  <input type="number" name="price" min="0" step="0.01" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Jumlah Sesi</label>
                  <input type="number" name="max_sessions" min="0" defaultValue="10" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-40 uppercase tracking-widest">Masa Aktif (Hari)</label>
                  <input type="number" name="duration_days" min="0" defaultValue="30" className="w-full p-4 mt-2 rounded-2xl bg-zen-bg focus:ring-2 outline-none" required />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-zen-brand text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold">Simpan Paket</button>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

const BookingsList = ({ auth }: { auth: AuthState }) => {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    api.get('/bookings', auth.token!).then(setBookings);
  }, []);

  return (
    <table className="w-full text-left font-sans">
      <thead>
        <tr className="bg-zen-brand/5 text-[10px] uppercase tracking-[0.3em] font-bold text-zen-ink/40 h-20">
          <th className="px-10">Identifier</th>
          <th className="px-10">Session Node</th>
          <th className="px-10">Timestamp</th>
          <th className="px-10 text-right">Network Status</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b.id} className="border-b border-zen-brand/5 h-24 hover:bg-zen-brand/5 transition-all">
            <td className="px-10 font-bold text-zen-ink/80 tracking-tight">#{b.id.slice(0, 8)}</td>
            <td className="px-10 italic text-zen-ink/50">{b.class_name}</td>
            <td className="px-10 text-xs font-mono opacity-60">{new Date(b.start_time).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</td>
            <td className="px-10 text-right">
              <span className="text-[9px] uppercase tracking-[0.2em] px-5 py-2 bg-zen-brand/5 text-zen-brand rounded-full font-bold border border-zen-brand/10">
                {b.status}
              </span>
            </td>
          </tr>
        ))}
        {bookings.length === 0 && (
          <tr>
            <td colSpan={4} className="py-24 text-center italic text-zen-ink/20 text-sm">No synchronized activity detected.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

// --- Main App ---

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zenflow_auth');
    if (saved) {
      setAuth(JSON.parse(saved));
    }
    setInitialized(true);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('zenflow_auth');
    setAuth({ token: null, user: null });
  };

  if (!initialized) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage auth={auth} />} />
        <Route path="/login" element={
          auth.token ? <Navigate to="/classes" /> : <Login onLogin={setAuth} />
        } />
        
        <Route path="/*" element={
          auth.token ? (
            <Layout auth={auth} onLogout={handleLogout}>
              <Routes>
                <Route path="/classes" element={<ClassBooking auth={auth} />} />
                <Route path="/bookings" element={
                  <div className="space-y-12">
                     <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zen-brand/5 pb-12">
                        <div className="max-w-xl">
                          <h1 className="text-5xl md:text-6xl font-bold text-zen-ink mb-4 tracking-tighter">Member Activity</h1>
                          <p className="text-zen-ink/50 text-lg font-medium">Your history and upcoming reservations across all Zenflow nodes.</p>
                        </div>
                      </header>
                     <div className="glass-card rounded-[40px] overflow-hidden">
                        <BookingsList auth={auth} />
                     </div>
                  </div>
                } />
                <Route path="/memberships" element={<Memberships auth={auth} />} />
                {auth.user?.role === 'admin' ? (
                  <Route path="/admin" element={<AdminDashboard auth={auth} />} />
                ) : null}
                <Route path="*" element={<Navigate to="/classes" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}
