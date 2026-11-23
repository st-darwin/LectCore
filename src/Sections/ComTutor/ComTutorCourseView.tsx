import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  ArrowRight,
  Loader2,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Globe,
} from 'lucide-react';
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

const ComTutorCourseView = () => {
  const navigate = useNavigate();
  const [activeLevel, setActiveLevel] = useState<string>('100');
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
      if (!user) throw new Error('Unauthorized');

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [
          Query.equal('lecturerId', user.$id),
          Query.equal('level', activeLevel),
          Query.equal('accessScope', 'community'),
        ]
      );

      setCourses(response.documents as unknown as Course[]);
    } catch (err) {
      console.error('Failed to fetch community courses:', err);
      setError('Could not load your community courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this course? All associated materials should be handled accordingly.'
      )
    ) {
      return;
    }

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        courseId
      );
      setCourses((prev) => prev.filter((c) => c.$id !== courseId));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert('Failed to delete course.');
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.department &&
        course.department.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="relative min-h-screen w-full bg-[#fbfbfc] px-4 py-6 text-slate-800 antialiased selection:bg-indigo-50 selection:text-indigo-900 sm:px-6 lg:px-8">
      {/* Background ambient light glow matching AdminHeader */}
      <div className="pointer-events-none absolute -top-10 left-1/3 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <AdminHeader
          title="Community Courses"
          description="Manage your community courses, learning tracks, and shared resources."
          ctaText="Create Course"
          ctaUrl="/community_tutor/courses/create"
          ctaIcon={<Plus size={16} />}
          icon={<BookOpen size={24} />}
          badgeText="Course Management"
        />

        {/* Level Tabs */}
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-2">
          {LEVELS.map((level) => {
            const isActive = activeLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setActiveLevel(level);
                  setSearchTerm('');
                }}
                className={`shrink-0 cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'border border-slate-200/70 bg-white/90 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600'
                }`}
              >
                {level === 'General' ? 'General / Open' : `${level} Level`}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search community courses by code, title, or track..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/70 bg-white/90 py-2.5 pl-11 pr-4 text-xs text-slate-900 shadow-2xs backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Content State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 py-16 text-center text-xs font-medium text-rose-600">
            {error}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const isMenuOpen = openMenuId === course.$id;

              return (
                <div
                  key={course.$id}
                  className="group relative flex flex-col justify-between gap-5 rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-all duration-300 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-500/5 sm:p-6"
                >
                  <div className="space-y-3">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Course Code Badge */}
                        <span className="rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          {course.courseCode}
                        </span>

                        {/* Community Scope Badge */}
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 bg-indigo-50/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600"
                          title="Community Scope"
                        >
                          <Globe size={10} />
                          <span>Community</span>
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className="hidden max-w-[85px] truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:inline"
                          title={course.department}
                        >
                          {course.department}
                        </span>

                        {/* 3-Dot Menu Button */}
                        <div
                          className="relative"
                          ref={isMenuOpen ? menuRef : null}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(isMenuOpen ? null : course.$id)
                            }
                            className="cursor-pointer rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Options"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {/* Dropdown Popup */}
                          {isMenuOpen && (
                            <div className="animate-in fade-in zoom-in-95 absolute right-0 top-8 z-30 w-32 rounded-xl border border-slate-200/80 bg-white py-1 shadow-xl duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(
                                    `/community_tutor/courses/edit/${course.$id}`
                                  );
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-indigo-50/80 hover:text-indigo-600"
                              >
                                <Edit size={13} />
                                <span>Update</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCourse(course.$id)}
                                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
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
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                      {course.courseTitle}
                    </h3>
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span
                      className="max-w-[140px] truncate text-[11px] font-medium text-slate-400"
                      title={course.university}
                    >
                      {course.university || 'Community Hub'}
                    </span>
                    <Link
                      to={`/community_tutor/courses/${course.$id}`}
                      className="group/link inline-flex shrink-0 items-center gap-1 rounded-xl bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-2xs transition-all duration-200 hover:bg-indigo-600 hover:text-white"
                    >
                      <span>Manage</span>
                      <ArrowRight
                        size={12}
                        className="transition-transform duration-200 group-hover/link:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-indigo-200/80 bg-white/60 px-4 py-16 text-center">
            {/* Empty State Icon using exact AdminHeader Icon Style */}
            <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-600 shadow-xs">
              <div className="absolute inset-0 rounded-2xl bg-white/40 backdrop-blur-xs" />
              <div className="relative z-10">
                <BookOpen size={22} />
              </div>
            </div>

            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {searchTerm
                ? 'No matching community courses found'
                : `No community courses found for ${
                    activeLevel === 'General'
                      ? 'General / Open'
                      : `${activeLevel} Level`
                  }`}
            </h3>
            <p className="mx-auto mb-5 max-w-sm text-xs text-slate-400">
              {searchTerm
                ? 'Try adjusting your search query to find a course.'
                : "You haven't created any community courses for this tier yet. Get started by adding your first course."}
            </p>
            {!searchTerm && (
              <Link
                to="/community_tutor/courses/create"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.97]"
              >
                <Plus size={14} />
                <span>Create Course</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComTutorCourseView;