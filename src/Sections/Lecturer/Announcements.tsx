import { useState, useEffect } from 'react';
import Header from '../../Components/Header';
import { useLoaderData } from 'react-router-dom';
import { Plus, Trash2, Loader2, MessageSquarePlus, Megaphone, X, AlertCircle, Info, Calendar, BookOpen, ChevronDown } from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { ID, Query } from 'appwrite';

export const Loader = async () => {
  const user = await account.get();
  return user;
};

interface Course {
  $id: string;
  courseTitle?: string;
  title?: string;
  courseCode: string;
}

interface Announcement {
  $id: string;
  title: string;
  content: string;
  priority: string;
  courseId: string;
  $createdAt: string;
}

const Announcements = () => {
  const user = useLoaderData() as { $id: string };
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [priority, setPriority] = useState<string>('normal');
  const [courseId, setCourseId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [user.$id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all courses from both possible collection IDs and lecturer announcements in parallel
      const [coursesRes, altCoursesRes, announcementsRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId || 'courses',
          [Query.orderDesc('$createdAt')]
        ).catch(() => ({ documents: [] })),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.coursesId || 'course',
          [Query.orderDesc('$createdAt')]
        ).catch(() => ({ documents: [] })),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsId,
          [Query.equal('lecturerId', user.$id), Query.orderDesc('$createdAt')]
        )
      ]);

      const combinedCourses = [
        ...(coursesRes.documents || []),
        ...(altCoursesRes.documents || [])
      ] as unknown as Course[];

      // Deduplicate courses by $id
      const uniqueCourses = Array.from(
        new Map(combinedCourses.map(c => [c.$id, c])).values()
      );

      setCourses(uniqueCourses);
      if (uniqueCourses.length > 0 && !courseId) {
        setCourseId(uniqueCourses[0].$id);
      }

      setAnnouncements(announcementsRes.documents as unknown as Announcement[]);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !courseId) return;

    try {
      setSubmitting(true);
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        ID.unique(),
        {
          lecturerId: user.$id,
          courseId,
          title: title.trim(),
          content: content.trim(),
          priority,
        }
      );

      setTitle('');
      setContent('');
      setPriority('normal');
      if (courses.length > 0) setCourseId(courses[0].$id);
      setIsModalOpen(false);
      
      // Refresh announcements list
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId,
        [Query.equal('lecturerId', user.$id), Query.orderDesc('$createdAt')]
      );
      setAnnouncements(response.documents as unknown as Announcement[]);
    } catch (err: any) {
      console.error("Failed to create announcement:", err);
      alert(err?.message || "Failed to post announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.announcementsId, id);
      setAnnouncements(announcements.filter((a) => a.$id !== id));
    } catch (err) {
      console.error("Failed to delete announcement:", err);
    }
  };

  const getCourseDetails = (cId: string) => {
    return courses.find(c => c.$id === cId);
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      <Header
        title="Class Announcements"
        description="Broadcast real-time updates, deadline modifications, and notifications to your students."
        ctaText="New Announcement"
        ctaUrl="#"
        icon={<Megaphone size={20} />}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/85 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Megaphone size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wider uppercase">Active Broadcasts</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-extrabold border border-indigo-100">
                {announcements.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Manage live communications visible on student dashboards.</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Plus size={16} />
          <span>Post Announcement</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-28 bg-white/40 rounded-[2.5rem] border border-slate-200/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {announcements.map((item) => {
            const isUrgent = item.priority === 'urgent';
            const course = getCourseDetails(item.courseId);
            return (
              <div
                key={item.$id}
                className={`group relative p-7 rounded-[2.5rem] backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-xl ${
                  isUrgent 
                    ? 'bg-gradient-to-br from-rose-50/70 via-white/90 to-white border-rose-200/80 hover:border-rose-300' 
                    : 'bg-gradient-to-br from-white/95 to-white/70 border-slate-200/70 hover:border-indigo-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${
                        isUrgent 
                          ? 'bg-rose-100/80 text-rose-700 border-rose-200' 
                          : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {isUrgent ? <AlertCircle size={12} /> : <Info size={12} />}
                        {item.priority}
                      </span>

                      {course && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <BookOpen size={11} className="text-slate-400" />
                          {course.courseCode}
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <Calendar size={13} className="text-slate-300" />
                      {new Date(item.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {item.title}
                  </h4>
                  
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {item.content}
                  </p>
                </div>

                <div className="pt-5 mt-6 border-t border-slate-100/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Broadcast ID: {item.$id.slice(0, 6)}...
                  </span>

                  <button
                    onClick={() => handleDelete(item.$id)}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Delete Announcement"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 rounded-[2.5rem] bg-white/40 border border-dashed border-slate-200 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <MessageSquarePlus size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No announcements posted yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Keep your students informed and aligned by publishing your first classroom broadcast above.
          </p>
        </div>
      )}

      {/* Soft Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">New Announcement</h3>
                <p className="text-xs text-slate-400 mt-0.5">Publish a notification instantly to student dashboards.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2.5 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Course</label>
                <div className="relative">
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium appearance-none cursor-pointer"
                  >
                    {courses.length === 0 ? (
                      <option value="">No courses available. Create a course first.</option>
                    ) : (
                      courses.map((course) => (
                        <option key={course.$id} value={course.$id}>
                          {course.courseCode} — {course.courseTitle || course.title || 'Untitled Course'}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-semester test schedule update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Priority Level</label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="normal">Normal (Routine Update)</option>
                    <option value="urgent">Urgent (High Priority Alert)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write clear instructions or announcement details here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || courses.length === 0}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? 'Publishing...' : 'Publish Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;