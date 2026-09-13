import { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Calendar, 
  BookOpen, 
  Loader2, 
  Sparkles,
  Layers,
  Clock,
  Pin,
  CheckCheck,
  Info,
  Search,
  BellRing
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Announcement {
  $id: string;
  title: string;
  content: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  $createdAt: string;
  priority?: 'high' | 'normal' | 'pinned';
}

const StudentAnnouncement = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id)]
      );

      const courseIds = enrollmentsRes.documents.map((doc: any) => doc.courseId);

      if (courseIds.length === 0) {
        setAnnouncements([]);
        return;
      }

      const announcementsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId || 'announcements',
        [Query.equal('courseId', courseIds), Query.orderDesc('$createdAt')]
      );

      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('$id', courseIds)]
      );

      const courseMap = new Map();
      coursesRes.documents.forEach((c: any) => {
        courseMap.set(c.$id, { code: c.courseCode, title: c.courseTitle });
      });

      const formattedAnnouncements = announcementsRes.documents.map((doc: any) => {
        const courseInfo = courseMap.get(doc.courseId) || {};
        return {
          ...doc,
          courseCode: courseInfo.code || 'GEN',
          courseTitle: courseInfo.title || 'General Course',
          priority: doc.priority || 'normal'
        };
      });

      setAnnouncements(formattedAnnouncements as Announcement[]);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    const matchesFilter = selectedFilter === 'all' || item.courseId === selectedFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.courseCode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const enrolledCourseList = Array.from(
    new Set(announcements.map(a => JSON.stringify({ id: a.courseId, code: a.courseCode })))
  ).map(str => JSON.parse(str));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-36 bg-gradient-to-b from-indigo-50/40 via-white/80 to-sky-50/20 backdrop-blur-2xl rounded-[2.5rem] border border-indigo-50 shadow-xs">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
          <p className="text-xs text-slate-400 tracking-wide">Syncing updates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 px-3 sm:px-0 text-slate-600">
      
      {/* Header Banner - Soft pastel gradient with glowing aura */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50/70 via-sky-50/40 to-teal-50/30 backdrop-blur-2xl p-7 sm:p-9 rounded-[2.5rem] border border-indigo-100/60 shadow-xs">
        <div className="absolute right-[-10%] top-[-30%] w-72 h-72 bg-gradient-to-br from-indigo-200/30 to-sky-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-indigo-100/80 text-xs text-indigo-600 shadow-2xs">
              <Megaphone size={13} className="text-indigo-500" />
              <span>Campus Broadcast</span>
            </div>
            <h1 className="text-2xl sm:text-3xl tracking-tight text-slate-800">
              Course Announcements
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
              Stay synchronized with real-time updates, schedule adjustments, and notes posted directly by your lecturers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 border border-indigo-100/60 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/60 focus:border-indigo-300 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Quick Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-3.5 rounded-2.5rem border border-slate-100/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-2xs ${
              selectedFilter === 'all'
                ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 shadow-xs'
                : 'bg-slate-50/80 text-slate-500 border border-slate-100 hover:bg-indigo-50/40 hover:text-indigo-600'
            }`}
          >
            <Layers size={13} className={selectedFilter === 'all' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>All Updates ({announcements.length})</span>
          </button>
          {enrolledCourseList.map((course: any) => (
            <button
              key={course.id}
              onClick={() => setSelectedFilter(course.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-2xs ${
                selectedFilter === course.id
                  ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/60 shadow-xs'
                  : 'bg-slate-50/80 text-slate-500 border border-slate-100 hover:bg-indigo-50/40 hover:text-indigo-600'
              }`}
            >
              <BookOpen size={13} className={selectedFilter === course.id ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{course.code}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-1 bg-indigo-50/40 rounded-xl border border-indigo-50">
          <Info size={13} className="text-indigo-400 shrink-0" />
          <span>Showing enrolled modules</span>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((item) => (
            <div 
              key={item.$id}
              className="p-6 sm:p-7 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-slate-100/90 shadow-2xs space-y-4 hover:border-indigo-200/80 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/30 via-transparent to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100/80">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-indigo-50/80 border border-indigo-100/80 text-xs text-indigo-600 flex items-center gap-1.5 shadow-2xs">
                    <BookOpen size={12} className="text-indigo-500" />
                    {item.courseCode}
                  </span>
                  <span className="text-xs text-slate-400">{item.courseTitle}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-1 rounded-xl border border-slate-100 shadow-2xs">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{new Date(item.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50/80 px-3 py-1 rounded-xl border border-slate-100 shadow-2xs">
                    <Clock size={13} className="text-slate-400" />
                    <span>{new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h2 className="text-base sm:text-lg text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed whitespace-pre-wrap bg-gradient-to-br from-slate-50/70 to-indigo-50/20 p-5 rounded-2xl border border-slate-100/80">
                  {item.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100/60 shadow-2xs">
                  <CheckCheck size={13} />
                  Verified Notice
                </span>
                <span className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50/60 px-2.5 py-1 rounded-lg border border-indigo-100/60 shadow-2xs">
                  <Pin size={12} />
                  Official Broadcast
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 space-y-3.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
              <BellRing size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-700">No Announcements Found</p>
              <p className="text-[11px] text-slate-400">There are currently no instructor updates matching your criteria.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentAnnouncement;