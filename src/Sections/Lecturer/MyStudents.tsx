
import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Mail,
  Loader2,
  BookOpen,
  Layers,
  Phone,
  
  Building,
  Globe,
  Download,
  X,
  Check,
  FileText,
} from 'lucide-react';

import Header from '../../Components/AdminHeader';
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
  role?: string;
  university?: string;
}

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  accessScope?: string;
}

interface Enrollment {
  $id: string;
  studentId: string;
  courseId: string;
}

type ScopeTab = 'institutional' | 'community';

const normalize = (value?: string) =>
  value?.trim().toLowerCase() || '';

const escapeHTML = (value?: string) =>
  (value || 'N/A')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const MyStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturerUniversity, setLecturerUniversity] = useState('');
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeScopeTab, setActiveScopeTab] =
    useState<ScopeTab>('institutional');

  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Export modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCourseId, setExportCourseId] = useState('');
  const [selectedExportStudentIds, setSelectedExportStudentIds] =
    useState<string[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  const fetchLecturerData = async () => {
    try {
      setLoading(true);

      const user = await account.get();

      if (!user) return;

      // Fetch lecturer profile
      let lecturerProfile: any = null;

      try {
        const profileResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );

        lecturerProfile = profileResponse.documents[0] || null;
      } catch (error) {
        console.warn('Could not fetch lecturer profile:', error);
      }

      if (!lecturerProfile) {
        try {
          lecturerProfile = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.$id
          );
        } catch {
          lecturerProfile = null;
        }
      }

      setLecturerUniversity(lecturerProfile?.university || '');

      // Fetch lecturer-owned courses
      const coursesRes1 = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('lecturerId', user.$id), Query.limit(100)]
      );

      let fetchedCourses = coursesRes1.documents as unknown as Course[];

      if (fetchedCourses.length === 0) {
        const coursesRes2 = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.equal('instructorId', user.$id), Query.limit(100)]
        );

        fetchedCourses = coursesRes2.documents as unknown as Course[];
      }

      setCourses(fetchedCourses);

      const courseIds = fetchedCourses.map((course) => course.$id);

      if (courseIds.length === 0) {
        setStudents([]);
        setEnrollments([]);
        return;
      }

      // Fetch enrollments for all lecturer-owned courses
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('courseId', courseIds), Query.limit(500)]
      );

      const fetchedEnrollments =
        enrollmentsRes.documents as unknown as Enrollment[];

      setEnrollments(fetchedEnrollments);

      const studentIds = Array.from(
        new Set(fetchedEnrollments.map((item) => item.studentId))
      );

      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch student profiles
      const studentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [
          Query.equal('role', ['student', 'community_student']),
          Query.limit(500),
        ]
      );

      const allStudents = studentsRes.documents as unknown as Student[];

      const enrolledStudents = allStudents.filter(
        (student) =>
          studentIds.includes(student.$id) ||
          (!!student.userId && studentIds.includes(student.userId))
      );

      setStudents(enrolledStudents);
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Keep the course filter populated with ALL lecturer courses
  const tabCourses = useMemo(() => {
    return courses;
  }, [courses]);

  const isInstitutionalStudent = (student: Student) => {
    if (normalize(student.role) === 'community_student') {
      return false;
    }

    if (!lecturerUniversity) {
      return true;
    }

    return (
      normalize(student.university) === normalize(lecturerUniversity)
    );
  };

  const isCommunityStudent = (student: Student) =>
    normalize(student.role) === 'community_student';

  const studentIsEnrolledInCourse = (
    student: Student,
    courseId: string
  ) => {
    return enrollments.some(
      (enrollment) =>
        enrollment.courseId === courseId &&
        (
          enrollment.studentId === student.$id ||
          (!!student.userId && enrollment.studentId === student.userId)
        )
    );
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Scope tab
      if (
        activeScopeTab === 'institutional' &&
        !isInstitutionalStudent(student)
      ) {
        return false;
      }

      if (
        activeScopeTab === 'community' &&
        !isCommunityStudent(student)
      ) {
        return false;
      }

      // Course filter
      if (selectedCourseId !== 'all') {
        if (!studentIsEnrolledInCourse(student, selectedCourseId)) {
          return false;
        }
      } else {
        const scopeCourseIds = new Set(
          courses
            .filter((course) =>
              activeScopeTab === 'community'
                ? normalize(course.accessScope) === 'community'
                : normalize(course.accessScope) !== 'community'
            )
            .map((course) => course.$id)
        );

        const enrolledInScope = enrollments.some(
          (enrollment) =>
            scopeCourseIds.has(enrollment.courseId) &&
            (
              enrollment.studentId === student.$id ||
              (!!student.userId &&
                enrollment.studentId === student.userId)
            )
        );

        if (!enrolledInScope) return false;
      }

      // Academic level
      if (
        selectedLevel !== 'all' &&
        student.level !== selectedLevel
      ) {
        return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();

        const matches =
          student.name?.toLowerCase().includes(term) ||
          student.email?.toLowerCase().includes(term) ||
          student.campusId?.toLowerCase().includes(term) ||
          student.phone?.toLowerCase().includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    students,
    enrollments,
    courses,
    activeScopeTab,
    selectedCourseId,
    selectedLevel,
    searchTerm,
  ]);

  const availableLevels = useMemo(() => {
    const scopeCourseIds = new Set(
      courses
        .filter((course) =>
          activeScopeTab === 'community'
            ? normalize(course.accessScope) === 'community'
            : normalize(course.accessScope) !== 'community'
        )
        .map((course) => course.$id)
    );

    const relevantStudents = students.filter((student) => {
      const correctScope =
        activeScopeTab === 'community'
          ? isCommunityStudent(student)
          : isInstitutionalStudent(student);

      if (!correctScope) return false;

      return enrollments.some(
        (enrollment) =>
          scopeCourseIds.has(enrollment.courseId) &&
          (
            enrollment.studentId === student.$id ||
            (!!student.userId &&
              enrollment.studentId === student.userId)
          )
      );
    });

    return Array.from(
      new Set(
        relevantStudents
          .map((student) => student.level)
          .filter(Boolean)
      )
    ) as string[];
  }, [students, enrollments, courses, activeScopeTab, lecturerUniversity]);

  const institutionalCount = useMemo(() => {
    const courseIds = new Set(
      courses
        .filter(
          (course) => normalize(course.accessScope) !== 'community'
        )
        .map((course) => course.$id)
    );

    return students.filter(
      (student) =>
        isInstitutionalStudent(student) &&
        enrollments.some(
          (enrollment) =>
            courseIds.has(enrollment.courseId) &&
            (
              enrollment.studentId === student.$id ||
              (!!student.userId &&
                enrollment.studentId === student.userId)
            )
        )
    ).length;
  }, [students, enrollments, courses, lecturerUniversity]);

  const communityCount = useMemo(() => {
    const courseIds = new Set(
      courses
        .filter(
          (course) => normalize(course.accessScope) === 'community'
        )
        .map((course) => course.$id)
    );

    return students.filter(
      (student) =>
        isCommunityStudent(student) &&
        enrollments.some(
          (enrollment) =>
            courseIds.has(enrollment.courseId) &&
            (
              enrollment.studentId === student.$id ||
              (!!student.userId &&
                enrollment.studentId === student.userId)
            )
        )
    ).length;
  }, [students, enrollments, courses]);

  const getCourseStudentCount = (courseId: string) => {
    const enrolledIds = new Set(
      enrollments
        .filter((item) => item.courseId === courseId)
        .map((item) => item.studentId)
    );

    return students.filter(
      (student) =>
        enrolledIds.has(student.$id) ||
        (!!student.userId && enrolledIds.has(student.userId))
    ).length;
  };

  // Students enrolled in the selected export course
  const exportCourseStudents = useMemo(() => {
    if (!exportCourseId) return [];

    return students.filter((student) =>
      studentIsEnrolledInCourse(student, exportCourseId)
    );
  }, [students, enrollments, exportCourseId]);

  const institutionalExportStudents = useMemo(
    () => exportCourseStudents.filter(isInstitutionalStudent),
    [exportCourseStudents, lecturerUniversity]
  );

  const communityExportStudents = useMemo(
    () => exportCourseStudents.filter(isCommunityStudent),
    [exportCourseStudents]
  );

  // Only students actually displayed in the export modal are selectable
  const exportableStudents = useMemo(
    () => [
      ...institutionalExportStudents,
      ...communityExportStudents,
    ],
    [institutionalExportStudents, communityExportStudents]
  );

  const openExportModal = () => {
    setExportCourseId(courses[0]?.$id || '');
    setSelectedExportStudentIds([]);
    setIsExportModalOpen(true);
  };

  const closeExportModal = () => {
    setIsExportModalOpen(false);
    setSelectedExportStudentIds([]);
  };

  const toggleExportStudent = (studentId: string) => {
    setSelectedExportStudentIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedExportStudentIds.length === exportableStudents.length
    ) {
      setSelectedExportStudentIds([]);
    } else {
      setSelectedExportStudentIds(
        exportableStudents.map((student) => student.$id)
      );
    }
  };

  const generatePDF = () => {
    const selectedStudents = exportableStudents.filter((student) =>
      selectedExportStudentIds.includes(student.$id)
    );

    const selectedCourse = courses.find(
      (course) => course.$id === exportCourseId
    );

    if (!selectedCourse || selectedStudents.length === 0) return;

    setIsGeneratingPDF(true);

    try {
      const institutionalSelected = selectedStudents.filter(
        isInstitutionalStudent
      );

      const communitySelected = selectedStudents.filter(
        isCommunityStudent
      );

      const renderStudentRows = (items: Student[]) =>
        items
          .map(
            (student, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.campusId)}</td>
               
               
                <td>${escapeHTML(student.phone)}</td>
                <td>${escapeHTML(student.email)}</td>
              </tr>
            `
          )
          .join('');

      const renderSection = (
        title: string,
        items: Student[]
      ) => {
        if (items.length === 0) return '';

        return `
          <section class="student-section">
            <div class="section-heading">
              <h2>${title}</h2>
              <span>${items.length} students</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Matric Number</th>
                  <th>Department</th>
                 
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                ${renderStudentRows(items)}
              </tbody>
            </table>
          </section>
        `;
      };

      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        alert(
          'Your browser blocked the PDF window. Please allow pop-ups and try again.'
        );
        return;
      }

      const documentHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHTML(selectedCourse.courseCode)} - Student List</title>

            <meta charset="UTF-8" />

            <style>
              * {
                box-sizing: border-box;
              }

              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #1e293b;
                margin: 32px;
                font-size: 11px;
              }

              .document-header {
                padding-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                margin-bottom: 24px;
              }

              .eyebrow {
                color: #6366f1;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                font-size: 9px;
                margin-bottom: 10px;
              }

              h1 {
                font-size: 23px;
                font-weight: 600;
                margin: 0 0 8px;
                color: #0f172a;
              }

              .course-title {
                color: #64748b;
                font-size: 12px;
                margin: 0;
              }

              .metadata {
                display: flex;
                flex-wrap: wrap;
                gap: 24px;
                margin-top: 18px;
                color: #64748b;
              }

              .metadata strong {
                color: #334155;
                font-weight: 600;
              }

              .student-section {
                margin-top: 26px;
                page-break-inside: auto;
              }

              .section-heading {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
              }

              .section-heading h2 {
                font-size: 13px;
                font-weight: 600;
                margin: 0;
                color: #334155;
              }

              .section-heading span {
                color: #64748b;
                font-size: 10px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9px;
              }

              th {
                text-align: left;
                color: #64748b;
                background: #f8fafc;
                font-weight: 600;
                padding: 10px 7px;
                border-bottom: 1px solid #e2e8f0;
              }

              td {
                padding: 9px 7px;
                border-bottom: 1px solid #edf2f7;
                color: #475569;
                overflow-wrap: anywhere;
              }

              tr {
                page-break-inside: avoid;
              }

              .footer {
                margin-top: 32px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
                color: #94a3b8;
                font-size: 9px;
              }

              @page {
                size: landscape;
                margin: 14mm;
              }

              @media print {
                body {
                  margin: 0;
                }
              }
            </style>
          </head>

          <body>
            <header class="document-header">
              <div class="eyebrow">Student Directory</div>

              <h1>${escapeHTML(selectedCourse.courseCode)}</h1>

              <p class="course-title">
                ${escapeHTML(selectedCourse.courseTitle)}
              </p>

              <div class="metadata">
                <span>
                  <strong>Total selected:</strong>
                  ${selectedStudents.length}
                </span>

                <span>
                  <strong>Institutional:</strong>
                  ${institutionalSelected.length}
                </span>

                <span>
                  <strong>Community:</strong>
                  ${communitySelected.length}
                </span>

                <span>
                  <strong>Generated:</strong>
                  ${new Date().toLocaleDateString()}
                </span>
              </div>
            </header>

            ${renderSection('My Institution', institutionalSelected)}
            ${renderSection('Community', communitySelected)}

            <footer class="footer">
              Student list generated from the lecturer dashboard.
            </footer>

            <script>
              window.onload = () => {
                window.focus();
                window.print();
              };

              window.onafterprint = () => {
                window.close();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(documentHTML);
      printWindow.document.close();
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Unable to generate the PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <Header
        title="My Students"
        description="View and filter enrolled students across your institutional and community courses."
        icon={<Users size={20} />}
      
      />

      {/* Export action */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openExportModal}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs  text-white shadow-sm shadow-indigo-200/60 transition-all hover:bg-indigo-700 active:scale-[0.98]"
        >
          <Download size={15} />
          Export List
        </button>
      </div>

      {/* Institutional vs Community Tabs */}
      <div className="flex w-fit items-center gap-2 rounded-2xl bg-slate-100/80 p-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveScopeTab('institutional');
            setSelectedCourseId('all');
            setSelectedLevel('all');
          }}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeScopeTab === 'institutional'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
          }`}
        >
          <Building size={14} />
          <span>My Institution</span>

          <span
            className={`rounded-lg px-2 py-0.5 text-[10px] ${
              activeScopeTab === 'institutional'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            {institutionalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveScopeTab('community');
            setSelectedCourseId('all');
            setSelectedLevel('all');
          }}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeScopeTab === 'community'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
          }`}
        >
          <Globe size={14} />
          <span>Community</span>

          <span
            className={`rounded-lg px-2 py-0.5 text-[10px] ${
              activeScopeTab === 'community'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            {communityCount}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-xs backdrop-blur-xl">
        {/* Course filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <BookOpen size={13} className="text-indigo-500" />
              <span>Filter by Course</span>
            </div>

            {selectedCourseId !== 'all' && (
              <button
                onClick={() => setSelectedCourseId('all')}
                className="cursor-pointer text-[11px] font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Reset
              </button>
            )}
          </div>

          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCourseId('all')}
              className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all ${
                selectedCourseId === 'all'
                  ? 'border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-indigo-100/50'
                  : 'border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Courses
            </button>

            {tabCourses.map((course) => {
              const count = getCourseStudentCount(course.$id);
              const isSelected = selectedCourseId === course.$id;

              return (
                <button
                  key={course.$id}
                  onClick={() => setSelectedCourseId(course.$id)}
                  className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all ${
                    isSelected
                      ? 'border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-indigo-100/50'
                      : 'border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{course.courseCode}</span>

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200/70 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level filter */}
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Layers size={13} className="text-indigo-500" />
              <span>Filter by Academic Level</span>
            </div>

            {selectedLevel !== 'all' && (
              <button
                onClick={() => setSelectedLevel('all')}
                className="cursor-pointer text-[11px] font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Reset
              </button>
            )}
          </div>

          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all ${
                selectedLevel === 'all'
                  ? 'border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-indigo-100/50'
                  : 'border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Levels
            </button>

            {availableLevels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`shrink-0 cursor-pointer whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-all ${
                  selectedLevel === level
                    ? 'border-indigo-200/80 bg-indigo-50 text-indigo-700 shadow-indigo-100/50'
                    : 'border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {level} Level
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and count */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1 sm:max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />

          <input
            type="text"
            placeholder="Search by name, email, campus ID, or phone..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-slate-200/60 bg-white/75 py-3 pl-11 pr-4 text-xs text-slate-900 shadow-xs backdrop-blur-xl focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start rounded-xl border border-slate-200/60 bg-white/50 px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto">
          
          <span>Showing: {filteredStudents.length} Students</span>
        </div>
      </div>

      {/* Student table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-slate-100 bg-white/40 py-20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400">
              Loading your student directory...
            </p>
          </div>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 shadow-2xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Matric Number</th>
                  
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Email Address</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/80 text-xs">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.$id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4  text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                          {student.name
                            ? student.name.charAt(0).toUpperCase()
                            : 'S'}
                        </div>

                        <span
                          className="max-w-[220px] truncate"
                          title={student.name}
                        >
                          {student.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-600">
                      <span className="rounded-md border border-slate-200/50 bg-slate-100/80 px-2 py-1 text-[11px]">
                        {student.campusId || 'N/A'}
                      </span>
                    </td>

                   

                    <td className="px-6 py-4 font-medium text-slate-600">
                      {student.phone ? (
                        <a
                          href={`tel:${student.phone}`}
                          className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                        >
                          <Phone
                            size={12}
                            className="shrink-0 text-indigo-500"
                          />
                          <span>{student.phone}</span>
                        </a>
                      ) : (
                        <span className="italic text-slate-400">
                          Not provided
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      <a
                        href={`mailto:${student.email}`}
                        className="flex max-w-[240px] items-center gap-1.5 truncate text-indigo-600 hover:underline"
                        title={student.email}
                      >
                        <Mail
                          size={12}
                          className="shrink-0 text-indigo-500"
                        />
                        <span className="truncate">{student.email}</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-[2rem] border border-dashed border-slate-200/80 bg-white/40 py-16 text-center sm:rounded-[2.5rem]">
          <BookOpen size={24} className="mx-auto mb-1 text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">
            No Students Found
          </p>
          <p className="mx-auto max-w-xs text-[11px] text-slate-400">
            No students match your selected scope tab, course, level, or
            search query.
          </p>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-[3px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeExportModal();
            }
          }}
        >
          <div className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 sm:rounded-[28px]">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText size={17} />
                </div>

                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Export student list
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Choose a course and select the students to include in
                  your PDF.
                </p>
              </div>

              <button
                type="button"
                onClick={closeExportModal}
                aria-label="Close export modal"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={17} />
              </button>
            </div>
 
            {/* Modal content */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              {/* Course selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Select course
                </label>

                <select
                  value={exportCourseId}
                  onChange={(event) => {
                    setExportCourseId(event.target.value);
                    setSelectedExportStudentIds([]);
                  }}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                >
                  {courses.length === 0 && (
                    <option value="">No courses available</option>
                  )}

                  {courses.map((course) => (
                    <option key={course.$id} value={course.$id}>
                      {course.courseCode} — {course.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selection summary */}
              {exportCourseId && (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Select students
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {selectedExportStudentIds.length} of{' '}
                      {exportableStudents.length} selected
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={exportableStudents.length === 0}
                    className="cursor-pointer self-start rounded-lg px-3 py-2 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                  >
                    {selectedExportStudentIds.length ===
                    exportableStudents.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </button>
                </div>
              )}

              {!exportCourseId ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <BookOpen
                    size={22}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  <p className="text-xs font-medium text-slate-500">
                    No courses available
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Create a course before exporting a student list.
                  </p>
                </div>
              ) : exportableStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <Users
                    size={22}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  <p className="text-xs font-medium text-slate-500">
                    No enrolled students
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    There are no students enrolled in this course yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Institutional students */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Building size={13} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            My Institution
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Institutional students
                          </p>
                        </div>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {institutionalExportStudents.length}
                      </span>
                    </div>

                    {institutionalExportStudents.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        {institutionalExportStudents.map((student) => {
                          const checked =
                            selectedExportStudentIds.includes(student.$id);

                          return (
                            <label
                              key={student.$id}
                              className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3.5 py-3 transition-colors last:border-b-0 hover:bg-slate-50/80"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleExportStudent(student.$id)
                                }
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                              />

                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                                {student.name?.charAt(0).toUpperCase() || 'S'}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {student.name}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                  {student.campusId || student.email || 'Student'}
                                </p>
                              </div>

                              {checked && (
                                <Check
                                  size={15}
                                  className="shrink-0 text-indigo-600"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-50 px-3.5 py-4 text-center text-[11px] text-slate-400">
                        No institutional students enrolled.
                      </p>
                    )}
                  </div>

                  {/* Community students */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <Globe size={13} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Community
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Community students
                          </p>
                        </div>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {communityExportStudents.length}
                      </span>
                    </div>

                    {communityExportStudents.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        {communityExportStudents.map((student) => {
                          const checked =
                            selectedExportStudentIds.includes(student.$id);

                          return (
                            <label
                              key={student.$id}
                              className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3.5 py-3 transition-colors last:border-b-0 hover:bg-slate-50/80"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleExportStudent(student.$id)
                                }
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                              />

                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[11px] font-semibold text-violet-600">
                                {student.name?.charAt(0).toUpperCase() || 'S'}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {student.name}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                  {student.campusId || student.email || 'Student'}
                                </p>
                              </div>

                              {checked && (
                                <Check
                                  size={15}
                                  className="shrink-0 text-indigo-600"
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-50 px-3.5 py-4 text-center text-[11px] text-slate-400">
                        No community students enrolled.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={closeExportModal}
                className="w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={generatePDF}
                disabled={
                  selectedExportStudentIds.length === 0 ||
                  isGeneratingPDF
                }
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs  text-white shadow-sm shadow-indigo-200/60 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {isGeneratingPDF ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}

                {isGeneratingPDF ? 'Preparing PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStudents;
