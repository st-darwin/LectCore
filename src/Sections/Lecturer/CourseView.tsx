import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, ArrowRight, Loader2, Search } from 'lucide-react';
import Header from '../../Components/Header';
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
}

const LEVELS = ['100', '200', '300', '400', '500'];

const CourseView = () => {
  const [activeLevel, setActiveLevel] = useState<string>('100');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchCourses();
  }, [activeLevel]);

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

  // Filter courses by search input (matching course code or course title)
  const filteredCourses = courses.filter((course) =>
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Course Management"
        description="Oversee your assigned departmental courses, curriculum units, and academic materials."
        ctaText="Create Course"
        ctaUrl="/lecturer/course/create"
        icon={<BookOpen size={20} />}
      />

      {/* Level Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {LEVELS.map((level) => {
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                  : 'bg-white/60 text-slate-600 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {level} Level
            </button>
          );
        })}
      </div>

      {/* Search Bar Input */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search courses by code or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>

      {/* Content State */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 rounded-[2rem] bg-rose-50/50 border border-rose-100 text-rose-600 text-xs font-medium">
          {error}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <div
              key={course.$id}
              className="group p-6 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider border border-indigo-100/50">
                    {course.courseCode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {course.department}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                  {course.courseTitle}
                </h3>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{course.university}</span>
                <Link
                  to={`/lecturer/courses/${course.$id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <span>Manage</span>
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-[2rem] bg-white/40 border border-dashed border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <BookOpen size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {searchTerm ? `No courses found matching "${searchTerm}"` : `No courses found for ${activeLevel} Level`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchTerm ? "Try adjusting your search query to find what you're looking for." : "You haven't created any courses for this academic tier yet. Get started by adding your first unit."}
          </p>
          {!searchTerm && (
            <Link
              to="/lecturer/course/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
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