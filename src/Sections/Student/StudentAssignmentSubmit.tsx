import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, ArrowLeft, Upload, Send, ExternalLink, CheckCircle2, AlertCircle, Lock, Check } from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, storage, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';

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

const StudentAssignmemtSubmit = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Form states
  const [submissionText, setSubmissionText] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentAndSubmission();
    }
  }, [assignmentId]);

  const fetchAssignmentAndSubmission = async () => {
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

      // 2. Check for existing submission by this student
      const submissionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        [
          Query.equal('assignmentId', assignmentId!),
          Query.equal('studentId', user.$id),
        ]
      );

      if (submissionsRes.documents.length > 0) {
        const existingSub = submissionsRes.documents[0] as unknown as Submission;
        setSubmission(existingSub);
        setSubmissionText(existingSub.submissionText || '');
      }
    } catch (err) {
      console.error("Failed to fetch assignment submission data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    try {
      setSubmitting(true);
      const user = await account.get();
      if (!user) return;

      let fileUrl = submission?.fileUrl || '';

      // Upload new file if provided
      if (file) {
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageId || 'submissions_bucket',
          ID.unique(),
          file
        );

        const fileView = storage.getFileView(
          appwriteConfig.storageId || 'submissions_bucket',
          uploadedFile.$id
        );
        fileUrl = fileView.toString();
      }

      const submissionData = {
        assignmentId: assignmentId!,
        studentId: user.$id,
        submissionText,
        fileUrl,
        submittedAt: new Date().toISOString(),
        isRead: false,
      };

      const resSub = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        ID.unique(),
        submissionData
      );

      setSubmission(resSub as unknown as Submission);
      setFile(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to submit assignment work:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isPastDue = assignment ? new Date() > new Date(assignment.dueDate) : false;
  const isLocked = !!submission || isPastDue;

  return (
    <div className="space-y-6 pb-16 px-4 sm:px-0 animate-in fade-in duration-300">
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-2xl bg-indigo-50/80 backdrop-blur-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="overflow-hidden">
          <Header
            title="Submit Assignment"
            description="Upload files, add notes, and send your work for grading."
            icon={<FileText size={20} />}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : assignment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Quick Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 inline-block">
                Course: {assignment.courseId}
              </span>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{assignment.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{assignment.description}</p>
              <div className="pt-3 border-t border-indigo-100/60 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold truncate">Due: {new Date(assignment.dueDate).toLocaleString()}</p>
                <p className="font-semibold text-indigo-700">Total Marks: {assignment.totalMarks}</p>
              </div>

              {isPastDue && (
                <div className="flex items-start sm:items-center gap-1.5 text-xs  text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200/60">
                  <AlertCircle size={15} className="shrink-0 text-rose-600 mt-0.5 sm:mt-0" />
                  <span>Deadline has passed.</span>
                </div>
              )}

              {submission && (
                <div className="flex items-start sm:items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-200/60">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600 mt-0.5 sm:mt-0" />
                  <span>Work successfully submitted on {new Date(submission.submittedAt).toLocaleDateString()}.</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-slate-900">Your Work Submission</h4>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-semibold shadow-2xs">
                    <Lock size={12} className="text-amber-700" />
                    <span>Submissions Locked</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider">
                    Submission Text / Notes / Links
                  </label>
                  <textarea
                    rows={5}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    disabled={isLocked}
                    placeholder="Provide detailed notes, answers, or repository links..."
                    className="w-full px-4 py-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider">
                    Upload Document / Archive
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-32 px-4 transition bg-indigo-50/40 border-2 border-indigo-200 border-dashed rounded-2xl ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50/80'}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center w-full px-2">
                      <Upload size={22} className="text-indigo-500 mb-1 shrink-0" />
                      <p className="text-xs text-slate-600 font-medium truncate max-w-full sm:max-w-[260px]">
                        {file ? file.name : submission?.fileUrl ? 'Attached file submitted' : 'Click or tap to browse file'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, DOCX, ZIP, or code archives</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      disabled={isLocked}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {submission?.fileUrl && (
                    <div className="pt-1">
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        <ExternalLink size={13} />
                        <span>View submitted file</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 flex-wrap-reverse sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 cursor-pointer transition-all text-center"
                  >
                    Back
                  </button>
                  {!isLocked && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting && <Loader2 size={14} className="animate-spin" />}
                      <Send size={14} />
                      <span>Submit Assignment</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xs text-slate-500">Assignment not found.</p>
        </div>
      )}

      {/* Minimal Sleek Submission Confirmation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs sm:max-w-sm rounded-[2rem] p-5 sm:p-6 border border-indigo-100 shadow-2xl space-y-4 sm:space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="relative mx-auto w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Check size={28} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-slate-900 tracking-tight">Assignment Submitted!</h4>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                Your work for <span className="font-semibold text-slate-700">{assignment?.title}</span> has been logged and sent to your lecturer.
              </p>
            </div>

            {submission && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 text-left space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>Status</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    Submitted
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                  <span>Logged Time</span>
                  <span>{new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {submission?.fileUrl && (
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={13} />
                  <span>View File</span>
                </a>
              )}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(-1);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmemtSubmit;