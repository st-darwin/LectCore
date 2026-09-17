import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  ArrowLeft, 
  Save, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield,
  CreditCard,
  Lock
} from 'lucide-react';
import { ID } from 'appwrite';
import { account, databases, appwriteConfig } from '../../appwrite/Client'; // Ensure 'account' is imported from your client file
import Header from '../../Components/Header';

const CreateNewUser: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State including a temporary password for account creation
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    campusId: '',
    phone: '',
    university: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Step 1: Create the Auth Account to generate a verified auth userId
      // Note: Depending on your admin setup, you might use a server SDK or client account creation.
      const newAuthUser = await account.create(
        ID.unique(),
        formData.email,
        formData.password,
        formData.name
      );

      // Step 2: Create the user profile document in your database using the Auth ID as the document ID (or reference field)
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        newAuthUser.$id, // Links database record directly to the Auth User ID
        {
          userId: newAuthUser.$id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          campusId: formData.campusId,
          phone: formData.phone,
          university: formData.university,
        }
      );

      navigate('/admin/users');
    } catch (err: any) {
      console.error('Error creating user auth and profile:', err);
      setError(err.message || 'Failed to create user account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <Header 
        title="Add New User"
        description="Register a new platform account, generate auth credentials, and assign institutional roles."
        icon={<UserPlus className="w-6 h-6" />}
      />

      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Temporary Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Initial Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">System Role</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full appearance-none bg-slate-50/50 border border-slate-200/80 text-slate-700 text-sm rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs transition-all font-medium cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Campus ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Campus ID</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  name="campusId"
                  value={formData.campusId}
                  onChange={handleChange}
                  placeholder="e.g. MTU/SCI/22/1234"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +234..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* University */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">University</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  placeholder="e.g. Mountain Top University"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white  text-sm hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateNewUser.displayName = 'CreateNewUser';

export default CreateNewUser;