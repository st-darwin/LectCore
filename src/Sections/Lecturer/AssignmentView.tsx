import { useState, useEffect } from 'react';
import { ClipboardList, Search, Loader2, BookOpen, Calendar, Award,  FileText } from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';
import { useNavigate } from 'react-router-dom';


interface Assignment {
  $id: string;
  courseId: string;
  lecturerId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
}

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
}

const AssignmentView = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignmentsData();
  }, []);

  const fetchAssignmentsData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch courses created by this lecturer
      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('lecturerId', user.$id)]
      );

      const fetchedCourses = coursesRes.documents as unknown as Course[];
      setCourses(fetchedCourses);

      const courseIds = fetchedCourses.map((c) => c.$id);

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all assignments for these courses using courseId filter
      const assignmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments', // Fallback collection string if needed
        [Query.equal('courseId', courseIds)]
      );

      setAssignments(assignmentsRes.documents as unknown as Assignment[]);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter assignments based on selected course and search query
  const filteredAssignments = assignments.filter((assignment) => {
    if (selectedCourseId !== 'all' && assignment.courseId !== selectedCourseId) {
      return false;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchesTitle = assignment.title?.toLowerCase().includes(term);
      const matchesDesc = assignment.description?.toLowerCase().includes(term);
      if (!matchesTitle && !matchesDesc) return false;
    }

    return true;
  });

  const getCourseDetails = (courseId: string) => {
    return courses.find((c) => c.$id === courseId);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <Header
        title="Assignments"
        description="Create, manage, and track assignments posted across your courses."
        ctaText="Create Assignment"
        ctaUrl="/lecturer/assignments/create"
        icon={<ClipboardList size={20} />}
      />

      {/* Filter Tabs Section */}
      <div className="space-y-4 bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <BookOpen size={13} className="text-indigo-500" />
              <span>Filter by Course</span>
            </div>
            {selectedCourseId !== 'all' && (
              <button 
                onClick={() => setSelectedCourseId('all')} 
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCourseId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs flex items-center gap-2 ${
                selectedCourseId === 'all'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-indigo-100/50'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <span>All Courses</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                selectedCourseId === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/70 text-slate-500'
              }`}>
                {assignments.length}
              </span>
            </button>
            {courses.map((course) => {
              const count = assignments.filter((a) => a.courseId === course.$id).length;
              const isSelected = selectedCourseId === course.$id;

              return (
                <button
                  key={course.$id}
                  onClick={() => setSelectedCourseId(course.$id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-indigo-100/50'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <span className="font-bold">{course.courseCode}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search assignments by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-1">
          Showing: {filteredAssignments.length} Assignments
        </span>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white/40 rounded-3xl border border-slate-100">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400">Loading assignments...</p>
          </div>
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const course = getCourseDetails(assignment.courseId);
            const formattedDate = assignment.dueDate 
              ? new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'No due date';

            return (
              <div
                key={assignment.$id}
                className="p-5 rounded-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-200 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/60 text-[11px] font-bold tracking-wide">
                      {course ? course.courseCode : 'Course'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">
                      <Award size={12} />
                      <span>{assignment.totalMarks} Marks</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{assignment.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{assignment.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <Calendar size={12} className="text-indigo-500" />
                    <span>{formattedDate}</span>
                  </span>
                  <button
                    onClick={() => navigate(`/lecturer/submissions/${assignment.$id}`)}
                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    View Submissions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-white/40 border border-dashed border-slate-200/80 space-y-2">
          <FileText size={24} className="mx-auto text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-700">No Assignments Found</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">No assignments match your selected course filter or search query.</p>
        </div>
      )}
    </div>
  );
};

export default AssignmentView;