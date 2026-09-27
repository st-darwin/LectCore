import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  ArrowRight,  
  Bell,
  Layers,
  Search,
  ChevronRight,
  Loader2,
  FileText,
  CheckSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

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
  courseId: string;
  $createdAt: string;
}

interface Assignment {
  $id: string;
  title: string;
  description: string;
  courseId: string;
  dueDate: string;
  totalPoints?: number;
}

interface Submission {
  $id: string;
  assignmentId: string;
  studentId: string;
  fileUrl?: string;
  submittedAt: string;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('Student');
  const [userId, setUserId] = useState<string>('');
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [totalEnrolledCount, setTotalEnrolledCount] = useState<number>(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('student_quick_notes');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Review Data Structures slides for quiz', completed: false },
      { id: '2', text: 'Submit Web Engineering assignment', completed: true },
    ];
  });
  const [newTaskText, setNewTaskText] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    localStorage.setItem('student_quick_notes', JSON.stringify(tasks));
  }, [tasks]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      setUserName(user.name || user.email.split('@')[0]);
      setUserId(user.$id);

      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id)]
      );

      setTotalEnrolledCount(enrollmentsRes.documents.length);

      const courseIds = enrollmentsRes.documents.map((doc: any) => doc.courseId);

      if (courseIds.length > 0) {
        const coursesRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.equal('$id', courseIds)]
        );
        setEnrolledCourses(coursesRes.documents as unknown as Course[]);

        try {
          const announcementsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.announcementsId || 'announcements',
            [Query.equal('courseId', courseIds), Query.orderDesc('$createdAt'), Query.limit(3)]
          );
          setRecentAnnouncements(announcementsRes.documents as unknown as Announcement[]);
        } catch {
          setRecentAnnouncements([]);
        }

        try {
          const assignmentsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.assignmentId || 'assignments',
            [Query.equal('courseId', courseIds), Query.orderDesc('$createdAt'), Query.limit(5)]
          );
          setAssignments(assignmentsRes.documents as unknown as Assignment[]);
        } catch {
          setAssignments([]);
        }

        try {
          const subsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.submissionsId || 'submissions',
            [Query.equal('studentId', user.$id)]
          );
          setSubmissions(subsRes.documents as unknown as Submission[]);
        } catch {
          setSubmissions([]);
        }

      } else {
        setEnrolledCourses([]);
        setRecentAnnouncements([]);
        setAssignments([]);
        setSubmissions([]);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([{ id: Date.now().toString(), text: newTaskText.trim(), completed: false }, ...tasks]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filteredCourses = enrolledCourses.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-white/60 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-xs mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <p className="text-xs font-medium text-slate-400 tracking-wide">Syncing academic workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300 px-3 sm:px-4 lg:px-0 text-slate-600">
      
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/20 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-indigo-100/50 shadow-xs">
        <div className="absolute right-[-5%] top-[-20%] w-72 h-72 bg-gradient-to-br from-indigo-100/30 to-sky-100/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-indigo-100/60 text-[11px] font-medium text-indigo-600 shadow-2xs">
              <Layers size={12} className="text-indigo-500 shrink-0" />
              <span>Academic Portal • Undergraduate Session</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight text-slate-900 font-semibold">
              Welcome back, {userName} ✨
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
              Your academic command center is synchronized. Track your active courses, assignments, and study schedule below.
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-2xs"
              />
            </div>
            
            <button 
              onClick={() => navigate('/student/announcements')}
              className="w-10 h-10 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-all cursor-pointer relative shrink-0 shadow-2xs"
              title="View Announcements"
            >
              <Bell size={16} />
              {recentAnnouncements.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
            <BookOpen size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Enrolled Courses</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">{totalEnrolledCount} Active</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-emerald-50/60 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <GraduationCap size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assignments</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">{submissions.length}/{assignments.length} Done</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-sky-50/60 text-sky-600 flex items-center justify-center border border-sky-100/50">
            <CheckCircle2 size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks Done</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">
              {tasks.filter(t => t.completed).length}/{tasks.length}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-2 hover:border-indigo-100 transition-all">
          <div className="w-8 h-8 rounded-xl bg-amber-50/60 text-amber-600 flex items-center justify-center border border-amber-100/50">
            <TrendingUp size={15} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Semester Standing</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">Good Standing</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Enrolled Courses List & Assignments Widget */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Courses Section */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <BookOpen size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">My Enrolled Courses</h2>
              </div>
              <button 
                onClick={() => navigate('/student/courses')} 
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Browse All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="space-y-2.5">
                {filteredCourses.map((course) => (
                  <div 
                    key={course.$id}
                    onClick={() => navigate(`/student/courses/${course.$id}`)}
                    className="group p-4 rounded-2xl bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-100/60 text-[10px] font-medium text-indigo-600">
                          {course.courseCode}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium truncate">{course.department} • Level {course.level}</span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {course.courseTitle}
                      </h3>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all shadow-2xs shrink-0">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80 space-y-3 px-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100/50">
                  <BookOpen size={16} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">No Enrolled Courses Found</p>
                  <p className="text-[11px] text-slate-400">You haven't enrolled in any courses yet or none match your search.</p>
                </div>
                <button
                  onClick={() => navigate('/student/courses')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer"
                >
                  Explore Courses
                </button>
              </div>
            )}
          </div>

          {/* Assignments Widget */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50/60 text-sky-600 flex items-center justify-center border border-sky-100/50">
                  <GraduationCap size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Active Course Assignments</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{assignments.length} Total</span>
            </div>

            {assignments.length > 0 ? (
              <div className="space-y-2.5">
                {assignments.map((assignment) => {
                  const sub = submissions.find(s => s.assignmentId === assignment.$id);
                  const isSubmitted = !!sub;

                  return (
                    <div 
                      key={assignment.$id}
                      className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white hover:border-slate-200 shadow-2xs"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            isSubmitted 
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60' 
                              : 'bg-amber-50/80 text-amber-700 border-amber-200/60'
                          }`}>
                            {isSubmitted ? 'Submitted' : 'Pending Submission'}
                          </span>
                          {assignment.dueDate && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar size={11} />
                              Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-sm font-medium text-slate-800">{assignment.title}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{assignment.description}</p>
                      </div>

                      <button
                        onClick={() => navigate(`/student/assignment/${assignment.$id}`)}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <FileText size={13} />
                        <span>View assignment</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80 space-y-1">
                <p className="text-xs font-semibold text-slate-800">No Assignments Posted</p>
                <p className="text-[11px] text-slate-400">Instructors haven't posted any assignments yet.</p>
              </div>
            )}
          </div>

          {/* Interactive Study Tasks & Scratchpad Widget */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50/60 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                  <CheckSquare size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Study Task Tracker & Notes</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Auto-saved</span>
            </div>

            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a new assignment or study note..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50/60 border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-2xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-between gap-3 transition-all hover:bg-slate-50"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-400 border-slate-300 cursor-pointer"
                      />
                      <span className={`text-xs truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {task.text}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-3 text-xs text-slate-400">No study tasks added yet. Stay organized!</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Col: Announcements, Quick Access & Deadlines */}
        <div className="space-y-5">
          
          {/* Recent Announcements Widget */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50/60 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <FileText size={14} />
                </div>
                <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Recent Broadcasts</h2>
              </div>
              <button 
                onClick={() => navigate('/student/announcements')}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            {recentAnnouncements.length > 0 ? (
              <div className="space-y-2.5">
                {recentAnnouncements.map((item) => (
                  <div 
                    key={item.$id}
                    onClick={() => navigate('/student/announcements')}
                    className="p-3 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/20 border border-slate-100 transition-all cursor-pointer space-y-1 shadow-2xs"
                  >
                    <p className="text-xs font-medium text-slate-800 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.content}</p>
                    <p className="text-[10px] text-indigo-500 font-medium pt-0.5">
                      {new Date(item.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No recent announcements posted.
              </div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50/60 text-amber-600 flex items-center justify-center border border-amber-100/50">
                <Clock size={14} />
              </div>
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">System Reminder</h2>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/20 border border-indigo-100/50 space-y-1">
              <span className="px-2 py-0.5 rounded bg-indigo-100/60 text-[10px] font-medium text-indigo-700">
                Notice
              </span>
              <p className="text-xs font-medium text-slate-800 leading-snug">Ensure all course materials are reviewed before upcoming departmental assessments.</p>
            </div>
          </div>

          {/* Portal Action Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 backdrop-blur-xl border border-indigo-100/60 shadow-2xs space-y-3.5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-28 h-28 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 text-indigo-600">
              <Calendar size={14} />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">Student Portal</h2>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800">Access Course Materials</p>
              <p className="text-[11px] text-slate-500">View lectures, notes, and instructor resources instantly.</p>
            </div>

            <button 
              onClick={() => navigate('/student/courses')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
            >
              <span>View Course Directory</span>
              <ChevronRight size={13} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default StudentDashboard;