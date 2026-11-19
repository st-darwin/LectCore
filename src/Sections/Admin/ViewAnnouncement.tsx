
import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Search,
  Trash2,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Filter,
  ChevronDown,
  Clock,
  X,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface Announcement {
  $id: string;
  lecturerId: string;
  courseId: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent' | string;
  $createdAt: string;
}

interface CourseMap {
  [key: string]: string;
}

const ViewAnnouncement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courseMap, setCourseMap] = useState<CourseMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch announcements and courses
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [announcementsRes, coursesRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsId
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId
        )
      ]);

      const map: CourseMap = {};

      coursesRes.documents.forEach((doc: any) => {
        map[doc.$id] = doc.courseCode || doc.title || 'General';
      });

      setCourseMap(map);
      setAnnouncements(
        announcementsRes.documents as unknown as Announcement[]
      );
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Delete announcement
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      setDeletingId(id);
      setError('');

      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        id
      );

      setAnnouncements((prev) =>
        prev.filter((item) => item.$id !== id)
      );

      setSuccessMessage('Announcement deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setError(err.message || 'Failed to delete announcement.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  // Resolve course name
  const getCourseDisplay = (courseId: string) => {
    if (!courseId || courseId === 'all') return 'All Courses';
    return courseMap[courseId] || courseId;
  };

  // Normalize priority
  const getPriority = (priority: string) =>
    String(priority || 'normal').toLowerCase();

  // Filter announcements
  const filteredAnnouncements = announcements.filter((item) => {
    const courseCode = getCourseDisplay(item.courseId).toLowerCase();
    const query = searchTerm.toLowerCase().trim();

    const matchesSearch =
      item.title?.toLowerCase().includes(query) ||
      item.content?.toLowerCase().includes(query) ||
      courseCode.includes(query) ||
      item.courseId?.toLowerCase().includes(query);

    const matchesPriority =
      priorityFilter === 'all' ||
      getPriority(item.priority) === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const urgentCount = announcements.filter(
    (item) => getPriority(item.priority) === 'urgent'
  ).length;

  const highCount = announcements.filter(
    (item) => getPriority(item.priority) === 'high'
  ).length;

  const normalCount = announcements.filter(
    (item) => getPriority(item.priority) === 'normal'
  ).length;

  // Priority badge
  const getPriorityBadge = (priority: string) => {
    const value = getPriority(priority);

    if (value === 'urgent') {
      return 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-600 border-rose-200/80';
    }

    if (value === 'high') {
      return 'bg-gradient-to-r from-rose-50/70 to-orange-50/60 text-rose-500 border-rose-100';
    }

    return 'bg-[#f5f2ff] text-[#8064cb] border-[#e9e2ff]';
  };

  const getPriorityLabel = (priority: string) => {
    const value = getPriority(priority);

    if (value === 'urgent') return 'Urgent';
    if (value === 'high') return 'High priority';

    return 'Normal';
  };

  const getPriorityIcon = (priority: string) => {
    const value = getPriority(priority);

    if (value === 'urgent' || value === 'high') {
      return <AlertCircle size={12} />;
    }

    return null;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-5 lg:px-7 pb-16 pt-2 space-y-6 text-slate-600">

      {/* Header */}
      <div className="space-y-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8064cb] hover:text-[#6e52b8] transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <AdminHeader
          title="System Announcements"
          description="View and manage announcements sent across courses."
          icon={<Megaphone size={20} />}
          badgeText="Broadcasts Feed"
        />
      </div>

      {/* Feedback */}
      {successMessage && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-700 text-xs">
          <CheckCircle2 size={15} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-rose-50/70 border border-rose-100 text-rose-600 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>

          <button
            onClick={() => setError('')}
            className="text-rose-400 hover:text-rose-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">
            Total announcements
          </p>
          <p className="text-xl font-semibold text-slate-800 mt-1 tabular-nums">
            {announcements.length}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">
            Normal
          </p>
          <p className="text-xl font-semibold text-[#8064cb] mt-1 tabular-nums">
            {normalCount}
          </p>
        </div>

        <div className="bg-white border border-rose-100 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-medium">
            High priority
          </p>
          <p className="text-xl font-semibold text-rose-500 mt-1 tabular-nums">
            {highCount}
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-xl p-4">
          <p className="text-[11px] text-rose-500/80 font-medium">
            Urgent
          </p>
          <p className="text-xl font-semibold text-rose-600 mt-1 tabular-nums">
            {urgentCount}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-lg bg-slate-50/80 border border-slate-100 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#d9cefa] focus:ring-2 focus:ring-[#f1edff] transition-all"
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative sm:w-48">
            <Filter
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50/80 border border-slate-100 text-xs font-medium text-slate-600 rounded-lg pl-9 pr-9 py-3 outline-none focus:bg-white focus:border-[#d9cefa] focus:ring-2 focus:ring-[#f1edff] transition-all cursor-pointer"
            >
              <option value="all">All priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>

            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 px-1">
          <p className="text-[11px] text-slate-400">
            Showing{' '}
            <span className="text-slate-600 font-medium">
              {filteredAnnouncements.length}
            </span>{' '}
            of {announcements.length} announcements
          </p>

          {(searchTerm || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPriorityFilter('all');
              }}
              className="text-[11px] text-[#8064cb] hover:text-[#6e52b8] font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Announcement list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={22} className="animate-spin text-[#9276d5]" />
          <p className="text-xs text-slate-400">
            Loading announcements...
          </p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl py-16 px-5 text-center">
          <div className="w-11 h-11 rounded-xl bg-[#f5f2ff] border border-[#eee8ff] text-[#9276d5] flex items-center justify-center mx-auto mb-3">
            <Megaphone size={18} />
          </div>

          <h3 className="text-sm font-semibold text-slate-700">
            No announcements found
          </h3>

          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {searchTerm || priorityFilter !== 'all'
              ? 'Try adjusting your search or priority filter.'
              : 'No announcements have been created yet.'}
          </p>

          {(searchTerm || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPriorityFilter('all');
              }}
              className="mt-4 text-xs font-medium text-[#8064cb] hover:text-[#6e52b8]"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((item) => {
            const priority = getPriority(item.priority);
            const isUrgent = priority === 'urgent';
            const isHigh = priority === 'high';
            const isElevated = isUrgent || isHigh;

            return (
              <article
                key={item.$id}
                className={`relative overflow-hidden bg-white border rounded-xl p-4 sm:p-5 transition-all duration-200 ${
                  isUrgent
                    ? 'border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/40'
                    : isHigh
                    ? 'border-rose-100 bg-gradient-to-br from-rose-50/30 via-white to-orange-50/20'
                    : 'border-slate-100 hover:border-[#e6ddff]'
                }`}
              >
                {isElevated && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                      isUrgent
                        ? 'bg-gradient-to-b from-rose-400 to-orange-300'
                        : 'bg-gradient-to-b from-rose-300 to-orange-200'
                    }`}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f3efff] border border-[#e9e2ff] text-[#8064cb] text-[10px] font-medium">
                        <BookOpen size={11} />
                        {getCourseDisplay(item.courseId)}
                      </span>

                      {item.courseId === 'all' && (
                        <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md font-medium">
                          System-wide
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-semibold shrink-0 w-fit ${getPriorityBadge(item.priority)}`}
                  >
                    {getPriorityIcon(item.priority)}
                    {getPriorityLabel(item.priority)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed whitespace-pre-wrap break-words mt-3">
                  {item.content}
                </p>

                <div className="pt-4 mt-4 border-t border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={12} />
                      {formatDate(item.$createdAt)}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} />
                      {formatTime(item.$createdAt)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(item.$id)}
                    disabled={deletingId === item.$id}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-100 bg-rose-50/70 hover:bg-rose-100 text-rose-500 text-[11px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:w-fit w-full"
                    title="Delete announcement"
                  >
                    {deletingId === item.$id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    {deletingId === item.$id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

ViewAnnouncement.displayName = 'ViewAnnouncement';

export default ViewAnnouncement;
