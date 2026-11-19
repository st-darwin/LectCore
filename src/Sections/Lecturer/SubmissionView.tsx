
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Loader2, ArrowLeft, Calendar, Award, CheckCircle2,
  Clock, FileText, Mail, ExternalLink, CheckCheck, Search, Download,
  Building, Globe, X
} from 'lucide-react';

import AdminHeader from '../../Components/AdminHeader';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Assignment {
  $id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  accessScope?: string;
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
  role?: string;
}

type ScopeTab = 'institutional' | 'community';

const SubmissionView = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeScopeTab, setActiveScopeTab] = useState<ScopeTab>('institutional');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);

  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: 'pdf' | 'image';
  } | null>(null);

  useEffect(() => {
    if (assignmentId) fetchAssignmentAndSubmissions();
  }, [assignmentId]);

  const fetchAssignmentAndSubmissions = async () => {
    try {
      setLoading(true);

      const user = await account.get();
      if (!user) return;

      const [assignmentRes, submissionsRes, studentsRes] = await Promise.all([
        databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.assignmentId || 'assignments',
          assignmentId!
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.submissionsId || 'submissions',
          [Query.equal('assignmentId', assignmentId!)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('role', ['student', 'community_student'])]
        )
      ]);

      const fetchedAssignment = assignmentRes as unknown as Assignment;

      setAssignment(fetchedAssignment);
      setSubmissions(submissionsRes.documents as unknown as Submission[]);
      setStudents(studentsRes.documents as unknown as Student[]);

      if (fetchedAssignment.accessScope) {
        setActiveScopeTab(
          fetchedAssignment.accessScope.toLowerCase() === 'community'
            ? 'community'
            : 'institutional'
        );
      }
    } catch (err) {
      console.error('Failed to fetch submissions data:', err);
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
        { isRead: nextReadState }
      );

      setSubmissions((prev) =>
        prev.map((item) =>
          item.$id === sub.$id ? { ...item, isRead: nextReadState } : item
        )
      );
    } catch (err) {
      console.error('Failed to update read status:', err);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    const numericGrade = Number(grade);

    if (
      grade.trim() === '' ||
      !Number.isFinite(numericGrade) ||
      numericGrade < 0 ||
      numericGrade > (assignment?.totalMarks ?? Infinity)
    ) return;

    try {
      setSubmittingGrade(true);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        activeSubmission.$id,
        { grade: numericGrade, feedback, isRead: true }
      );

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.$id === activeSubmission.$id
            ? { ...sub, grade: numericGrade, feedback, isRead: true }
            : sub
        )
      );

      setActiveSubmission(null);
    } catch (err) {
      console.error('Failed to submit grade:', err);
    } finally {
      setSubmittingGrade(false);
    }
  };

  const getStudentDetails = (studentId: string) =>
    students.find((s) => s.$id === studentId || s.userId === studentId);

  const handleDownloadPDF = () => {
    try {
      setIsGeneratingPdf(true);

      const doc = new jsPDF();
      const scopeDisplay = activeScopeTab === 'community' ? 'Community' : 'Institutional';

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('LectCore - Assignment Submissions Report', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Assignment: ${assignment?.title || 'N/A'}`, 14, 25);

      doc.text(
        `Scope: ${scopeDisplay} | Total Marks: ${assignment?.totalMarks || 'N/A'} | Generated: ${new Date().toLocaleDateString()}`,
        14,
        31
      );

      const tableData = filteredSubmissions.map((sub, index) => {
        const student = getStudentDetails(sub.studentId);
        const isGraded = sub.grade !== undefined && sub.grade !== null;

        const submittedDate = sub.submittedAt
          ? new Date(sub.submittedAt).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short'
            })
          : 'N/A';

        return [
          (index + 1).toString(),
          student?.name || 'Unknown Student',
          student?.campusId || 'N/A',
          submittedDate,
          isGraded ? `${sub.grade} / ${assignment?.totalMarks || 100}` : 'Pending',
          sub.isRead ? 'Read' : 'Unread'
        ];
      });

      autoTable(doc, {
        startY: 36,
        head: [['#', 'Student Name', 'Campus ID', 'Submitted At', 'Marks', 'Status']],
        body: tableData,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      doc.save(
        `Submissions_${assignment?.title ? assignment.title.replace(/\s+/g, '_') : 'Report'}_${activeScopeTab}.pdf`
      );
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
      setShowDownloadModal(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((sub) => {
        const student = getStudentDetails(sub.studentId);
        const studentRole = student?.role?.toLowerCase();

        if (activeScopeTab === 'institutional') {
          if (studentRole === 'community_student') return false;
        } else {
          if (studentRole !== 'community_student') return false;
        }

        const matchesTab =
          filterTab === 'all'
            ? true
            : filterTab === 'unread'
              ? !sub.isRead
              : !!sub.isRead;

        if (!matchesTab) return false;
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();

        const nameMatch = student?.name?.toLowerCase().includes(query) || false;
        const idMatch = student?.campusId?.toLowerCase().includes(query) || false;
        const emailMatch = student?.email?.toLowerCase().includes(query) || false;
        const textMatch = sub.submissionText?.toLowerCase().includes(query) || false;

        return nameMatch || idMatch || emailMatch || textMatch;
      })
      // Newest submissions first
      .sort((a, b) => {
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();

        return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
      });
  }, [submissions, students, activeScopeTab, filterTab, searchQuery]);

  const institutionalSubmissionsCount = useMemo(() => {
    return submissions.filter((sub) => {
      const student = getStudentDetails(sub.studentId);
      return student?.role?.toLowerCase() !== 'community_student';
    }).length;
  }, [submissions, students]);

  const communitySubmissionsCount = useMemo(() => {
    return submissions.filter((sub) => {
      const student = getStudentDetails(sub.studentId);
      return student?.role?.toLowerCase() === 'community_student';
    }).length;
  }, [submissions, students]);

  const unreadCount = filteredSubmissions.filter((s) => !s.isRead).length;
  const readCount = filteredSubmissions.filter((s) => !!s.isRead).length;

  const getPreviewType = (url: string): 'pdf' | 'image' | null => {
    try {
      const pathname = new URL(url, window.location.origin).pathname.toLowerCase();

      if (pathname.endsWith('.pdf')) return 'pdf';
      if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(pathname)) return 'image';

      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-indigo-50/80 backdrop-blur-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={18} />
          </button>

          <AdminHeader
            title="Assignment Submissions"
            description="Review student work, mark submissions as read, grade items, and provide feedback."
            icon={<ClipboardList size={20} />}
          />
        </div>

        <button
          onClick={() => setShowDownloadModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Download size={15} />
          <span>Download Submits</span>
        </button>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveScopeTab('institutional');
            setFilterTab('all');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeScopeTab === 'institutional'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Building size={14} />
          <span>My Institution</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
            activeScopeTab === 'institutional'
              ? 'bg-indigo-50 text-indigo-600'
              : 'bg-slate-200/70 text-slate-500'
          }`}>
            {institutionalSubmissionsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveScopeTab('community');
            setFilterTab('all');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeScopeTab === 'community'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Globe size={14} />
          <span>Community</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
            activeScopeTab === 'community'
              ? 'bg-indigo-50 text-indigo-600'
              : 'bg-slate-200/70 text-slate-500'
          }`}>
            {communitySubmissionsCount}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : assignment ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase">
                    {activeScopeTab === 'community' ? 'Community Scope' : 'Institutional Scope'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{assignment.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                  {assignment.description}
                </p>
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
                <span>Filtered Submissions: {filteredSubmissions.length}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 border-b sm:border-b-0 border-indigo-100 pb-3 sm:pb-0 overflow-x-auto">
              {(['all', 'unread', 'read'] as const).map((tab) => {
                const count = tab === 'all'
                  ? filteredSubmissions.length
                  : tab === 'unread'
                    ? unreadCount
                    : readCount;

                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                      filterTab === tab
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-indigo-50/50 text-indigo-900 hover:bg-indigo-100/60 border border-indigo-100/80'
                    }`}
                  >
                    <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                      filterTab === tab
                        ? 'bg-indigo-700 text-white'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400"
              />
              <input
                type="text"
                placeholder="Search by name, ID or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-indigo-100 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

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
                        !sub.isRead
                          ? 'border-indigo-300 ring-2 ring-indigo-100/60 bg-gradient-to-r from-indigo-50/30 via-white to-white'
                          : 'border-indigo-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/60 shadow-2xs">
                          {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {student?.name || 'Unknown Student'}
                            </h5>

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
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {getPreviewType(sub.fileUrl) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const type = getPreviewType(sub.fileUrl!);
                                    if (type) {
                                      setPreviewFile({
                                        url: sub.fileUrl!,
                                        name: `${student?.name || 'Student'}'s Submission`,
                                        type
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 text-xs font-semibold transition-all cursor-pointer"
                                >
                                  <FileText size={14} />
                                  Preview Attachment
                                  <ExternalLink size={12} />
                                </button>
                              ) : (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 text-xs font-semibold transition-all"
                                >
                                  <ExternalLink size={14} />
                                  Open Attached Link
                                </a>
                              )}
                            </div>
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
                            title={sub.isRead ? 'Mark as Unread' : 'Mark as Read'}
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
                              setGrade(
                                sub.grade !== undefined && sub.grade !== null
                                  ? sub.grade.toString()
                                  : ''
                              );
                              setFeedback(sub.feedback || '');
                              if (!sub.isRead) handleToggleReadStatus(sub);
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
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No submissions match the current scope tab, filter, or search criteria.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xs text-slate-500">Assignment not found.</p>
        </div>
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/20 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-indigo-100 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <Download size={22} />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                Download Submissions PDF ({activeScopeTab === 'community' ? 'Community' : 'Institutional'})
              </h4>
              <p className="text-xs text-slate-500">
                Would you like to export a PDF document containing student names, campus IDs, submission dates, and grades for this scope?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingPdf && <Loader2 size={13} className="animate-spin" />}
                <span>{isGeneratingPdf ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {previewFile && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText size={17} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{previewFile.name}</h3>
                  <p className="text-[10px] text-slate-400">Assignment attachment preview</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-all"
                >
                  <ExternalLink size={13} />
                  Open Original
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                  aria-label="Close preview"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-100 overflow-hidden">
              {previewFile.type === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  title="Assignment PDF Preview"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-auto">
                  <img
                    src={previewFile.url}
                    alt="Assignment attachment"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 bg-white shrink-0">
              <span className="text-[10px] text-slate-400">
                {previewFile.type === 'pdf' ? 'PDF Document' : 'Image Attachment'}
              </span>

              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionView;
 