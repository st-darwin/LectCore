import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Camera, 
  Save, 
  Loader2, 
  Shield, 
  Mail, 
  Hash, 
  Bell, 
  Trash2,
  Check, 
  AlertCircle,
  Eye,
  Phone,
  Building2,
  X,
  ExternalLink
} from 'lucide-react';
import { databases, account, storage, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface AppUser {
  $id: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  campusId: string;
  phone: string;
  university: string;
  avatarUrl?: string;
  lastSeen?: string;
}

export default function StudentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);

  const [currentAppUserId, setCurrentAppUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [campusId, setCampusId] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Preferences toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [compactView, setCompactView] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const authUser = await account.get();
      if (!authUser?.$id) return;

      const userDocs = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('userId', authUser.$id), Query.limit(1)]
      );

      if (userDocs.documents.length > 0) {
        const doc = userDocs.documents[0] as unknown as AppUser;
        setCurrentAppUserId(doc.$id);
        setName(doc.name || authUser.name || '');
        setEmail(doc.email || authUser.email || '');
        setCampusId(doc.campusId || '');
        setPhone(doc.phone || '');
        setUniversity(doc.university || '');
        setRole(doc.role || 'student');
        setAvatarUrl(doc.avatarUrl || '');
      } else {
        try {
          const doc = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            authUser.$id
          ) as unknown as AppUser;
          
          setCurrentAppUserId(doc.$id);
          setName(doc.name || authUser.name || '');
          setEmail(doc.email || authUser.email || '');
          setCampusId(doc.campusId || '');
          setPhone(doc.phone || '');
          setUniversity(doc.university || '');
          setRole(doc.role || 'student');
          setAvatarUrl(doc.avatarUrl || '');
        } catch (innerErr) {
          setCurrentAppUserId(authUser.$id);
          setName(authUser.name || '');
          setEmail(authUser.email || '');
        }
      }
    } catch (error) {
      console.error('Failed to load user profile settings:', error);
      setErrorMessage('Failed to load your profile settings. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentAppUserId) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        file
      );

      const fileViewUrl = storage.getFileView(appwriteConfig.storageId, uploadedFile.$id).toString();

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentAppUserId,
        { avatarUrl: fileViewUrl }
      );

      setAvatarUrl(fileViewUrl);
      setSuccessMessage('Profile picture updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error);
      setErrorMessage(error?.message || 'Failed to upload profile picture. Check storage permissions.');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAppUserId || !avatarUrl) return;

    const confirmed = window.confirm('Are you sure you want to delete your profile picture?');
    if (!confirmed) return;

    setDeletingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const match = avatarUrl.match(/\/files\/([^\/]+)\//);
      if (match && match[1]) {
        const fileId = match[1];
        try {
          await storage.deleteFile(appwriteConfig.storageId, fileId);
        } catch (storageErr) {
          console.warn('Could not delete file from storage bucket directly:', storageErr);
        }
      }

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentAppUserId,
        { avatarUrl: '' }
      );

      setAvatarUrl('');
      setSuccessMessage('Profile picture removed successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error('Failed to delete profile picture:', error);
      setErrorMessage(error?.message || 'Failed to delete profile picture.');
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAppUserId) return;

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentAppUserId,
        {
          name: name.trim(),
          campusId: campusId.trim(),
          phone: phone.trim(),
          university: university.trim(),
        }
      );

      setSuccessMessage('Settings and profile updated successfully in the database!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setErrorMessage(error?.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <p className="text-xs font-medium text-slate-500">Loading your settings from database...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 pb-16 pt-2 text-slate-600">
      <AdminHeader 
        title="Account Settings" 
        description="Manage your profile information, real database attributes, avatar picture, and account preferences."
        icon={<User className="w-5 h-5 text-indigo-600" />}
        badgeText="Preferences"
      />

      {successMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="leading-relaxed">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        
        {/* Left Column: Avatar & Summary Card */}
        <div className="md:col-span-1 bg-white border border-slate-200/70 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-indigo-50 border-4 border-indigo-50 flex items-center justify-center shadow-inner relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400 stroke-1" />
              )}
              {(uploadingAvatar || deletingAvatar) && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || deletingAvatar}
              title="Upload new profile picture"
              className="absolute bottom-0 right-0 p-2 sm:p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-1 w-full truncate px-2">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{name || 'User Profile'}</h3>
            <p className="text-xs text-slate-400 font-medium capitalize">{role}</p>
          </div>

          {/* Profile Picture Action Buttons */}
          {avatarUrl && (
            <div className="flex items-center gap-2 w-full pt-1">
              <button
                type="button"
                onClick={() => setShowImageViewer(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={deletingAvatar || uploadingAvatar}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </div>
          )}

          <div className="w-full pt-4 border-t border-slate-100 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Account Status</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">Active</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Access Role</span>
              <span className="font-semibold text-slate-700 capitalize">{role}</span>
            </div>
            <div className="flex items-center justify-between text-xs truncate">
              <span className="text-slate-400 font-medium">Institution</span>
              <span className="font-semibold text-slate-700 truncate max-w-[140px]" title={university}>{university || 'Not Specified'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Profile & App Settings Form */}
        <div className="md:col-span-2 bg-white border border-slate-200/70 rounded-3xl p-5 sm:p-8 shadow-xs">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Personal & Institutional Information</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed truncate"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Email linked securely via authentication account.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Campus ID / Matric Number</label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      disabled={role == 'student'}
                      value={campusId}
                      onChange={(e) => setCampusId(e.target.value)}
                      placeholder="e.g. MTU/2024/1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +234 800 000 0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">University / Institution</label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. Mountain Top University"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Access Role</label>
                  <div className="relative">
                    <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      value={role.toUpperCase()}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-500 capitalize cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Notification & App Preferences Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                <span>Notification & App Preferences</span>
              </h4>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 sm:p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition-all gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-800 block">Email Notifications</span>
                    <span className="text-[11px] text-slate-400 leading-snug block">Receive email alerts for direct messages, grades, and announcements.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 sm:p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition-all gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-800 block">Chat Sound Alerts</span>
                    <span className="text-[11px] text-slate-400 leading-snug block">Play a chime sound when a new message is received in chat.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 sm:p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition-all gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-800 block">Compact Dashboard Layout</span>
                    <span className="text-[11px] text-slate-400 leading-snug block">Optimize tables and cards layout for higher data density.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={compactView}
                    onChange={(e) => setCompactView(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* SaaS Minimalist Soft Light Profile Preview Modal */}
      {showImageViewer && avatarUrl && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowImageViewer(false)}
        >
          <div 
            className="relative max-w-sm w-full bg-white border border-slate-200/80 rounded-[28px] p-5 shadow-2xl shadow-indigo-500/5 flex flex-col items-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Title & Clean Close Button */}
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
               
                <h3 className="text-xs font-semibold text-slate-800 tracking-tight">Profile Picture View</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowImageViewer(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pristine Image Display Box */}
            <div className="w-full aspect-square max-h-[50vh] flex items-center justify-center overflow-hidden rounded-2xl bg-indigo-50/40 border border-indigo-100/60 p-2 shadow-inner">
              <img 
                src={avatarUrl} 
                alt="Profile Preview" 
                className="w-full h-full object-cover rounded-xl shadow-xs" 
              />
            </div>

            {/* SaaS Footer Details & Actions */}
            <div className="w-full flex items-center justify-between pt-4 mt-1 border-t border-slate-100">
              <div className="truncate pr-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium">High resolution view</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a 
                  href={avatarUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title="Open original in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
                <button 
                  type="button"
                  onClick={() => setShowImageViewer(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs  transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}