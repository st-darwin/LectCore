import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, ArrowRight, Loader2, Sparkles, TrendingUp, Bell, Award, Calendar, CheckCircle2, Clock, Plus, MessageSquare, ShieldCheck, GraduationCap, Users, BookMarked, Layers } from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

export const Loader = async () => {
    try {
        const user = await account.get();
        if (!user) { 
            console.log("No user found"); 
        }
        return user;
    } catch (err) {
        console.error("Authentication check failed:", err);
        throw err;
    }
};

interface Course {
    $id: string;
    courseCode: string;
    courseTitle: string;
    department: string;
    level: string;
}

interface Announcement {
    $id: string;
    title: string;
    content: string;
    priority: string;
    $createdAt: string;
}

const LecturerDashboard = () => {
  const user = useLoaderData() as { name: string | null; email: string; $id: string };
  const navigate = useNavigate();
  const lecturerName = user.name || "Lecturer";

  const [courses, setCourses] = useState<Course[]>([]);
  const [materialsCount, setMaterialsCount] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
    updateClock();
    const timer = setInterval(updateClock, 60000);
    return () => clearInterval(timer);
  }, [user.$id]);

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesRes, materialsRes, announcementsRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.equal('lecturerId', user.$id), Query.limit(6)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseMaterialsId,
          [Query.equal('uploadedBy', user.$id)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsId,
          [Query.equal('lecturerId', user.$id), Query.orderDesc('$createdAt'), Query.limit(4)]
        )
      ]);

      setCourses(coursesRes.documents as unknown as Course[]);
      setMaterialsCount(materialsRes.total);
      setAnnouncements(announcementsRes.documents as unknown as Announcement[]);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Soft Clean SaaS Hero Segment */}
      <div className="relative overflow-hidden p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 text-slate-900 shadow-xl shadow-indigo-100/50 border border-indigo-100/80">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-indigo-100 text-[11px] font-semibold text-indigo-700 shadow-xs">
                <Calendar size={13} className="text-indigo-500" />
                <span>{currentTime || 'Academic Session'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 backdrop-blur-md border border-emerald-200/60 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Faculty Portal</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">👋</span>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  Welcome back, {lecturerName}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
                Streamline your course delivery, publish real-time announcements, and empower student academic progression from your centralized faculty control center.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap pt-2 lg:pt-0">
            <button
              onClick={() => navigate('/lecturer/announcements')}
              className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-indigo-600 text-xs font-bold border border-indigo-200/70 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <MessageSquare size={15} className="text-indigo-500" />
              <span>Broadcast Update</span>
            </button>
            <button
              onClick={() => navigate('/lecturer/courses')}
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <GraduationCap size={16} />
              <span>Manage Courses</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Light Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 group hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-110 transition-transform">
            <BookOpen size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Courses</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{courses.length}</h3>
          </div>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 group hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-110 transition-transform">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Materials</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{materialsCount}</h3>
          </div>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 group hover:border-amber-300 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-110 transition-transform">
            <Award size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faculty Standing</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Verified</h3>
          </div>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 group hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-110 transition-transform">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Status</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Assigned Courses & Recent Announcements Stream */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">Assigned Curricula</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                  {courses.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/lecturer/courses')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xs">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              </div>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.$id}
                    onClick={() => navigate(`/lecturer/courses/${course.$id}`)}
                    className="group p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[10px] tracking-wider border border-indigo-100">
                          {course.courseCode}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {course.level} Level
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {course.courseTitle}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{course.department}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        <span>Manage Files</span>
                      </span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-[2.5rem] bg-white border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-900">No courses assigned yet</h4>
                <p className="text-xs text-slate-500 mt-1">Courses assigned by administration will appear here automatically.</p>
              </div>
            )}
          </div>

          {/* Recent Broadcasts / Announcements Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">Recent Broadcasts</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                  {announcements.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/lecturer/announcements')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Manage All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div 
                    key={item.$id}
                    onClick={() => navigate('/lecturer/announcements')}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          item.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {item.priority}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{item.content}</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-[2.5rem] bg-white border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">No active student announcements broadcasted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions / Activity Feed */}
        <div className="space-y-6">
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Quick Actions</h3>
            
            <div className="space-y-2.5">
              <button 
                onClick={() => navigate('/lecturer/announcements')}
                className="w-full p-3.5 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-all flex items-center justify-between group cursor-pointer border border-slate-200/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100">
                    <Plus size={15} />
                  </div>
                  <span>Post Announcement</span>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button 
                onClick={() => navigate('/lecturer/courses')}
                className="w-full p-3.5 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-600 text-xs font-bold transition-all flex items-center justify-between group cursor-pointer border border-slate-200/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100">
                    <BookOpen size={15} />
                  </div>
                  <span>Browse All Courses</span>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Sparkles size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-extrabold">Portal Guidelines</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Ensure all weekly assignment rubrics and slide decks are uploaded to specific course repositories prior to lecture hours.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Checklist Widget */}
          <div className="p-6 rounded-[2.5rem] bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Lecturer Checklist</h3>
              <Clock size={16} className="text-slate-400" />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Syllabus Synchronization</h4>
                  <p className="text-[10px] text-slate-500">Curricula data updated with department standards.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Repository Files</h4>
                  <p className="text-[10px] text-slate-500">{materialsCount} active resources linked to storage.</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Announcement Card */}
          <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                System Notice
              </span>
              <Bell size={16} className="text-indigo-300 animate-bounce" />
            </div>
            <h4 className="text-xs font-bold text-white">Semester Evaluation Sync</h4>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              Mid-semester attendance tracking and continuous assessment portals are now fully synchronized with Appwrite backend storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;