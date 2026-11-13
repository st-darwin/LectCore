
import { useState, useEffect } from 'react';

import {
  CheckCircle2,
  Plus,
  Loader2,
  Search,
  Library,
  Trash2,
  GraduationCap,
  Filter,
  Building2,
  ChevronDown,
  User,
  Users,
} from 'lucide-react';

import { account, databases, appwriteConfig } from '../../appwrite/Client';

import { Query, ID } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;

  accessScope?: string;

  university?: string;
  institution?: string;
  universityName?: string;

  lecturerId?: string;
  instructorId?: string;
  lecturerName?: string;
  instructor?: string;
  lecturer?: string;
}

interface StudentProfile {
  $id: string;
  userId?: string;
  university?: string;
  institution?: string;
  universityName?: string;
  [key: string]: any;
}

type CourseTab = 'institutional' | 'community';

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Nursing',
  'Software Engineering',
  'Cyber Security',
  'Information Technology',
  'Accounting',
  'Economics',
  'Mass Communication',
  'Mechanical Engineering',
  'Geophysics',
];

const LEVELS = ['All Levels', '100', '200', '300', '400', '500'];

const StudentCourseBrowse = () => {
  const [courses, setCourses] = useState<Course[]>([]);

  const [enrollmentsMap, setEnrollmentsMap] = useState<Map<string, string>>(
    new Map()
  );

  const [lecturersMap, setLecturersMap] = useState<Map<string, string>>(
    new Map()
  );

  const [loading, setLoading] = useState<boolean>(true);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');

  const [selectedDepartment, setSelectedDepartment] =
    useState<string>('All Departments');

  // New: Course category tab
  const [activeTab, setActiveTab] = useState<CourseTab>('institutional');

  // New: Current student's university
  const [studentUniversity, setStudentUniversity] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  // Normalize institution names before comparing them
  const normalizeInstitution = (value: unknown): string => {
    if (typeof value !== 'string') return '';

    return value.trim().toLowerCase();
  };

  // Support different possible institution field names
  const getInstitutionName = (data: any): string => {
    return (
      data?.university ||
      data?.institution ||
      data?.universityName ||
      data?.institutionName ||
      ''
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Get currently authenticated user
      const user = await account.get();

      if (!user) return;

      // 2. Get the user collection ID
      const usersCollectionId =
        (appwriteConfig as any).usersId ||
        (appwriteConfig as any).userCollectionId ||
        'users';

      // 3. Retrieve the student's user collection document
      let studentProfile: StudentProfile | null = null;

      try {
        const studentRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          usersCollectionId,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );

        if (studentRes.documents.length > 0) {
          studentProfile = studentRes.documents[0] as unknown as StudentProfile;
        }
      } catch (profileError) {
        console.warn('Could not fetch student profile by userId:', profileError);
      }

      // Fallback: Try using the authenticated user's ID as document ID
      if (!studentProfile) {
        try {
          studentProfile = (await databases.getDocument(
            appwriteConfig.databaseId,
            usersCollectionId,
            user.$id
          )) as unknown as StudentProfile;
        } catch (profileError) {
          console.warn('Student profile document not found:', profileError);
        }
      }

      // 4. Get the student's university
      const university = getInstitutionName(studentProfile);

      setStudentUniversity(university);

      console.log('Authenticated user:', user.$id);
      console.log('Student university:', university);

      // 5. Fetch all courses
      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId
      );

      // 6. Fetch student's enrollments
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id)]
      );

      const courseDocuments = coursesRes.documents as unknown as Course[];

      // 7. Collect unique lecturer IDs from the course documents
      const lecturerIdsSet = new Set<string>();

      courseDocuments.forEach((course) => {
        const lId = course.lecturerId || course.instructorId;

        if (lId) {
          lecturerIdsSet.add(lId);
        }
      });

      // 8. Fetch user collection documents to map lecturer IDs to names
      const newLecturersMap = new Map<string, string>();

      if (lecturerIdsSet.size > 0) {
        try {
          const idsArray = Array.from(lecturerIdsSet);

          const usersRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            usersCollectionId,
            [Query.equal('userId', idsArray)]
          );

          usersRes.documents.forEach((uDoc: any) => {
            const name =
              uDoc.name ||
              uDoc.fullName ||
              `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim();

            if (name) {
              if (uDoc.userId) {
                newLecturersMap.set(uDoc.userId, name);
              }

              if (uDoc.$id) {
                newLecturersMap.set(uDoc.$id, name);
              }
            }
          });
        } catch (fetchErr) {
          console.warn(
            'Batch fetch by userId failed, trying individual lookups:',
            fetchErr
          );
        }

        // Fallback: Check IDs not yet resolved
        for (const lId of lecturerIdsSet) {
          if (!newLecturersMap.has(lId)) {
            try {
              const uDoc: any = await databases.getDocument(
                appwriteConfig.databaseId,
                usersCollectionId,
                lId
              );

              const name =
                uDoc.name ||
                uDoc.fullName ||
                `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim();

              if (name) {
                newLecturersMap.set(lId, name);

                if (uDoc.userId) {
                  newLecturersMap.set(uDoc.userId, name);
                }
              }
            } catch (err) {
              // Ignore individual lookup errors
            }
          }
        }
      }

      // 9. Build enrollment map
      const map = new Map<string, string>();

      enrollmentsRes.documents.forEach((doc: any) => {
        if (doc.courseId) {
          map.set(doc.courseId, doc.$id);
        }
      });

      // 10. Save fetched data
      setCourses(courseDocuments);

      setEnrollmentsMap(map);

      setLecturersMap(newLecturersMap);

    } catch (err) {
      console.error('Failed to load browse courses data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enroll in a course
  const handleEnroll = async (courseId: string) => {
    try {
      setActionLoadingId(courseId);

      const user = await account.get();

      if (!user) return;

      const newEnrollment = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        ID.unique(),
        {
          studentId: user.$id,
          courseId: courseId,
          enrolledAt: new Date().toISOString(),
        }
      );

      setEnrollmentsMap((prev) => {
        const next = new Map(prev);

        next.set(courseId, newEnrollment.$id);

        return next;
      });

    } catch (err) {
      console.error('Failed to enroll in course:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unenroll from a course
  const handleUnenroll = async (courseId: string) => {
    const enrollmentId = enrollmentsMap.get(courseId);

    if (!enrollmentId) return;

    try {
      setActionLoadingId(courseId);

      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        enrollmentId
      );

      setEnrollmentsMap((prev) => {
        const next = new Map(prev);

        next.delete(courseId);

        return next;
      });

    } catch (err) {
      console.error('Failed to unenroll from course:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resolve lecturer name
  const resolveLecturerName = (course: Course) => {
    const lId = course.lecturerId || course.instructorId;

    if (lId && lecturersMap.has(lId)) {
      return lecturersMap.get(lId);
    }

    return (
      course.lecturerName ||
      course.instructor ||
      (typeof course.lecturer === 'string' ? course.lecturer : '') ||
      'Instructor TBA'
    );
  };

  // 11. Separate courses by accessScope and institution
  const institutionalCourses = courses.filter((course) => {
    const scope = normalizeInstitution(course.accessScope);

    const courseUniversity = normalizeInstitution(
      getInstitutionName(course)
    );

    const currentUniversity = normalizeInstitution(studentUniversity);

    return (
      scope === 'institutional' &&
      currentUniversity !== '' &&
      courseUniversity === currentUniversity
    );
  });

  const communityCourses = courses.filter((course) => {
    return normalizeInstitution(course.accessScope) === 'community';
  });

  // Select the correct collection based on active tab
  const displayedCourses =
    activeTab === 'institutional'
      ? institutionalCourses
      : communityCourses;

  // 12. Apply search, level and department filters
  const filteredCourses = displayedCourses.filter((course) => {
    const lecturerInfo = resolveLecturerName(course) || '';

    const matchesSearch =
      (course.courseCode || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (course.courseTitle || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (course.department || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lecturerInfo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel =
      selectedLevel === 'All Levels' ||
      course.level?.toString() === selectedLevel;

    const matchesDepartment =
      selectedDepartment === 'All Departments' ||
      course.department?.toLowerCase() ===
        selectedDepartment.toLowerCase();

    return matchesSearch && matchesLevel && matchesDepartment;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">

      {/* Soft, Airy SaaS Hero Banner */}
      <div className="relative overflow-hidden p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 border border-indigo-100/60 shadow-lg shadow-indigo-100/30 space-y-6">

        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="space-y-2">

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-indigo-100/80 text-[11px] font-bold text-indigo-600 shadow-2xs">

              <GraduationCap size={14} className="text-indigo-500" />

              <span>Course Catalog</span>

            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              Browse & Register Courses
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-normal leading-relaxed">
              Select departmental courses to add or drop from your semester schedule seamlessly.
            </p>

            {studentUniversity && (
              <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 pt-1">
                <Building2 size={13} />
                {studentUniversity}
              </p>
            )}

          </div>

          {/* Search Input & Department ComboBox */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

            <div className="relative w-full sm:w-64">

              <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-9 pr-9 py-3 bg-white/90 backdrop-blur-md border border-indigo-100/80 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

            </div>

            <div className="relative w-full sm:w-64">

              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search code, title, or lecturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white/90 backdrop-blur-md border border-indigo-100/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />

            </div>

          </div>

        </div>

        {/* New: Institutional and Community Tabs */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-3">

          <button
            onClick={() => setActiveTab('institutional')}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'institutional'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-indigo-100/60 shadow-2xs'
            }`}
          >
            <Building2 size={15} />
            <span>Institutional Courses</span>

            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'institutional'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {institutionalCourses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'community'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-indigo-100/60 shadow-2xs'
            }`}
          >
            <Users size={15} />
            <span>Community Courses</span>

            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'community'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {communityCourses.length}
            </span>
          </button>

        </div>

        {/* Level Active Tabs */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 pt-2 scrollbar-none">

          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
            <Filter size={13} />
            Level:
          </span>

          {LEVELS.map((lvl) => {
            const isActive = selectedLevel === lvl;

            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white/80 hover:bg-white text-slate-600 border border-indigo-100/60 shadow-2xs'
                }`}
              >
                {lvl === 'All Levels' ? 'All Levels' : `${lvl} Level`}
              </button>
            );
          })}

        </div>

      </div>

      {/* Course List Grid */}
      {loading ? (

        <div className="flex items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-2xs">

          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />

        </div>

      ) : filteredCourses.length > 0 ? (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {filteredCourses.map((course) => {

            const isEnrolled = enrollmentsMap.has(course.$id);

            const isActionLoading = actionLoadingId === course.$id;

            const lecturerName = resolveLecturerName(course);

            return (

              <div
                key={course.$id}
                className={`group p-6 rounded-[2.5rem] backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                  isEnrolled
                    ? 'bg-indigo-50/20 border-indigo-200/60 shadow-[0_4px_20px_rgba(99,102,241,0.03)]'
                    : 'bg-white/80 border-slate-100 hover:border-indigo-200 shadow-xs hover:shadow-lg hover:shadow-indigo-50/50'
                }`}
              >

                <div className="space-y-3.5">

                  <div className="flex items-center justify-between">

                    <span className={`px-3 py-1 rounded-full font-bold text-[10px] tracking-wider border ${
                      isEnrolled
                        ? 'bg-indigo-100/60 text-indigo-700 border-indigo-200/60'
                        : 'bg-indigo-50/80 text-indigo-600 border-indigo-100/60'
                    }`}>
                      {course.courseCode}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">
                      {course.level} Level
                    </span>

                  </div>

                  <div className="space-y-1.5">

                    <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                      {course.courseTitle}
                    </h3>

                    <p className="text-xs text-slate-400 font-medium">
                      {course.department}
                    </p>

                    {/* Lecturer / Instructor Display */}
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-600 font-medium">

                      <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <User size={11} />
                      </div>

                      <span className="truncate">{lecturerName}</span>

                    </div>

                  </div>

                </div>

                <div className="pt-4 mt-6 border-t border-slate-100/80 flex items-center justify-between">

                  <span className="text-xs text-slate-400 font-medium">
                    Curriculum
                  </span>

                  {isEnrolled ? (

                    <button
                      onClick={() => handleUnenroll(course.$id)}
                      disabled={isActionLoading}
                      className="group/btn relative px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-rose-50 text-emerald-600 hover:text-rose-600 font-bold text-xs border border-emerald-100/60 hover:border-rose-100/60 transition-all cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5 overflow-hidden"
                    >

                      {isActionLoading ? (

                        <Loader2 size={14} className="animate-spin" />

                      ) : (

                        <>
                          <span className="flex items-center gap-1.5 group-hover/btn:hidden">
                            <CheckCircle2 size={14} />
                            <span>Enrolled</span>
                          </span>

                          <span className="hidden group-hover/btn:flex items-center gap-1.5">
                            <Trash2 size={14} />
                            <span>Unenroll</span>
                          </span>
                        </>

                      )}

                    </button>

                  ) : (

                    <button
                      onClick={() => handleEnroll(course.$id)}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5 hover:scale-105 active:scale-95"
                    >

                      {isActionLoading ? (

                        <Loader2 size={14} className="animate-spin" />

                      ) : (

                        <>
                          <Plus size={14} />
                          <span>Enroll</span>
                        </>

                      )}

                    </button>

                  )}

                </div>

              </div>

            );

          })}

        </div>

      ) : (

        <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-slate-200/80 space-y-4 p-8">

          <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">

            <Library size={24} />

          </div>

          <div className="space-y-1 max-w-sm mx-auto">

            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'institutional'
                ? 'No institutional courses found'
                : 'No community courses found'}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">

              {activeTab === 'institutional'
                ? !studentUniversity
                  ? 'Your university could not be identified from your student profile. Please check your user collection university field.'
                  : `No institutional courses are currently available for ${studentUniversity} that match your selected filters.`
                : 'No community courses currently match your selected level, department, or search keywords.'}

            </p>

          </div>

        </div>

      )}

    </div>
  );
};

export default StudentCourseBrowse;
