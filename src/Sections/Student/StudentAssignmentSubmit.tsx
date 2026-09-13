import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, ArrowLeft, Upload, Send, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
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

      let resSub;
      if (submission) {
        resSub = await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.submissionsId || 'submissions',
          submission.$id,
          submissionData
        );
      } else {
        resSub = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.submissionsId || 'submissions',
          ID.unique(),
          submissionData
        );
      }

      setSubmission(resSub as unknown as Submission);
      setFile(null);
      navigate(-1);
    } catch (err) {
      console.error("Failed to submit assignment work:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isPastDue = assignment ? new Date() > new Date(assignment.dueDate) : false;

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
          title="Submit Assignment"
          description="Upload your files, add project links or notes, and send your work for grading."
          icon={<FileText size={20} />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : assignment ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Quick Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 inline-block">
                Course: {assignment.courseId}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{assignment.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{assignment.description}</p>
              <div className="pt-3 border-t border-indigo-100/60 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold">Due: {new Date(assignment.dueDate).toLocaleString()}</p>
                <p className="font-semibold text-indigo-700">Total Marks: {assignment.totalMarks}</p>
              </div>
              {isPastDue && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200/60">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>Warning: The deadline for this assignment has passed.</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Your Work Submission</h4>
                {submission && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Previously Submitted</span>
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
                    placeholder="Provide detailed notes, answers, or repository links..."
                    className="w-full px-4 py-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider">
                    Upload Document / Archive
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-indigo-50/40 border-2 border-indigo-200 border-dashed rounded-2xl cursor-pointer hover:bg-indigo-50/80">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                      <Upload size={22} className="text-indigo-500 mb-1" />
                      <p className="text-xs text-slate-600 font-medium truncate max-w-[260px]">
                        {file ? file.name : submission?.fileUrl ? 'Replace attached file' : 'Click to browse file'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, DOCX, ZIP, or code archives</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {submission?.fileUrl && !file && (
                    <div className="pt-1">
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        <ExternalLink size={13} />
                        <span>View currently attached file</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    <Send size={14} />
                    <span>{submission ? 'Update Submission' : 'Submit Assignment'}</span>
                  </button>
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
    </div>
  );
};

export default StudentAssignmemtSubmit;