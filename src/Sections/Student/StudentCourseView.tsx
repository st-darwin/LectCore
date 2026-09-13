import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Loader2, GraduationCap, Search,  Layers } from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Course {
    $id: string;
    courseCode: string;
    courseTitle: string;
    department: string;
    level: string;
}

const StudentCourseView = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch enrollments for the student
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id)]
      );

      const courseIds = enrollmentsRes.documents.map((doc: any) => doc.courseId).filter(Boolean);

      if (courseIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // 2. Fetch course documents corresponding to the enrolled IDs
      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('$id', courseIds)]
      );

      setCourses(coursesRes.documents as unknown as Course[]);
    } catch (err) {
      console.error("Failed to load enrolled courses:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Soft, Airy SaaS Hero Banner */}
      <div className="relative overflow-hidden p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 border border-indigo-100/60 shadow-lg shadow-indigo-100/30">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100/80 text-[11px] font-bold text-indigo-600 shadow-2xs">
              <GraduationCap size={14} className="text-indigo-500" />
              <span>Enrolled Curricula</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              My Enrolled Courses
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-normal leading-relaxed">
              Seamlessly access your registered courses, course materials, and curriculum notes for this semester.
            </p>
          </div>

          <button
            onClick={() => navigate('/student/courses/browse')}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <Search size={16}/>
            <span>Browse All Courses</span>
          </button>
        </div>
      </div>

      {/* Courses List Grid with Soft Minimal Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-2xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.$id}
              onClick={() => navigate(`/student/courses/${course.$id}`)}
              className="group p-6 rounded-[2.5rem] bg-white/80 backdrop-blur-md border border-slate-100 hover:border-indigo-200 shadow-xs hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-indigo-50/80 text-indigo-600 font-bold text-[10px] tracking-wider border border-indigo-100/60">
                    {course.courseCode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">
                    {course.level} Level
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {course.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">{course.department}</p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100/80 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span className="flex items-center gap-1.5 text-slate-600 group-hover:text-indigo-600 transition-colors">
                  <BookOpen size={14} className="text-indigo-500" />
                  <span>View Materials</span>
                </span>
                <div className="w-7 h-7 rounded-xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center transition-transform group-hover:translate-x-1">
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-200/80 space-y-4 p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Layers size={24} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800">No courses enrolled yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You haven't registered for any courses for this academic session. Explore available departmental courses to get started.
            </p>
          </div>
          <button
            onClick={() => navigate('/student/courses/browse')}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            Register Courses Now
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentCourseView;