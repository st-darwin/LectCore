import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, Calendar, Award, CheckCircle2, Clock, FileText, AlertCircle, ArrowRight, BookOpen, CheckCheck, MessageSquare } from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Assignment {
  $id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
}

interface Submission {
  $id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
}

const StudentAssignmentsView = () => {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch student's course enrollments first
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId || 'enrollments',
        [Query.equal('studentId', user.$id)]
      );

      const enrolledCourseIds = enrollmentsRes.documents.map((doc: any) => doc.courseId);

      if (enrolledCourseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch courses to map courseId to actual course codes
      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId || 'courses',
        [Query.equal('$id', enrolledCourseIds)]
      );

      const map: Record<string, string> = {};
      coursesRes.documents.forEach((doc: any) => {
        map[doc.$id] = doc.code || doc.courseCode || doc.title || 'Course';
      });
      setCoursesMap(map);

      // 3. Fetch assignments restricted ONLY to enrolled courses
      const assignmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        [Query.equal('courseId', enrolledCourseIds)]
      );
      setAssignments(assignmentsRes.documents as unknown as Assignment[]);

      // 4. Fetch student's submissions
      const submissionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        [Query.equal('studentId', user.$id)]
      );
      setSubmissions(submissionsRes.documents as unknown as Submission[]);
    } catch (err) {
      console.error("Failed to fetch student assignments data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find((sub) => sub.assignmentId === assignmentId);
  };

  const processedAssignments = assignments.map((assignment) => {
    const submission = getSubmissionForAssignment(assignment.$id);
    const isSubmitted = !!submission;
    const isGraded = submission?.grade !== undefined && submission?.grade !== null;
    const isPastDue = new Date() > new Date(assignment.dueDate);
    const courseCode = coursesMap[assignment.courseId] || assignment.courseId;

    let status: 'completed' | 'pending' = 'pending';
    if (isSubmitted) {
      status = 'completed';
    }

    return {
      ...assignment,
      courseCode,
      submission,
      isSubmitted,
      isGraded,
      isPastDue,
      status,
    };
  });

  const filteredAssignments = processedAssignments.filter((item) => {
    if (filterTab === 'pending') return !item.isSubmitted;
    if (filterTab === 'completed') return item.isSubmitted;
    return true;
  });

  const pendingCount = processedAssignments.filter((item) => !item.isSubmitted).length;
  const completedCount = processedAssignments.filter((item) => item.isSubmitted).length;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <Header
        title="My Assignments"
        description="Track your coursework, view deadlines, submit your assignments, and check feedback."
        icon={<ClipboardList size={20} />}
      />

      {/* Filter Tabs Section */}
      <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            filterTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
          }`}
        >
          <span>All</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterTab === 'all' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {processedAssignments.length}
          </span>
        </button>
        <button
          onClick={() => setFilterTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            filterTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
          }`}
        >
          <span>Pending</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterTab === 'pending' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {pendingCount}
          </span>
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            filterTab === 'completed'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
          }`}
        >
          <span>Completed</span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterTab === 'completed' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {completedCount}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((item) => (
            <div
              key={item.$id}
              className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-5 rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-indigo-600" />
                    <span>{item.courseCode}</span>
                  </span>
                  {item.isGraded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/60 text-[10px] font-semibold">
                      <CheckCheck size={12} className="text-violet-600" />
                      <span>Marked ({item.submission?.grade}/{item.totalMarks})</span>
                    </span>
                  ) : item.isSubmitted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>Submitted</span>
                    </span>
                  ) : item.isPastDue ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-semibold">
                      <AlertCircle size={12} className="text-rose-600" />
                      <span>Past Due</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-semibold">
                      <Clock size={12} className="text-amber-600" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                {/* Grade and Feedback Preview Box */}
                {item.isGraded && (
                  <div className="p-3 rounded-2xl bg-violet-50/60 border border-violet-100/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-violet-900">
                      <span>Grade: {item.submission?.grade} / {item.totalMarks}</span>
                    </div>
                    {item.submission?.feedback && (
                      <p className="text-slate-600 text-[11px] leading-relaxed flex items-start gap-1.5 pt-1 border-t border-violet-100/60">
                        <MessageSquare size={13} className="text-violet-500 shrink-0 mt-0.5" />
                        <span className="italic">"{item.submission.feedback}"</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-indigo-100/60 flex items-center justify-between gap-2 text-xs">
                <div className="space-y-1 text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <Calendar size={13} className="text-indigo-600" />
                    <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <Award size={13} className="text-indigo-600" />
                    <span>{item.totalMarks} Total Marks</span>
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/student/assignment/${item.$id}`)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>{item.isSubmitted ? 'View Submission' : 'Submit Work'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-indigo-50/30 border border-dashed border-indigo-200/80 space-y-2">
          <FileText size={24} className="mx-auto text-indigo-400 mb-1" />
          <p className="text-xs font-semibold text-slate-800">No Assignments Found</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">No assignments match your enrolled courses or current filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsView;