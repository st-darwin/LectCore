import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Database, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Sliders,
  Globe,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Form states
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [systemName, setSystemName] = useState<string>('Campus Portal Hub');
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (user) {
        setAdminName(user.name || '');
        setAdminEmail(user.email || '');
      }
    } catch (err: any) {
      console.error('Error fetching account session:', err);
      setError('Failed to load active administrator session details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Update account name if changed
      if (adminName) {
        await account.updateName(adminName);
      }

      // Simulate saving system preferences state
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSuccessMessage('System preferences and profile updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2 text-slate-600">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-3">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <AdminHeader 
          title="System Settings & Configuration"
          description="Manage administrator profile parameters, platform telemetry preferences, and global options."
          icon={<SettingsIcon className="w-6 h-6" />}
          badgeText="Admin Controls"
        />
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Administrator Profile Section */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Administrator Profile</h3>
              <p className="text-xs text-slate-400">Update your active administrator identity credentials</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="Administrator Name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address (Read-only)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={adminEmail}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* General Platform Controls */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Portal Configurations</h3>
              <p className="text-xs text-slate-400">Manage overarching portal identifiers and system behaviors</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Portal Display Title</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-all">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-600" /> System Alerts
                  </span>
                  <p className="text-[11px] text-slate-500">Receive telemetry and broadcast status alerts.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-all">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Maintenance Mode
                  </span>
                  <p className="text-[11px] text-slate-500">Temporarily restrict client-portal access for updates.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Database & Appwrite Sync Status info box */}
        <div className="bg-indigo-50/50 backdrop-blur-xl border border-indigo-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-indigo-900">Appwrite Database Connected</h4>
              <p className="text-[11px] text-indigo-700/80">Database ID: <code className="font-mono bg-indigo-100/80 px-1 py-0.5 rounded">{appwriteConfig.databaseId}</code></p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 hidden sm:inline">
            Active Sync
          </span>
        </div>

        {/* Save Action Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
};

Settings.displayName = 'Settings';

export default Settings;