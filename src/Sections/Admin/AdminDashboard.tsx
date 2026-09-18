import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Files, 
  Users, 
  Megaphone, 
  ClipboardList, 
  Plus, 
  ArrowUpRight, 
  Layers, 
  Loader2,
  Calendar,
  Sparkles,
  Activity,
  CheckCircle2,
  Database,
  ShieldCheck,
  Send,
  Clock,
  UserCheck,
  FileText
} from 'lucide-react';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface RecentItem {
  id: string;
  title: string;
  time: string;
  type: 'course' | 'material' | 'enrollment' | 'submission' | 'announcement';
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    courses: 0,
    materials: 0,
    enrollments: 0,
    assignments: 0,
    submissions: 0,
    users: 0,
    announcements: 0,
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [recentFeed, setRecentFeed] = useState<RecentItem[]>([]);
  
  // Broadcast state
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [announcementPriority, setAnnouncementPriority] = useState<string>('normal');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);
  const [broadcastError, setBroadcastError] = useState<string>('');

  // Fetch live metrics and logs from Appwrite collections on load
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [
          coursesRes,
          materialsRes,
          enrollmentsRes,
          assignmentsRes,
          submissionsRes,
          usersRes,
          announcementsRes
        ] = await Promise.all([
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseMaterialsId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.enrollmentsId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.submissionsId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.userCollectionId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.announcementsId),
        ]);

        setStats({
          courses: coursesRes.total,
          materials: materialsRes.total,
          enrollments: enrollmentsRes.total,
          assignments: assignmentsRes.total,
          submissions: submissionsRes.total,
          users: usersRes.total,
          announcements: announcementsRes.total,
        });

        // Combine recent documents to build a dynamic activity feed
        const feedItems: RecentItem[] = [
          ...coursesRes.documents.map((doc: any) => ({
            id: doc.$id,
            title: `New course added: ${doc.courseCode} - ${doc.courseTitle}`,
            time: doc.$createdAt,
            type: 'course' as const,
          })),
          ...materialsRes.documents.map((doc: any) => ({
            id: doc.$id,
            title: `Material uploaded: ${doc.title}`,
            time: doc.$createdAt,
            type: 'material' as const,
          })),
          ...enrollmentsRes.documents.map((doc: any) => ({
            id: doc.$id,
            title: `Student enrolled in course`,
            time: doc.$createdAt,
            type: 'enrollment' as const,
          })),
          ...submissionsRes.documents.map((doc: any) => ({
            id: doc.$id,
            title: `New assignment submission received`,
            time: doc.$createdAt,
            type: 'submission' as const,
          })),
          ...announcementsRes.documents.map((doc: any) => ({
            id: doc.$id,
            title: `Announcement: ${doc.title}`,
            time: doc.$createdAt,
            type: 'announcement' as const,
          }))
        ];

        // Sort descending by creation date
        feedItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentFeed(feedItems.slice(0, 6)); // Keep top 6 most recent activities

      } catch (error) {
        console.error('Error fetching live Appwrite metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementText.trim()) return;

    setIsBroadcasting(true);
    setBroadcastError('');

    try {
      // Writing live announcement to Appwrite
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        'unique()',
        {
          lecturerId: 'admin-system', // Or current logged-in user id
          courseId: 'all',            // General broadcast
          title: announcementTitle,
          content: announcementText,
          priority: announcementPriority,
        }
      );

      setBroadcastSuccess(true);
      setAnnouncementTitle('');
      setAnnouncementText('');
      setTimeout(() => setBroadcastSuccess(false), 4000);
    } catch (error: any) {
      console.error('Failed to publish announcement:', error);
      setBroadcastError(error.message || 'Failed to dispatch announcement.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const statCards = [
    { 
      label: 'Active Courses', 
      value: stats.courses, 
      icon: <BookOpen className="w-5 h-5 text-indigo-600" />, 
      bg: 'bg-indigo-50 border-indigo-100',
      link: '/admin/courses',
      helper: `${stats.users} registered users`
    },
    { 
      label: 'Course Materials', 
      value: stats.materials, 
      icon: <Files className="w-5 h-5 text-blue-600" />, 
      bg: 'bg-blue-50 border-blue-100',
      link: '/admin/materials',
      helper: 'Uploaded documents & PDFs'
    },
    { 
      label: 'Student Enrollments', 
      value: stats.enrollments, 
      icon: <Users className="w-5 h-5 text-emerald-600" />, 
      bg: 'bg-emerald-50 border-emerald-100',
      link: '/admin/enrollments',
      helper: 'Active student mappings'
    },
    { 
      label: 'Assignments & Subs', 
      value: `${stats.assignments} / ${stats.submissions}`, 
      icon: <ClipboardList className="w-5 h-5 text-amber-600" />, 
      bg: 'bg-amber-50 border-amber-100',
      link: '/admin/assignments',
      helper: 'Tasks posted / Submissions'
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2">
      {/* Welcome Header */}
      <AdminHeader 
        title="Admin Control Center"
        description="Live overview synced directly with your Appwrite database clusters."
        icon={<Layers className="w-6 h-6" />}
        badgeText="Live Data"
      />

      {/* Quick Action Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Appwrite Cloud Connected
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">System Administration Hub</h2>
            <p className="text-xs sm:text-sm text-indigo-200/85 leading-relaxed">
              Total Announcements Broadcasted: <span className="font-semibold text-white">{stats.announcements}</span> | Total Platform Users: <span className="font-semibold text-white">{stats.users}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/admin/courses/new"
              className="px-4.5 py-2.5 rounded-xl bg-white text-indigo-950 font-semibold text-xs hover:bg-indigo-50 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Course
            </Link>
            <Link
              to="/admin/enrollments"
              className="px-4.5 py-2.5 rounded-xl bg-indigo-800/80 border border-indigo-700 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Manage Enrollments
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${card.bg} border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105`}>
                  {card.icon}
                </div>
                <span className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> : card.value}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span>{card.helper}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Live Activity Feed & Quick Management/Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Activity Feed */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-slate-950/5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Live Database Stream
            </h3>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Real-time sync
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : recentFeed.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No recent activity logs recorded yet.</p>
            ) : (
              recentFeed.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-indigo-100 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(act.time).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 text-[10px] font-medium capitalize">
                    {act.type}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* System Health Status Panel */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-100/60 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Database ID</p>
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 truncate max-w-[140px]">
                  <CheckCircle2 className="w-3 h-3 shrink-0" /> {appwriteConfig.databaseId}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-100/60 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Project ID</p>
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 truncate max-w-[140px]">
                  <CheckCircle2 className="w-3 h-3 shrink-0" /> {appwriteConfig.projectId}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-100/60 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Storage Bucket</p>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{appwriteConfig.storageId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Shortcuts & Live Announcement Broadcast Widget */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Management Shortcuts */}
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-slate-950/5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <Link 
                to="/admin/courses" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 text-xs font-semibold text-slate-700 transition-all group"
              >
                <span>Manage Courses Library</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </Link>
              <Link 
                to="/admin/materials" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 text-xs font-semibold text-slate-700 transition-all group"
              >
                <span>Upload Lecture Notes & PDFs</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </Link>
              <Link 
                to="/admin/assignments" 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 text-xs font-semibold text-slate-700 transition-all group"
              >
                <span>Review Submissions</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </Link>
            </div>
          </div>

          {/* Live Announcement Creator Card */}
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-slate-950/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" /> Dispatch Announcement
              </h3>
            </div>
            
            <form onSubmit={handleBroadcast} className="space-y-3">
              <input
                type="text"
                placeholder="Announcement Title..."
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <textarea
                rows={3}
                placeholder="Type notice content to save to Appwrite database..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Priority:</span>
                <select
                  value={announcementPriority}
                  onChange={(e) => setAnnouncementPriority(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isBroadcasting || !announcementTitle.trim() || !announcementText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving to Database...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Broadcast Notice
                  </>
                )}
              </button>

              {broadcastSuccess && (
                <p className="text-[11px] text-emerald-600 font-medium text-center bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                  Announcement successfully saved and broadcasted!
                </p>
              )}

              {broadcastError && (
                <p className="text-[11px] text-red-600 font-medium text-center bg-red-50 py-1.5 rounded-lg border border-red-100">
                  {broadcastError}
                </p>
              )}
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;