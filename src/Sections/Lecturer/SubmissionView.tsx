import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, ArrowLeft, Calendar, Award, CheckCircle2, Clock, FileText, Mail, ExternalLink, CheckCheck } from 'lucide-react';
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
  submissionText?: string;
  fileUrl?: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  isRead?: boolean;
}

interface Student {
  $id: string;
  userId?: string;
  name: string;
  email: string;
  campusId?: string;
}

const SubmissionView = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'read'>('all');

  // Grading modal state
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentAndSubmissions();
    }
  }, [assignmentId]);

  const fetchAssignmentAndSubmissions = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch Assignment details
      const assignmentRes = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        assignmentId!
      );
      setAssignment(assignmentRes as unknown as Assignment);

      // 2. Fetch Submissions for this assignment
      const submissionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        [Query.equal('assignmentId', assignmentId!)]
      );
      setSubmissions(submissionsRes.documents as unknown as Submission[]);

      // 3. Fetch students to match names
      const studentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('role', 'student')]
      );
      setStudents(studentsRes.documents as unknown as Student[]);
    } catch (err) {
      console.error("Failed to fetch submissions data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReadStatus = async (sub: Submission) => {
    const nextReadState = !sub.isRead;
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        sub.$id,
        {
          isRead: nextReadState,
        }
      );

      setSubmissions((prev) =>
        prev.map((item) =>
          item.$id === sub.$id ? { ...item, isRead: nextReadState } : item
        )
      );
    } catch (err) {
      console.error("Failed to update read status:", err);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    try {
      setSubmittingGrade(true);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        activeSubmission.$id,
        {
          grade: parseFloat(grade),
          feedback,
          isRead: true, // Automatically mark as read when graded
        }
      );

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.$id === activeSubmission.$id
            ? { ...sub, grade: parseFloat(grade), feedback, isRead: true }
            : sub
        )
      );
      setActiveSubmission(null);
    } catch (err) {
      console.error("Failed to submit grade:", err);
    } finally {
      setSubmittingGrade(false);
    }
  };

  const getStudentDetails = (studentId: string) => {
    return students.find((s) => s.$id === studentId || s.userId === studentId);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterTab === 'unread') return !sub.isRead;
    if (filterTab === 'read') return !!sub.isRead;
    return true;
  });

  const unreadCount = submissions.filter((s) => !s.isRead).length;
  const readCount = submissions.filter((s) => !!s.isRead).length;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-2xl bg-indigo-50/80 backdrop-blur-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={18} />
        </button>
        <Header
          title="Assignment Submissions"
          description="Review student work, mark submissions as read, grade items, and provide feedback."
          icon={<ClipboardList size={20} />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : assignment ? (
        <div className="space-y-6">
          {/* Assignment Meta Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{assignment.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">{assignment.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-indigo-100/80 text-indigo-800 border border-indigo-200/60 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <Award size={14} className="text-indigo-600" />
                  <span>{assignment.totalMarks} Total Marks</span>
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-indigo-100/60 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-indigo-600" />
                <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <FileText size={14} className="text-indigo-600" />
                <span>Total Submissions: {submissions.length}</span>
              </span>
            </div>
          </div>

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
                {submissions.length}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('unread')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'unread'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
              }`}
            >
              <span>Unread</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterTab === 'unread' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                {unreadCount}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('read')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                filterTab === 'read'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
              }`}
            >
              <span>Read</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterTab === 'read' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                {readCount}
              </span>
            </button>
          </div>

          {/* Submissions List */}
          <div className="space-y-4">
            {filteredSubmissions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredSubmissions.map((sub) => {
                  const student = getStudentDetails(sub.studentId);
                  const isGraded = sub.grade !== undefined && sub.grade !== null;

                  return (
                    <div
                      key={sub.$id}
                      className={`p-5 rounded-2xl bg-white/90 backdrop-blur-xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        !sub.isRead ? 'border-indigo-300 ring-2 ring-indigo-100/60 bg-gradient-to-r from-indigo-50/30 via-white to-white' : 'border-indigo-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/60 shadow-2xs">
                          {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs font-bold text-slate-900 truncate">{student?.name || 'Unknown Student'}</h5>
                            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100/80">
                              {student?.campusId || 'N/A'}
                            </span>
                            {!sub.isRead && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold shadow-2xs">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <Mail size={12} className="shrink-0 text-indigo-500" />
                            <span>{student?.email || 'No email'}</span>
                          </p>
                          {sub.submissionText && (
                            <p className="text-xs text-slate-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 mt-2">
                              {sub.submissionText}
                            </p>
                          )}
                          {sub.fileUrl && (
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline mt-1"
                            >
                              <ExternalLink size={13} />
                              <span>View Attached File / Link</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-indigo-50 shrink-0">
                        <div className="flex flex-col items-end gap-1.5">
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold shadow-2xs">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>{sub.grade} / {assignment.totalMarks} Marks</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-semibold shadow-2xs">
                              <Clock size={13} className="text-amber-600" />
                              <span>Pending Grade</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleReadStatus(sub)}
                            title={sub.isRead ? "Mark as Unread" : "Mark as Read"}
                            className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                              sub.isRead 
                                ? 'bg-indigo-50/50 text-slate-600 border-indigo-100 hover:bg-indigo-100/60' 
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200/70'
                            }`}
                          >
                            <CheckCheck size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setActiveSubmission(sub);
                              setGrade(sub.grade !== undefined && sub.grade !== null ? sub.grade.toString() : '');
                              setFeedback(sub.feedback || '');
                              if (!sub.isRead) {
                                handleToggleReadStatus(sub);
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            {isGraded ? 'Edit Grade' : 'Grade Work'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 rounded-[2rem] bg-indigo-50/30 border border-dashed border-indigo-200/80 space-y-2">
                <FileText size={24} className="mx-auto text-indigo-400 mb-1" />
                <p className="text-xs font-semibold text-slate-800">No Submissions Found</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">No submissions match the current filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xs text-slate-500">Assignment not found.</p>
        </div>
      )}

      {/* Grading Modal */}
      {activeSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/20 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-indigo-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Grade Student Submission</h4>
              <button
                onClick={() => setActiveSubmission(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider">
                  Grade (Max: {assignment?.totalMarks})
                </label>
                <input
                  type="number"
                  max={assignment?.totalMarks}
                  min="0"
                  step="0.5"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider">
                  Feedback & Comments
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGrade}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingGrade && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Grade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionView;