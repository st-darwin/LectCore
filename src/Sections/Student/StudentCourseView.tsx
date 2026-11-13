import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  Loader2,
  GraduationCap,
  Search,
  Layers,
  Building2,
  Users,
  X,
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;
  accessScope?: string;
}

type CourseTab = 'all' | 'institutional' | 'community';

const StudentCourseView = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<CourseTab>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);

      const user = await account.get();

      if (!user) {
        setCourses([]);
        return;
      }

      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id)]
      );

      const courseIds = enrollmentsRes.documents
        .map((doc: any) => doc.courseId)
        .filter(Boolean);

      if (courseIds.length === 0) {
        setCourses([]);
        return;
      }

      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('$id', courseIds)]
      );

      setCourses(coursesRes.documents as unknown as Course[]);
    } catch (err) {
      console.error('Failed to load enrolled courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabCourses = useMemo(() => {
    if (activeTab === 'institutional') {
      return courses.filter(
        (course) => course.accessScope?.toLowerCase() === 'institutional'
      );
    }

    if (activeTab === 'community') {
      return courses.filter(
        (course) => course.accessScope?.toLowerCase() === 'community'
      );
    }

    return courses;
  }, [courses, activeTab]);

  const filteredCourses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return tabCourses;

    return tabCourses.filter((course) =>
      [
        course.courseCode,
        course.courseTitle,
        course.department,
        course.level,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [tabCourses, searchTerm]);

  const institutionalCount = courses.filter(
    (course) => course.accessScope?.toLowerCase() === 'institutional'
  ).length;

  const communityCount = courses.filter(
    (course) => course.accessScope?.toLowerCase() === 'community'
  ).length;

  const tabs: { id: CourseTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: courses.length },
    {
      id: 'institutional',
      label: 'Institutional',
      count: institutionalCount,
    },
    {
      id: 'community',
      label: 'Community',
      count: communityCount,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Soft, Responsive SaaS Hero Banner */}
      <div className="relative overflow-hidden p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 border border-indigo-100/60 shadow-lg shadow-indigo-100/30">
        <div className="absolute -right-12 -top-12 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 sm:w-64 sm:h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100/80 text-[10px] sm:text-[11px] font-bold text-indigo-600 shadow-2xs">
              <GraduationCap size={14} className="text-indigo-500 shrink-0" />
              <span>Enrolled Curricula</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              My Enrolled Courses
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-normal leading-relaxed">
              Seamlessly access your registered courses, course materials, and curriculum notes for this semester.
            </p>
          </div>

          <button
            onClick={() => navigate('/student/courses/browse')}
            className="w-full sm:w-auto justify-center px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
          >
            <Search size={15} />
            <span>Browse All Courses</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-2xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : courses.length > 0 ? (
        <>
          {/* Minimalist Responsive Header Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
            {/* Clean Minimalist Scrollable Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/70 rounded-2xl overflow-x-auto w-full lg:w-fit scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  {tab.id === 'institutional' && <Building2 size={13} className="shrink-0" />}
                  {tab.id === 'community' && <Users size={13} className="shrink-0" />}
                  {tab.id === 'all' && <Layers size={13} className="shrink-0" />}

                  <span>{tab.label}</span>

                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-slate-200/60 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Short Minimal Search Bar & Count */}
            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <span className="text-xs font-medium text-slate-400 shrink-0 hidden sm:inline-block">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
              </span>
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredCourses.map((course) => (
                <div
                  key={course.$id}
                  onClick={() => navigate(`/student/courses/${course.$id}`)}
                  className="group p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] bg-white/80 backdrop-blur-md border border-slate-100 hover:border-indigo-200 shadow-xs hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-50/80 text-indigo-600 font-bold text-[10px] tracking-wider border border-indigo-100/60">
                        {course.courseCode}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        {course.level} Level
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {course.accessScope?.toLowerCase() === 'institutional' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                          <Building2 size={11} />
                          Institutional
                        </span>
                      ) : course.accessScope?.toLowerCase() === 'community' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold border border-purple-100">
                          <Users size={11} />
                          Community
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {course.courseTitle}
                      </h3>

                      <p className="text-xs text-slate-400 font-medium">
                        {course.department}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-5 border-t border-slate-100/80 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span className="flex items-center gap-1.5 text-slate-600 group-hover:text-indigo-600 transition-colors">
                      <BookOpen size={14} className="text-indigo-500 shrink-0" />
                      <span>View Materials</span>
                    </span>

                    <div className="w-7 h-7 rounded-xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-200/80 space-y-4 p-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Search size={24} />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-slate-800">
                  No matching courses found
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {searchTerm
                    ? 'Try a different search term or clear your search.'
                    : 'There are no enrolled courses in this category yet.'}
                </p>
              </div>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-200/80 space-y-4 p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Layers size={24} />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-800">
              No courses enrolled yet
            </h3>

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