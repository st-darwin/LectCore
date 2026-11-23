
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

  Activity,
  CheckCircle2,
  Database,
  ShieldCheck,
  Send,
  Clock,
  UserCheck,
  FileText,
  AlertCircle,

  X,
  Bell,
  ChevronRight
} from 'lucide-react';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface RecentItem {
  id: string;
  title: string;
  time: string;
  type: 'course' | 'material' | 'enrollment' | 'submission' | 'announcement';
}

interface Stats {
  courses: number;
  materials: number;
  enrollments: number;
  assignments: number;
  submissions: number;
  users: number;
  announcements: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
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

  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [announcementPriority, setAnnouncementPriority] = useState<string>('normal');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);
  const [broadcastError, setBroadcastError] = useState<string>('');

  // Fetch dashboard data
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

      const feedItems: RecentItem[] = [
        ...coursesRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: `New course added: ${doc.courseCode || doc.courseTitle || doc.title || 'Untitled course'}`,
          time: doc.$createdAt,
          type: 'course' as const,
        })),
        ...materialsRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: `Material uploaded: ${doc.title || 'Untitled material'}`,
          time: doc.$createdAt,
          type: 'material' as const,
        })),
        ...enrollmentsRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: 'Student enrolled in a course',
          time: doc.$createdAt,
          type: 'enrollment' as const,
        })),
        ...submissionsRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: 'New assignment submission received',
          time: doc.$createdAt,
          type: 'submission' as const,
        })),
        ...announcementsRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: `Announcement: ${doc.title || 'Untitled announcement'}`,
          time: doc.$createdAt,
          type: 'announcement' as const,
        }))
      ];

      feedItems.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setRecentFeed(feedItems.slice(0, 6));
    } catch (error) {
      console.error('Error fetching live Appwrite metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();
  }, []);

  // Broadcast announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!announcementTitle.trim() || !announcementText.trim()) return;

    setIsBroadcasting(true);
    setBroadcastError('');
    setBroadcastSuccess(false);

    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        'unique()',
        {
          lecturerId: 'admin-system',
          courseId: 'all',
          title: announcementTitle.trim(),
          content: announcementText.trim(),
          priority: announcementPriority,
        }
      );

      setAnnouncementTitle('');
      setAnnouncementText('');
      setAnnouncementPriority('normal');
      setBroadcastSuccess(true);

      await fetchRealData();

      setTimeout(() => setBroadcastSuccess(false), 4000);
    } catch (error: any) {
      console.error('Failed to publish announcement:', error);
      setBroadcastError(error.message || 'Failed to dispatch announcement.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Metric cards
  const statCards = [
    {
      label: 'Active Courses',
      value: stats.courses,
      icon: <BookOpen size={18} />,
      iconStyle: 'bg-[#f1edff] text-[#8568cf] border-[#e8e0ff]',
      link: '/admin/courses',
      helper: `${stats.users} registered users`
    },
    {
      label: 'Course Materials',
      value: stats.materials,
      icon: <Files size={18} />,
      iconStyle: 'bg-[#f0f3ff] text-[#7185d5] border-[#e4e9ff]',
      link: '/admin/materials',
      helper: 'Uploaded documents and PDFs'
    },
    {
      label: 'Student Enrollments',
      value: stats.enrollments,
      icon: <Users size={18} />,
      iconStyle: 'bg-[#edf8f3] text-[#53a582] border-[#dff0e7]',
      link: '/admin/enrollments',
      helper: 'Student course registrations'
    },
    {
      label: 'Assignments & Submissions',
      value: `${stats.assignments} / ${stats.submissions}`,
      icon: <ClipboardList size={18} />,
      iconStyle: 'bg-[#fff7ed] text-[#d99a51] border-[#f8ead7]',
      link: '/admin/assignments',
      helper: 'Tasks posted / Submissions'
    },
  ];

  // Activity icon
  const getActivityIcon = (type: RecentItem['type']) => {
    switch (type) {
      case 'course':
        return <BookOpen size={15} />;
      case 'material':
        return <Files size={15} />;
      case 'enrollment':
        return <UserCheck size={15} />;
      case 'submission':
        return <ClipboardList size={15} />;
      case 'announcement':
        return <Megaphone size={15} />;
      default:
        return <FileText size={15} />;
    }
  };

  const getActivityStyle = (type: RecentItem['type']) => {
    switch (type) {
      case 'course':
        return 'bg-[#f1edff] text-[#8568cf] border-[#e8e0ff]';
      case 'material':
        return 'bg-[#f0f3ff] text-[#7185d5] border-[#e4e9ff]';
      case 'enrollment':
        return 'bg-[#edf8f3] text-[#53a582] border-[#dff0e7]';
      case 'submission':
        return 'bg-[#fff7ed] text-[#d99a51] border-[#f8ead7]';
      case 'announcement':
        return 'bg-[#fdf0f5] text-[#c8789b] border-[#f8e2ec]';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const formatActivityTime = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return 'Unknown date';

    return parsedDate.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-7 space-y-6 pb-16 pt-2 text-slate-600">

      {/* Header */}
      <AdminHeader
        title="Admin Control Center"
        description="Monitor your platform, manage academic resources and oversee activity."
        icon={<Layers size={20} />}
        badgeText="Live Overview"
      />

      {/* Welcome / Quick Actions */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e9e2ff] bg-gradient-to-br from-white via-[#fbfaff] to-[#f3efff] p-5 sm:p-7">
        <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-[#e9e0ff]/50 blur-3xl pointer-events-none" />
        <div className="absolute right-36 -bottom-24 w-48 h-48 rounded-full bg-[#eee9ff]/60 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 border border-[#e9e2ff] text-[#8064cb] text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Platform connected
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">
                System Administration
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Your platform currently has{' '}
                <span className="font-semibold text-slate-700">
                  {loading ? '...' : stats.users}
                </span>{' '}
                registered users and{' '}
                <span className="font-semibold text-slate-700">
                  {loading ? '...' : stats.announcements}
                </span>{' '}
                system announcements.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <Link
              to="/admin/courses/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8064cb] hover:bg-[#7054ba] text-white text-xs font-medium transition-colors shadow-sm shadow-[#8064cb]/15"
            >
              <Plus size={15} />
              Create Course
            </Link>

            <Link
              to="/admin/enrollments"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#f8f6ff] border border-[#e8e1fa] text-[#7358b8] text-xs font-medium transition-colors"
            >
              <UserCheck size={15} />
              Manage Enrollments
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Platform Overview
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Current database statistics
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
            <Activity size={12} />
            Live metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <Link
              key={card.label}
              to={card.link}
              className="group bg-white border border-slate-100 hover:border-[#ded4fa] rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-[0_5px_20px_rgba(120,95,190,0.06)]"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${card.iconStyle}`}>
                  {card.icon}
                </div>

                <span className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 group-hover:text-[#8064cb] group-hover:bg-[#f5f2ff] transition-all">
                  <ArrowUpRight size={15} />
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-[11px] font-medium text-slate-400">
                  {card.label}
                </p>

                <div className="text-2xl font-semibold tracking-tight text-slate-800 tabular-nums">
                  {loading ? (
                    <Loader2 size={21} className="animate-spin text-[#9276d5]" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-[10px] text-slate-400">
                  {card.helper}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity and Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Activity Feed */}
        <section className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={16} className="text-[#8064cb]" />
                Recent Activity
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Latest updates across your platform
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 size={21} className="animate-spin text-[#9276d5]" />
                <p className="text-[11px] text-slate-400">
                  Loading activity...
                </p>
              </div>
            ) : recentFeed.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#f5f2ff] text-[#9276d5] flex items-center justify-center mx-auto mb-2">
                  <Activity size={17} />
                </div>
                <p className="text-xs font-medium text-slate-600">
                  No recent activity
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  New platform activity will appear here.
                </p>
              </div>
            ) : (
              recentFeed.map((act) => (
                <div
                  key={`${act.type}-${act.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-[#fcfbff] transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getActivityStyle(act.type)}`}>
                    {getActivityIcon(act.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed truncate">
                      {act.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {formatActivityTime(act.time)}
                    </p>
                  </div>

                  <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-medium text-slate-500 capitalize shrink-0">
                    {act.type}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* System Status */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-700">
                System Information
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Connected Appwrite resources
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#faf9ff] border border-[#f0edfa] min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#f0ebff] text-[#8064cb] flex items-center justify-center shrink-0">
                  <Database size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-medium">
                    Database ID
                  </p>
                  <p className="text-[10px] font-medium text-slate-600 truncate mt-0.5">
                    {appwriteConfig.databaseId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#faf9ff] border border-[#f0edfa] min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#f0ebff] text-[#8064cb] flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-medium">
                    Project ID
                  </p>
                  <p className="text-[10px] font-medium text-slate-600 truncate mt-0.5">
                    {appwriteConfig.projectId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#faf9ff] border border-[#f0edfa] min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#f0ebff] text-[#8064cb] flex items-center justify-center shrink-0">
                  <Files size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 font-medium">
                    Storage Bucket
                  </p>
                  <p className="text-[10px] font-medium text-slate-600 truncate mt-0.5">
                    {appwriteConfig.storageId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column */}
        <div className="space-y-5">

          {/* Quick Shortcuts */}
          <section className="bg-white border border-slate-100 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Layers size={16} className="text-[#8064cb]" />
                Quick Shortcuts
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Common management actions
              </p>
            </div>

            <div className="space-y-2">
              <Link
                to="/admin/courses"
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-[#f6f3ff] border border-slate-100 hover:border-[#e9e2ff] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f1edff] text-[#8568cf] flex items-center justify-center shrink-0">
                    <BookOpen size={15} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Manage Courses
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-[#8064cb] transition-colors shrink-0" />
              </Link>

              <Link
                to="/admin/materials"
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-[#f6f3ff] border border-slate-100 hover:border-[#e9e2ff] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f0f3ff] text-[#7185d5] flex items-center justify-center shrink-0">
                    <Files size={15} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Manage Course Materials
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-[#8064cb] transition-colors shrink-0" />
              </Link>

              <Link
                to="/admin/assignments"
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-[#f6f3ff] border border-slate-100 hover:border-[#e9e2ff] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#fff7ed] text-[#d99a51] flex items-center justify-center shrink-0">
                    <ClipboardList size={15} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Review Submissions
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-[#8064cb] transition-colors shrink-0" />
              </Link>

              <Link
                to="/admin/enrollments"
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-[#f6f3ff] border border-slate-100 hover:border-[#e9e2ff] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#edf8f3] text-[#53a582] flex items-center justify-center shrink-0">
                    <Users size={15} />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Manage Enrollments
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-[#8064cb] transition-colors shrink-0" />
              </Link>
            </div>
          </section>

          {/* Announcement Creator */}
          <section className="bg-white border border-slate-100 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Megaphone size={16} className="text-[#8064cb]" />
                  Dispatch Announcement
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Send a notice to all platform students
                </p>
              </div>

              <div className="w-8 h-8 rounded-lg bg-[#f1edff] text-[#8064cb] flex items-center justify-center shrink-0">
                <Bell size={15} />
              </div>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1.5">
                  Announcement title
                </label>
                <input
                  type="text"
                  placeholder="Enter a title..."
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  maxLength={120}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#d9cefa] focus:ring-2 focus:ring-[#f1edff] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Write your announcement..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#d9cefa] focus:ring-2 focus:ring-[#f1edff] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1.5">
                  Priority level
                </label>
                <select
                  value={announcementPriority}
                  onChange={(e) => setAnnouncementPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs text-slate-600 outline-none focus:bg-white focus:border-[#d9cefa] focus:ring-2 focus:ring-[#f1edff] transition-all cursor-pointer"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {broadcastSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px]">
                  <CheckCircle2 size={14} className="shrink-0" />
                  Announcement successfully broadcasted.
                </div>
              )}

              {broadcastError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[11px]">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{broadcastError}</span>
                  <button
                    type="button"
                    onClick={() => setBroadcastError('')}
                    className="ml-auto text-rose-400 hover:text-rose-600"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isBroadcasting ||
                  !announcementTitle.trim() ||
                  !announcementText.trim()
                }
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#8064cb] hover:bg-[#7054ba] text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#8064cb]/15"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Broadcast Announcement
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                This announcement will be published as a system-wide broadcast.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;
