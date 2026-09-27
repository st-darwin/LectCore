import React, { useState, useEffect } from 'react';
import { 
  Award, 
  FileText, 
  Clock, 
  AlertCircle, 
  Loader2,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { databases, account, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

interface Submission {
  $id: string;
  assignmentId: string;
  studentId: string;
  submissionText: string;
  fileUrl: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  isRead: boolean;
  $createdAt: string;
}

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
  university: string;
  department: string;
  level: string;
}

interface EnrichedGradeItem {
  id: string;
  assignmentTitle: string;
  assignmentDescription: string;
  dueDate: string;
  totalMarks: number;
  courseCode: string;
  courseTitle: string;
  grade: number | null;
  feedback: string;
  submittedAt: string;
}

export default function ViewGrades() {
  const [gradesData, setGradesData] = useState<EnrichedGradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSubmitted: 0,
    gradedCount: 0,
    averagePercentage: '0'
  });

  useEffect(() => {
    fetchStudentGrades();
  }, []);

  const fetchStudentGrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const authUser = await account.get();
      if (!authUser?.$id) {
        throw new Error("No authenticated session found. Please log in.");
      }

      const studentId = authUser.$id;

      const submissionsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId,
        [Query.equal('studentId', studentId)]
      );

      const submissions = submissionsResponse.documents as unknown as Submission[];

      if (submissions.length === 0) {
        setGradesData([]);
        setLoading(false);
        return;
      }

      const enrichedGrades = await Promise.all(
        submissions.map(async (sub) => {
          let assignmentDetails: Partial<Assignment> = { title: 'Unknown Assignment', totalMarks: 100 };
          let courseDetails: Partial<Course> = { courseCode: 'N/A', courseTitle: 'Unknown Course' };

          try {
            if (sub.assignmentId) {
              const assignment = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.assignmentId,
                sub.assignmentId
              ) as unknown as Assignment;
              assignmentDetails = assignment;

              if (assignment.courseId) {
                const course = await databases.getDocument(
                  appwriteConfig.databaseId,
                  appwriteConfig.courseId,
                  assignment.courseId
                ) as unknown as Course;
                courseDetails = course;
              }
            }
          } catch (err) {
            console.error("Error fetching relational info for submission:", err);
          }

          return {
            id: sub.$id,
            assignmentTitle: assignmentDetails.title || 'Untitled Assignment',
            assignmentDescription: assignmentDetails.description || '',
            dueDate: assignmentDetails.dueDate || '',
            totalMarks: assignmentDetails.totalMarks ?? 100,
            courseCode: courseDetails.courseCode || 'GEN',
            courseTitle: courseDetails.courseTitle || 'General Course',
            grade: sub.grade !== undefined && sub.grade !== null ? sub.grade : null,
            feedback: sub.feedback || 'No feedback provided yet.',
            submittedAt: sub.submittedAt || sub.$createdAt,
          };
        })
      );

      enrichedGrades.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setGradesData(enrichedGrades);

      const totalSubmitted = enrichedGrades.length;
      const gradedItems = enrichedGrades.filter(item => item.grade !== null);
      const gradedCount = gradedItems.length;

      let totalPercentageSum = 0;
      gradedItems.forEach(item => {
        if (item.grade !== null && item.totalMarks > 0) {
          totalPercentageSum += (item.grade / item.totalMarks) * 100;
        }
      });

      const averagePercentage = gradedCount > 0 ? (totalPercentageSum / gradedCount).toFixed(1) : '0';

      setStats({
        totalSubmitted,
        gradedCount,
        averagePercentage
      });

    } catch (err: any) {
      console.error("Failed to load grades:", err);
      setError(err?.message || "Failed to load grades. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <p className="text-xs font-medium text-slate-400 animate-pulse">Loading your academic records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 pt-2 text-slate-600">
      <AdminHeader 
        title="My Grades & Submissions" 
        description="Track your assignment scores, lecturer feedback, and academic performance across your enrolled courses."
        icon={<Award className="w-5 h-5 text-indigo-600" />}
        badgeText="Academic Records"
      />

      {/* Summary Stat Cards - Slider on mobile (<sm), Grid on desktop (>=sm) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 sm:hidden text-xs text-slate-400">
          <span>Overview stats</span>
          <ChevronRight className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
        </div>

        <div className="flex sm:grid sm:grid-cols-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none gap-3.5 pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth no-scrollbar">
          <div className="min-w-[75vw] sm:min-w-0 snap-center bg-white/90 backdrop-blur-xs border border-slate-200/70 rounded-3xl p-5 shadow-2xs text-center space-y-1 transition-all hover:border-slate-300 shrink-0">
            <p className="text-xs font-medium text-slate-400">Total Submitted</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.totalSubmitted}</p>
          </div>
          <div className="min-w-[75vw] sm:min-w-0 snap-center bg-white/90 backdrop-blur-xs border border-slate-200/70 rounded-3xl p-5 shadow-2xs text-center space-y-1 transition-all hover:border-slate-300 shrink-0">
            <p className="text-xs font-medium text-slate-400">Graded</p>
            <p className="text-2xl font-extrabold text-emerald-600">{stats.gradedCount}</p>
          </div>
          <div className="min-w-[75vw] sm:min-w-0 snap-center bg-white/90 backdrop-blur-xs border border-slate-200/70 rounded-3xl p-5 shadow-2xs text-center space-y-1 transition-all hover:border-slate-300 shrink-0">
            <p className="text-xs font-medium text-slate-400">Average Score</p>
            <p className="text-2xl font-extrabold text-indigo-600">{stats.averagePercentage}%</p>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {gradesData.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-3xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Submissions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            You haven't submitted any assignments yet. Once you submit assignments, your instructor's grades and feedback will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gradesData.map((item) => {
            const hasBeenGraded = item.grade !== null;
            const percentage = hasBeenGraded && item.grade !== null 
              ? Math.round((item.grade / item.totalMarks) * 100) 
              : 0;

            return (
              <div 
                key={item.id}
                className="bg-white border border-slate-200/70 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-all duration-200 hover:border-slate-300 hover:shadow-xs"
              >
                {/* Course & Assignment Details */}
                <div className="space-y-2.5 flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {item.courseCode}
                    </span>
                    <span className="text-xs font-medium text-slate-400 truncate max-w-[240px]">
                      {item.courseTitle}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 leading-snug">
                    {item.assignmentTitle}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Submitted: {new Date(item.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {hasBeenGraded && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 max-w-md">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 70 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Feedback Section */}
                <div className="w-full lg:w-4/12 bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Instructor Feedback:
                  </div>
                  <p className="text-slate-600 italic line-clamp-2 leading-relaxed">
                    {hasBeenGraded ? item.feedback : "Awaiting instructor review..."}
                  </p>
                </div>

                {/* Grade Badge / Status */}
                <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <span className="text-xs font-medium text-slate-400 lg:hidden">Score / Status:</span>
                  {hasBeenGraded ? (
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-600 flex items-baseline gap-1 lg:justify-end">
                        {item.grade} <span className="text-xs font-normal text-slate-400">/ {item.totalMarks}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 lg:justify-end">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {percentage}% {percentage >= 70 ? '• Distinction' : percentage >= 50 ? '• Pass' : '• Fair'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 text-amber-700 border border-amber-200/80 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Pending Grade
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}