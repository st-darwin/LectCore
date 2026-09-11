import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import { Hash, Lock, ArrowRight, BookOpen, Users } from 'lucide-react';

export default function Login() {
  const [campusId, setCampusId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.loginWithCampusId(campusId, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900 text-slate-100 font-['Poppins']">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
              LC
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">LectCore</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4 text-white">
            Smart academic management for modern campuses.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Seamlessly track lectures, manage assignments, and connect students with faculty in real-time.
          </p>
        </div>

        <div className="relative z-10 space-y-4 pt-8 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-slate-300 text-xs">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><BookOpen size={16} /></div>
            <span>Instant course material access & scheduling</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-xs">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Users size={16} /></div>
            <span>Unified portal for students and lecturers</span>
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-slate-200/85 shadow-2xl shadow-slate-200/50">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">LC</div>
            <span className="font-semibold text-slate-900">LectCore</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1 text-slate-900">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your Campus ID and password to sign in.</p>

          {error && <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Campus ID (Matric / Lecturer ID)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Hash size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="e.g. MAT/22/1234 or LEC/001"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button onClick={() => navigate('/sign-up')} className="text-indigo-600 font-semibold hover:underline cursor-pointer">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
}