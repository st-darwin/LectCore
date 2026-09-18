import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import { User, Phone, Hash, Mail, Lock, ArrowRight, ShieldCheck, Zap, Building2, ChevronDown } from 'lucide-react';
import logo from "../../assets/icons/logo.png"
export default function Signup() {
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [formData, setFormData] = useState({
    university: 'Mountain Top University (MTU)',
    name: '',
    phone: '',
    campusId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await auth.register({
        name: formData.name,
        email: formData.email,
        pass: formData.password,
        phone: formData.phone,
        campusId: formData.campusId,
        university: formData.university,
        role: role,
      });
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900 text-slate-100 font-['Poppins']">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
              <img src={logo}  className='rounded-xl' alt="" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">LectCore</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4 text-white">
            Join your university ecosystem today.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Create your verified student or faculty profile to get started with automated attendance and course materials.
          </p>
        </div>

        <div className="relative z-10 space-y-4 pt-8 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-slate-300 text-xs">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><ShieldCheck size={16} /></div>
            <span>Secure campus ID validation protocol</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-xs">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Zap size={16} /></div>
            <span>Real-time notifications & updates</span>
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-200/50">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg  text-white flex items-center justify-center font-bold text-sm">
              <img src={logo} className='rounded-xl' alt="" />
            </div>
            <span className="font-semibold text-slate-900">LectCore</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1 text-slate-900">Create Account</h2>
          <p className="text-slate-500 text-sm mb-6">Select your role to register your campus profile.</p>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setRole('student'); setFormData({ ...formData, campusId: '' }); }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${role === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('lecturer'); setFormData({ ...formData, campusId: '' }); }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${role === 'lecturer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Lecturer
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">{error}</div>}

          <form onSubmit={handleSignup} className="space-y-3.5">
            {/* Soft University Combobox */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Institution</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Building2 size={16} />
                </span>
                <select
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="Mountain Top University (MTU)">Mountain Top University (MTU)</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <ChevronDown size={16} />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><User size={16} /></span>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Uzoma Solomon" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {role === 'student' ? 'Matric ID' : 'Lecturer ID'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Hash size={16} /></span>
                  <input
                    type="text"
                    name="campusId"
                    required
                    value={formData.campusId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder={role === 'student' ? 'MAT/22/...' : 'LEC/00/...'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Phone size={16} /></span>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="080..." />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Mail size={16} /></span>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="user@mtu.edu.ng" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Lock size={16} /></span>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400"><Lock size={16} /></span>
                <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all mt-3 cursor-pointer flex items-center justify-center gap-2">
              <span>{loading ? 'Creating account...' : 'Sign Up'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-indigo-600 font-semibold hover:underline cursor-pointer">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}