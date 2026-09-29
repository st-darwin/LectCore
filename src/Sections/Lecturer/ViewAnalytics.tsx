import React, { useState, useEffect } from 'react';
import { 

  BookOpen, 
  Users, 
  ClipboardList, 
  Files, 
  TrendingUp, 
  Loader2, 
  Calendar,
  
  Layers,
  AlertCircle
} from 'lucide-react';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { Query,type Models } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

interface CourseAnalytics {
  id: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;
  studentsEnrolled: number;
  materialsCount: number;
  assignmentsCount: number;
  submissionsCount: number;
}

interface CourseDocument extends Models.Document {
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;
  lecturerId: string;
}

interface MaterialDocument extends Models.Document {
  courseId: string;
}

interface AssignmentDocument extends Models.Document {
  courseId: string;
}

interface EnrollmentDocument extends Models.Document {
  courseId: string;
  studentId: string;
}

interface SubmissionDocument extends Models.Document {
  assignmentId: string;
}

const ViewAnalytics: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Overall Lecturer Metrics
  const [totalCourses, setTotalCourses] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalMaterials, setTotalMaterials] = useState<number>(0);
  const [totalAssignments, setTotalAssignments] = useState<number>(0);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  
  // Per-course breakdown
  const [courseBreakdown, setCourseBreakdown] = useState<CourseAnalytics[]>([]);

  useEffect(() => {
    const fetchLecturerAnalytics = async () => {
      try {
        setLoading(true);
        // 1. Get current logged in user account
        const user = await account.get();
        const lecturerUserId = user.$id; // matches lecturerId in courses collection

        // 2. Fetch courses created/assigned to this lecturer
        const coursesRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.equal('lecturerId', lecturerUserId)]
        );

        const courses = coursesRes.documents as unknown as CourseDocument[];
        setTotalCourses(courses.length);

        if (courses.length === 0) {
          setLoading(false);
          return;
        }

        const courseIds = courses.map((c: CourseDocument) => c.$id);

        // 3. Fetch related materials, assignments, enrollments for these courses
        let allMaterials: MaterialDocument[] = [];
        let allAssignments: AssignmentDocument[] = [];
        let allEnrollments: EnrollmentDocument[] = [];
        let allSubmissions: SubmissionDocument[] = [];

        try {
          const materialsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.courseMaterialsId,
            [Query.equal('courseId', courseIds)]
          );
          allMaterials = materialsRes.documents as unknown as MaterialDocument[];
          setTotalMaterials(allMaterials.length);
        } catch (e: unknown) {
          console.warn('Could not fetch materials analytics', e);
        }

        try {
          const assignmentsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.assignmentId,
            [Query.equal('courseId', courseIds)]
          );
          allAssignments = assignmentsRes.documents as unknown as AssignmentDocument[];
          setTotalAssignments(allAssignments.length);
        } catch (e: unknown) {
          console.warn('Could not fetch assignments analytics', e);
        }

        try {
          const enrollmentsRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.enrollmentsId,
            [Query.equal('courseId', courseIds)]
          );
          allEnrollments = enrollmentsRes.documents as unknown as EnrollmentDocument[];
          // Count unique students enrolled in lecturer's courses
          setTotalStudents(new Set(allEnrollments.map((e: EnrollmentDocument) => e.studentId)).size);
        } catch (e: unknown) {
          console.warn('Could not fetch enrollments analytics', e);
        }

        if (allAssignments.length > 0) {
          const assignmentIds = allAssignments.map((a: AssignmentDocument) => a.$id);
          try {
            const submissionsRes = await databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.submissionsId,
              [Query.equal('assignmentId', assignmentIds)]
            );
            allSubmissions = submissionsRes.documents as unknown as SubmissionDocument[];
            setTotalSubmissions(allSubmissions.length);
          } catch (e: unknown) {
            console.warn('Could not fetch submissions analytics', e);
          }
        }

        // 4. Build per-course breakdown metrics
        const breakdown: CourseAnalytics[] = courses.map((course: CourseDocument) => {
          const cId = course.$id;
          const cEnrollments = allEnrollments.filter((e: EnrollmentDocument) => e.courseId === cId).length;
          const cMaterials = allMaterials.filter((m: MaterialDocument) => m.courseId === cId).length;
          const cAssignments = allAssignments.filter((a: AssignmentDocument) => a.courseId === cId);
          const cAssignmentIds = cAssignments.map((a: AssignmentDocument) => a.$id);
          const cSubmissions = allSubmissions.filter((s: SubmissionDocument) => cAssignmentIds.includes(s.assignmentId)).length;

          return {
            id: cId,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            department: course.department,
            level: course.level,
            studentsEnrolled: cEnrollments,
            materialsCount: cMaterials,
            assignmentsCount: cAssignments.length,
            submissionsCount: cSubmissions,
          };
        });

        setCourseBreakdown(breakdown);

      } catch (err: unknown) {
        console.error('Error loading lecturer analytics:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load your analytics.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchLecturerAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Syncing academic insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-3">
   <AdminHeader
        title="Analytics Dashboard"
        description="Comprehensive platform telemetry tracking course activity, student reach, and submission throughput."
        badgeText="Analysis view"
      />

      {/* Soft Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 shadow-2xs flex flex-col justify-between hover:border-violet-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-violet-50/80 border border-violet-100/60 flex items-center justify-center text-violet-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50/60 px-2.5 py-0.5 rounded-full">Courses</span>
          </div>
          <div className="mt-4 space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium">Assigned Courses</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{totalCourses}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 shadow-2xs flex flex-col justify-between hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50/80 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50/60 px-2.5 py-0.5 rounded-full">Students</span>
          </div>
          <div className="mt-4 space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium">Enrolled Reach</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{totalStudents}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 shadow-2xs flex flex-col justify-between hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-blue-50/80 border border-blue-100/60 flex items-center justify-center text-blue-600">
              <Files className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50/60 px-2.5 py-0.5 rounded-full">Materials</span>
          </div>
          <div className="mt-4 space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium">Uploads & Notes</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{totalMaterials}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 shadow-2xs flex flex-col justify-between hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-amber-50/80 border border-amber-100/60 flex items-center justify-center text-amber-600">
              <ClipboardList className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50/60 px-2.5 py-0.5 rounded-full">Tasks</span>
          </div>
          <div className="mt-4 space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium">Active Assignments</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{totalAssignments}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-5 shadow-2xs flex flex-col justify-between hover:border-indigo-200 transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50/60 px-2.5 py-0.5 rounded-full">Throughput</span>
          </div>
          <div className="mt-4 space-y-0.5">
            <p className="text-[11px] text-slate-400 font-medium">Total Submissions</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{totalSubmissions}</p>
          </div>
        </div>
      </div>

      {/* Per-Course Breakdown Card Section */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-violet-600" /> Course-Level Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Granular analytics breakdown mapped to each individual course code.</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
            {courseBreakdown.length} Active
          </span>
        </div>

        {courseBreakdown.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">No courses found matching your lecturer profile.</p>
            <p className="text-[11px] text-slate-400">Courses created with your account ID will automatically display analytics here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseBreakdown.map((course: CourseAnalytics) => (
              <div 
                key={course.id} 
                className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60 hover:border-violet-200/80 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-violet-100/60 text-violet-700 text-[11px] font-bold">
                      {course.courseCode}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                      Level {course.level || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-900 leading-snug">{course.courseTitle}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{course.department}</p>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200/50 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100/80 shadow-2xs">
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Students</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{course.studentsEnrolled}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100/80 shadow-2xs">
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Materials</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{course.materialsCount}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100/80 shadow-2xs">
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Tasks</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{course.assignmentsCount}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100/80 shadow-2xs">
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Submits</p>
                    <p className="text-xs font-bold text-violet-600 mt-0.5">{course.submissionsCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAnalytics;