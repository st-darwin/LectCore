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
  Sparkles
} from 'lucide-react';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    courses: 0,
    materials: 0,
    enrollments: 0,
    assignments: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch metrics from your Appwrite collections on load
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch document counts or lists in parallel using Appwrite queries
        const [coursesRes, materialsRes, enrollmentsRes, assignmentsRes] = await Promise.all([
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseMaterialsId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.enrollmentsId),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId),
        ]);

        setStats({
          courses: coursesRes.total,
          materials: materialsRes.total,
          enrollments: enrollmentsRes.total,
          assignments: assignmentsRes.total,
        });
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statCards = [
    { 
      label: 'Active Courses', 
      value: stats.courses, 
      icon: <BookOpen className="w-5 h-5 text-indigo-600" />, 
      bg: 'bg-indigo-50 border-indigo-100',
      link: '/admin/courses' 
    },
    { 
      label: 'Course Materials', 
      value: stats.materials, 
      icon: <Files className="w-5 h-5 text-blue-600" />, 
      bg: 'bg-blue-50 border-blue-100',
      link: '/admin/materials' 
    },
    { 
      label: 'Student Enrollments', 
      value: stats.enrollments, 
      icon: <Users className="w-5 h-5 text-emerald-600" />, 
      bg: 'bg-emerald-50 border-emerald-100',
      link: '/admin/enrollments' 
    },
    { 
      label: 'Assignments', 
      value: stats.assignments, 
      icon: <ClipboardList className="w-5 h-5 text-amber-600" />, 
      bg: 'bg-amber-50 border-amber-100',
      link: '/admin/assignments' 
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2">
      {/* Welcome Header */}
      <AdminHeader 
        title="Admin Control Center"
        description="Monitor system activity, manage academic courses, and publish updates."
        icon={<Layers className="w-6 h-6" />}
        badgeText="Overview"
      />

      {/* Quick Action Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> System Operational
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome back, Administrator</h2>
            <p className="text-xs sm:text-sm text-indigo-200/80">
              Ready to manage course contents or upload lecture resources? Jump right into creating a new course record.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admin/courses/new"
              className="px-5 py-3 rounded-xl bg-white text-indigo-900 font-semibold text-xs hover:bg-indigo-50 transition-all shadow-md inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Course
            </Link>
            <Link
              to="/admin/announcements"
              className="px-5 py-3 rounded-xl bg-indigo-700/80 border border-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-md inline-flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" /> Post Announcement
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
            className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group relative overflow-hidden"
          >
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
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : card.value}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary Dashboard Sections (Quick Shortcuts & Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Shortcuts Card */}
        <div className="lg:col-span-1 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-slate-950/5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" /> Management Shortcuts
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

        {/* System Activity / Notice Card */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-slate-950/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" /> Semester Status
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
              Active Session
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800">Database Connection Confirmed</p>
            <p>
              Your Appwrite instance is successfully synchronized. All student enrollments, course catalogs, and assignment buckets are ready for administration. Use the left navigation panel or quick buttons above to manage system documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;