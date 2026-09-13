import { useState, useEffect } from 'react';
import { Users, Search, Mail, Loader2, BookOpen, Layers, Phone, IdCard, Sparkles } from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Student {
  $id: string;
  userId?: string;
  name: string;
  email: string;
  department?: string;
  level?: string;
  campusId?: string;
  phone?: string;
}

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
}

interface Enrollment {
  $id: string;
  studentId: string;
  courseId: string;
}

const MyStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Active filter states
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  useEffect(() => {
    fetchLecturerData();
  }, []);

  const fetchLecturerData = async () => {
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
        setStudents([]);
        setEnrollments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all enrollments for these courses
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('courseId', courseIds)]
      );

      const fetchedEnrollments = enrollmentsRes.documents as unknown as Enrollment[];
      setEnrollments(fetchedEnrollments);

      const studentIds = Array.from(
        new Set(fetchedEnrollments.map((doc) => doc.studentId))
      );

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 3. Fetch all user documents to safely map regardless of whether studentId points to $id or userId field
      const studentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('role', 'student')]
      );

      const allStudents = studentsRes.documents as unknown as Student[];

      // Filter users who are actually present in the enrollment list via $id or userId
      const enrolledStudents = allStudents.filter((student) => 
        studentIds.includes(student.$id) || (student.userId && studentIds.includes(student.userId))
      );

      setStudents(enrolledStudents);
    } catch (err) {
      console.error("Failed to fetch student data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract available unique levels from the fetched students
  const availableLevels = Array.from(
    new Set(students.map((s) => s.level).filter(Boolean))
  ) as string[];

  // Filter students based on selected course, selected level, and search keyword
  const filteredStudents = students.filter((student) => {
    const targetId = student.$id;
    const targetUserId = student.userId;

    // 1. Course Filter
    if (selectedCourseId !== 'all') {
      const isEnrolledInCourse = enrollments.some(
        (e) => (e.studentId === targetId || (targetUserId && e.studentId === targetUserId)) && e.courseId === selectedCourseId
      );
      if (!isEnrolledInCourse) return false;
    }

    // 2. Level Filter
    if (selectedLevel !== 'all') {
      if (student.level !== selectedLevel) return false;
    }

    // 3. Search Bar Filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchesName = student.name?.toLowerCase().includes(term);
      const matchesEmail = student.email?.toLowerCase().includes(term);
      const matchesCampusId = student.campusId?.toLowerCase().includes(term);
      const matchesPhone = student.phone?.toLowerCase().includes(term);
      if (!matchesName && !matchesEmail && !matchesCampusId && !matchesPhone) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <Header
        title="My Students"
        description="View and filter students enrolled across your courses and academic levels."
        ctaText="Export List"
        ctaUrl="#"
        icon={<Users size={20} />}
      />

      {/* Minimal Light-Themed Filter Tabs Section */}
      <div className="space-y-4 bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        
        {/* Course Filter Bar */}
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
                {students.length}
              </span>
            </button>
            {courses.map((course) => {
              const count = new Set(
                enrollments
                  .filter((e) => e.courseId === course.$id)
                  .map((e) => e.studentId)
              ).size;

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

        {/* Level Filter Bar */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Layers size={13} className="text-indigo-500" />
              <span>Filter by Academic Level</span>
            </div>
            {selectedLevel !== 'all' && (
              <button 
                onClick={() => setSelectedLevel('all')} 
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                selectedLevel === 'all'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-indigo-100/50'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              All Levels
            </button>
            {availableLevels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                  selectedLevel === lvl
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-indigo-100/50'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {lvl} Level
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Search Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email, campus ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-600 self-start sm:self-auto">
          <Sparkles size={13} className="text-indigo-500" />
          <span>Showing: {filteredStudents.length} Students</span>
        </div>
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white/40 rounded-3xl border border-slate-100">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400">Loading your student directory...</p>
          </div>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.$id}
              className="p-5 rounded-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-200 transition-all"
            >
              <div className="space-y-3.5">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 shadow-2xs">
                    {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{student.name}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </p>
                  </div>
                </div>

                {/* Campus ID & Phone Info */}
                <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400">
                      <IdCard size={12} className="text-indigo-500" />
                      <span>Campus ID:</span>
                    </span>
                    <span className="font-mono font-medium text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200/50">
                      {student.campusId || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Phone size={12} className="text-indigo-500" />
                      <span>Phone:</span>
                    </span>
                    {student.phone ? (
                      <a href={`tel:${student.phone}`} className="font-medium text-indigo-600 hover:underline">
                        {student.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                  {student.level ? `${student.level} Level` : 'Student'}
                </span>
                <span className="text-slate-400 truncate max-w-[140px]" title={student.department || 'Computer Science'}>
                  {student.department || 'Computer Science'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-white/40 border border-dashed border-slate-200/80 space-y-2">
          <BookOpen size={24} className="mx-auto text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-700">No Students Found</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">No students match your selected course, level, or search query filter.</p>
        </div>
      )}
    </div>
  );
};

export default MyStudents;