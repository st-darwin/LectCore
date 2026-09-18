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
  ChevronDown
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
  [key: string]: string; // Maps course document ID -> courseCode
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

  // Fetch announcements and courses simultaneously to map courseId -> courseCode
  const fetchData = async () => {
    try {
      setLoading(true);
      const [announcementsRes, coursesRes] = await Promise.all([
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.announcementsId),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId)
      ]);

      // Build a lookup map: { [documentId]: courseCode }
      const map: CourseMap = {};
      coursesRes.documents.forEach((doc: any) => {
        map[doc.$id] = doc.courseCode || doc.title || 'General';
      });

      setCourseMap(map);
      setAnnouncements(announcementsRes.documents as unknown as Announcement[]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load announcements from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle deletion of an announcement
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      setDeletingId(id);
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        id
      );
      setAnnouncements((prev) => prev.filter((item) => item.$id !== id));
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

  // Helper to resolve course display name
  const getCourseDisplay = (courseId: string) => {
    if (!courseId || courseId === 'all') return 'All Courses';
    return courseMap[courseId] || courseId; // Fallbacks to ID if code isn't found
  };

  // Filter announcements based on search query, priority, and resolved course code
  const filteredAnnouncements = announcements.filter((item) => {
    const courseCode = getCourseDisplay(item.courseId).toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseCode.includes(searchTerm.toLowerCase()) ||
      item.courseId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  // Priority styling helper
  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-3">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <AdminHeader 
          title="System Announcements"
          description="View, filter, and manage broadcasts sent to students across courses."
          icon={<Megaphone className="w-6 h-6" />}
          badgeText="Broadcasts Feed"
        />
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Clean Responsive Filter and Search Controls */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, content, or course code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium hidden xs:inline">Priority:</span>
          </div>
          <div className="relative w-full sm:w-44">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Announcements List Grid */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Announcements Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchTerm || priorityFilter !== 'all' 
              ? 'Try adjusting your search query or priority filter.' 
              : 'No broadcasts have been dispatched to the database yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((item) => (
            <div 
              key={item.$id}
              className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      Course: {getCourseDisplay(item.courseId)}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${getPriorityBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(item.$createdAt).toLocaleDateString()} at {new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <button
                  onClick={() => handleDelete(item.$id)}
                  disabled={deletingId === item.$id}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Delete Announcement"
                >
                  {deletingId === item.$id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

ViewAnnouncement.displayName = 'ViewAnnouncement';

export default ViewAnnouncement;