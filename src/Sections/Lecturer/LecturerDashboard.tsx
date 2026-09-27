import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { BookOpen, FileText, ArrowRight,ChevronRight , Loader2, Sparkles, TrendingUp, Bell, Award, Calendar, CheckCircle2, Clock, Plus, MessageSquare, ShieldCheck, GraduationCap } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300 px-3 sm:px-4 lg:px-0 text-slate-600">
      
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/20 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-indigo-100/50 shadow-xs">
        <div className="absolute right-[-5%] top-[-20%] w-72 h-72 bg-gradient-to-br from-indigo-100/30 to-sky-100/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-indigo-100/60 text-[11px] font-medium text-indigo-600 shadow-2xs">
                <Calendar size={12} className="text-indigo-500 shrink-0" />
                <span>{currentTime || 'Academic Session'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/60 text-[11px] font-medium text-emerald-700">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                <span>Faculty Portal</span>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight text-slate-900 font-semibold">
                Welcome back, {lecturerName} ✨
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                Streamline your course delivery, publish real-time announcements, and empower student academic progression from your centralized faculty control center.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => navigate('/lecturer/announcements')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-600 text-xs font-medium border border-indigo-200/70 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare size={14} className="text-indigo-500" />
              <span>Broadcast Update</span>
            </button>
            <button
              onClick={() => navigate('/lecturer/courses')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <GraduationCap size={14} />
              <span>Manage Courses</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
            <BookOpen size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Courses</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">{courses.length}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-emerald-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-emerald-50/60 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <FileText size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Materials</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">{materialsCount}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-amber-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-amber-50/60 text-amber-600 flex items-center justify-center border border-amber-100/50">
            <Award size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Faculty Standing</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">Verified</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-sky-50/60 text-sky-600 flex items-center justify-center border border-sky-100/50">
            <TrendingUp size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">System Status</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Assigned Curricula & Recent Broadcasts */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Assigned Curricula Section */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <BookOpen size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Assigned Curricula</h2>
              </div>
              <button
                onClick={() => navigate('/lecturer/courses')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 bg-slate-50/40 rounded-2xl border border-slate-100">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((course) => (
                  <div
                    key={course.$id}
                    onClick={() => navigate(`/lecturer/courses/${course.$id}`)}
                    className="group p-4 rounded-2xl bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50/80 text-indigo-600 font-medium text-[10px] border border-indigo-100/60">
                          {course.courseCode}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {course.level} Level
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {course.courseTitle}
                      </h3>
                      <p className="text-[11px] text-slate-500">{course.department}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-medium text-indigo-600">
                      <span className="flex items-center gap-1">
                        <FileText size={13} />
                        <span>Manage Files</span>
                      </span>
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100/50">
                  <Sparkles size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-800">No courses assigned yet</p>
                <p className="text-[11px] text-slate-400">Courses assigned by administration will appear here automatically.</p>
              </div>
            )}
          </div>

          {/* Recent Broadcasts Stream */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <MessageSquare size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Recent Broadcasts</h2>
              </div>
              <button
                onClick={() => navigate('/lecturer/announcements')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Manage All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {announcements.length > 0 ? (
              <div className="space-y-2.5">
                {announcements.map((item) => (
                  <div 
                    key={item.$id}
                    onClick={() => navigate('/lecturer/announcements')}
                    className="p-3.5 rounded-2xl bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${
                          item.priority === 'urgent' ? 'bg-rose-50/80 text-rose-600 border-rose-200/60' : 'bg-indigo-50/80 text-indigo-600 border-indigo-100/60'
                        }`}>
                          {item.priority}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-xs font-medium text-slate-800 truncate">{item.title}</h3>
                      <p className="text-[11px] text-slate-500 truncate leading-relaxed">{item.content}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80">
                <p className="text-xs text-slate-400">No active student announcements broadcasted yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Actions, Checklist & System Notice */}
        <div className="space-y-5">
          
          {/* Quick Actions Widget */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3.5">
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Quick Actions</h2>
            
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/lecturer/announcements')}
                className="w-full p-3 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/30 text-slate-700 hover:text-indigo-600 text-xs font-medium transition-all flex items-center justify-between group cursor-pointer border border-slate-200/60 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100">
                    <Plus size={13} />
                  </div>
                  <span>Post Announcement</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button 
                onClick={() => navigate('/lecturer/courses')}
                className="w-full p-3 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/30 text-slate-700 hover:text-indigo-600 text-xs font-medium transition-all flex items-center justify-between group cursor-pointer border border-slate-200/60 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100">
                    <BookOpen size={13} />
                  </div>
                  <span>Browse All Courses</span>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="p-3.5 rounded-2xl bg-indigo-50/20 border border-indigo-100/50 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-900">
                  <Sparkles size={13} className="text-indigo-600" />
                  <h4 className="text-xs font-medium text-slate-800">Portal Guidelines</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ensure all weekly assignment rubrics and slide decks are uploaded to specific course repositories prior to lecture hours.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Checklist Widget */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Lecturer Checklist</h2>
              <Clock size={14} className="text-slate-400" />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-medium text-slate-800">Syllabus Synchronization</h4>
                  <p className="text-[10px] text-slate-400">Curricula data updated with department standards.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-medium text-slate-800">Repository Files</h4>
                  <p className="text-[10px] text-slate-400">{materialsCount} active resources linked to storage.</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Announcement Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white space-y-2.5 shadow-xs relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-medium text-indigo-200 uppercase tracking-wider">
                System Notice
              </span>
              <Bell size={14} className="text-indigo-300 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-white">Semester Evaluation Sync</h4>
              <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                Mid-semester attendance tracking and continuous assessment portals are now fully synchronized with backend storage.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LecturerDashboard;