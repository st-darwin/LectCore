import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ArrowRight, Loader2, Search, MoreVertical, Edit, Trash2, Globe, Building } from 'lucide-react';
import AdminHeader from '../../Components/AdminHeader';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  university: string;
  lecturerId: string;
  department: string;
  level: string;
  accessScope?: 'institutional' | 'community';
}

const LEVELS = ['100', '200', '300', '400', '500', 'General'];

const CourseView = () => {
  const navigate = useNavigate();
  const [activeLevel, setActiveLevel] = useState<string>('100');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'institutional' | 'community'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCourses();
  }, [activeLevel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = await account.get();
      if (!user) throw new Error("Unauthorized");

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [
          Query.equal('lecturerId', user.$id),
          Query.equal('level', activeLevel)
        ]
      );

      setCourses(response.documents as unknown as Course[]);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("Could not load your courses. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? All associated materials should be handled accordingly.")) return;

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        courseId
      );
      setCourses(courses.filter((c) => c.$id !== courseId));
      setOpenMenuId(null);
    } catch (err) {
      console.error("Failed to delete course:", err);
      alert("Failed to delete course.");
    }
  };

  // Filter courses by search input and accessScope
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const courseScope = course.accessScope || 'institutional';
    const matchesScope = scopeFilter === 'all' || courseScope === scopeFilter;

    return matchesSearch && matchesScope;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <AdminHeader
        title="Course Management"
        description="Oversee your assigned departmental courses, curriculum units, and academic materials."
        ctaText="Create Course"
        ctaUrl="/lecturer/course/create"
        icon={<BookOpen size={20} />}
      />

      {/* Level Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {LEVELS.map((level) => {
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              onClick={() => {
                setActiveLevel(level);
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white/70 text-slate-600 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {level === 'General' ? 'General / Open' : `${level} Level`}
            </button>
          );
        })}
      </div>

      {/* Search & Access Scope Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search courses by code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/75 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs transition-all"
          />
        </div>

        {/* Scope Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-white/75 backdrop-blur-xl rounded-xl border border-slate-200/60 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scopeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('institutional')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scopeFilter === 'institutional' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building size={12} />
            <span>Campus</span>
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('community')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scopeFilter === 'community' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe size={12} />
            <span>Community</span>
          </button>
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 rounded-2xl bg-rose-50/50 border border-rose-100 text-rose-600 text-xs font-medium">
          {error}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCourses.map((course) => {
            const isMenuOpen = openMenuId === course.$id;
            const isCommunity = course.accessScope === 'community';

            return (
              <div
                key={course.$id}
                className="group relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/90 to-white/60 backdrop-blur-xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-lg hover:border-indigo-300/60 transition-all duration-300 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/60">
                        {course.courseCode}
                      </span>

                      {isCommunity ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60"
                          title="Visible to Global Community"
                        >
                          <Globe size={10} />
                          <span>Global</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200/60"
                          title="Restricted to Institution"
                        >
                          <Building size={10} />
                          <span>Campus</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline truncate max-w-[80px]" title={course.department}>
                        {course.department}
                      </span>
                      
                      {/* 3-Dot Menu Button */}
                      <div className="relative" ref={isMenuOpen ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : course.$id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Dropdown Popup */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 w-32 py-1 bg-white rounded-xl shadow-xl border border-slate-100 z-30 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/lecturer/courses/edit/${course.$id}`);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit size={13} />
                              <span>Update</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.$id)}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                    {course.courseTitle}
                  </h3>
                </div>

                {/* Bottom Footer Info */}
                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-400 truncate max-w-[130px]" title={course.university}>
                    {course.university}
                  </span>
                  <Link
                    to={`/lecturer/courses/${course.$id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-semibold transition-all duration-200 group/link shrink-0"
                  >
                    <span>Manage</span>
                    <ArrowRight size={12} className="transition-transform duration-200 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-white/40 border border-dashed border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <BookOpen size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            {searchTerm || scopeFilter !== 'all'
              ? 'No matching courses found'
              : `No courses found for ${activeLevel === 'General' ? 'General / Open' : `${activeLevel} Level`}`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {searchTerm || scopeFilter !== 'all'
              ? 'Try adjusting your search query or scope filter.'
              : "You haven't created any courses for this academic tier yet. Get started by adding your first unit."}
          </p>
          {!searchTerm && scopeFilter === 'all' && (
            <Link
              to="/lecturer/course/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-all"
            >
              <Plus size={14} />
              <span>Create Course</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseView;