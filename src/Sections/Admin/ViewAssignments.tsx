import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Loader2, 
  Calendar, 
  BookOpen, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Filter,
  ChevronDown,
  FileSpreadsheet,
  Plus,
  MoreVertical,
  Eye,
  Award,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';
import { ID, Query } from 'appwrite';

interface Assignment {
  $id: string;
  title: string;
  description: string;
  courseId: string;
  lecturerId: string;
  dueDate: string;
  totalMarks: number;
  $createdAt: string;
  courseCode?: string;
  lecturerName?: string;
}

interface Submission {
  $id: string;
  assignmentId: string;
  studentId: string;
  submissionText: string;
  fileUrl: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  studentName?: string;
}

const ViewAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [coursesList, setCoursesList] = useState<{ id: string; code: string; title: string }[]>([]);

  // Action Menu Dropdown state per assignment ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState<boolean>(false);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<Assignment | null>(null);
  
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Grading Modal/Inline states
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [submittingGrade, setSubmittingGrade] = useState<boolean>(false);

  // Create Assignment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState('100');
  const [creating, setCreating] = useState(false);

  // Helper to fetch user names from the 'users' collection using the custom 'userId' field
  const fetchUserNamesMap = async (userIds: string[]): Promise<Record<string, string>> => {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    try {
      // Query documents where the custom 'userId' field matches the IDs in our list
      const usersRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId || 'users',
        [Query.equal('userId', uniqueIds)]
      );

      const map: Record<string, string> = {};
      usersRes.documents.forEach((doc: any) => {
        const name = doc.name || doc.fullName || 'Unknown User';
        // Map by the custom 'userId' property stored in the document
        if (doc.userId) {
          map[doc.userId] = name;
        }
        // Also map by document $id just in case some entries use standard Appwrite IDs
        map[doc.$id] = name;
      });
      return map;
    } catch (err) {
      console.warn('Could not fetch user names from userCollection:', err);
      return {};
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, coursesRes] = await Promise.all([
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId || 'assignments'),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId)
      ]);

      const courseMap: Record<string, { code: string; title: string }> = {};
      const uniqueCourses: { id: string; code: string; title: string }[] = [];

      coursesRes.documents.forEach((doc: any) => {
        const code = doc.courseCode || doc.code || doc.title || 'GEN';
        const title = doc.courseTitle || doc.title || 'General Course';
        courseMap[doc.$id] = { code, title };
        uniqueCourses.push({ id: doc.$id, code, title });
      });

      setCoursesList(uniqueCourses);
      if (uniqueCourses.length > 0 && !newCourseId) {
        setNewCourseId(uniqueCourses[0].id);
      }

      // Collect all lecturer IDs and fetch their corresponding names from the userCollection
      const lecturerIds = assignmentsRes.documents.map((doc: any) => doc.lecturerId);
      const userNameMap = await fetchUserNamesMap(lecturerIds);

      const formattedAssignments = assignmentsRes.documents.map((doc: any) => {
        const courseInfo = courseMap[doc.courseId] || { code: 'GEN', title: 'General Course' };
        const resolvedLecturerName = userNameMap[doc.lecturerId] || doc.lecturerName || 'Assigned Instructor';
        return {
          ...doc,
          courseCode: courseInfo.code,
          lecturerName: resolvedLecturerName
        };
      });

      setAssignments(formattedAssignments as Assignment[]);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError(err.message || 'Failed to load assignments from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newCourseId || !newDueDate) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      const user = await account.get();

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        ID.unique(),
        {
          title: newTitle,
          description: newDescription,
          courseId: newCourseId,
          lecturerId: user?.$id || 'admin',
          dueDate: new Date(newDueDate).toISOString(),
          totalMarks: parseInt(newTotalMarks) || 100
        }
      );

      setSuccessMessage('Assignment created successfully!');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewTotalMarks('100');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.message || 'Failed to create assignment.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      setDeletingId(id);
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        id
      );
      setAssignments((prev) => prev.filter((item) => item.$id !== id));
      setSuccessMessage('Assignment deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      setError(err.message || 'Failed to delete assignment.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenSubmissions = async (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setSelectedAssignmentForSubmissions(assignment);
    setIsSubmissionsModalOpen(true);
    setLoadingSubmissions(true);

    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        [Query.equal('assignmentId', assignment.$id)]
      );

      // Collect student IDs and fetch their corresponding names from the userCollection
      const studentIds = res.documents.map((doc: any) => doc.studentId);
      const studentNameMap = await fetchUserNamesMap(studentIds);

      const formattedSubmissions = res.documents.map((doc: any) => ({
        ...doc,
        studentName: studentNameMap[doc.studentId] || doc.studentName || `Student (${doc.studentId.slice(0, 6)}...)`
      }));

      setSubmissionsList(formattedSubmissions as Submission[]);
    } catch (err: any) {
      console.error('Failed to fetch submissions:', err);
      setError('Failed to load student submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (subId: string) => {
    try {
      setSubmittingGrade(true);
      const parsedGrade = parseInt(gradeInput);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        subId,
        {
          grade: isNaN(parsedGrade) ? 0 : parsedGrade,
          feedback: feedbackInput
        }
      );

      setSubmissionsList((prev) =>
        prev.map((s) => (s.$id === subId ? { ...s, grade: parsedGrade, feedback: feedbackInput } : s))
      );
      setGradingSubId(null);
      setSuccessMessage('Grade and feedback saved successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to save grade:', err);
      setError(err.message || 'Failed to save grade.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const filteredAssignments = assignments.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = courseFilter === 'all' || item.courseId === courseFilter;

    return matchesSearch && matchesCourse;
  });

  const totalAssignments = assignments.length;
  const activeCoursesCount = new Set(assignments.map(a => a.courseId)).size;
  const upcomingCount = assignments.filter(a => new Date(a.dueDate) > new Date()).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2 text-slate-600">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-3">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AdminHeader 
            title="Manage Assignments"
            description="Track student assessments, review course codes, and manage active deadlines."
            icon={<FileText className="w-6 h-6" />}
            badgeText="Assessments Portal"
          />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Assignments</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalAssignments}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Active Courses</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeCoursesCount}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Upcoming Deadlines</p>
            <h3 className="text-2xl font-bold text-slate-800">{upcomingCount}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, course, lecturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium hidden xs:inline">Course:</span>
          </div>
          <div className="relative w-full sm:w-48">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Courses</option>
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Assignments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchTerm || courseFilter !== 'all' 
              ? 'Try adjusting your search terms or course filter.' 
              : 'No assignments have been published to the portal yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((item) => {
            const isOverdue = new Date(item.dueDate) < new Date();

            return (
              <div 
                key={item.$id}
                className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                          <BookOpen className="w-3 h-3" /> {item.courseCode}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                          <User className="w-3 h-3 text-slate-400" /> {item.lecturerName}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
                    </div>

                    {/* 3-Dots Action Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === item.$id ? null : item.$id);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === item.$id && (
                        <div 
                          className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 text-xs animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleOpenSubmissions(item, e)}
                            className="w-full px-4 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Submissions
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDelete(item.$id);
                            }}
                            className="w-full px-4 py-2 text-left flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Assignment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due: <strong className={isOverdue ? 'text-red-600 font-semibold' : 'text-slate-700 font-semibold'}>{new Date(item.dueDate).toLocaleDateString()}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-600">{item.totalMarks || 100} Marks</span>
                  </div>
                  
                  <button
                    onClick={(e) => handleOpenSubmissions(item, e)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Submissions</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Create New Assignment</h3>
                <p className="text-xs text-slate-500">Publish a new task or assessment for enrolled courses.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Assignment Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Database Normalization Project"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Select Course *</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  >
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Total Marks *</label>
                  <input
                    type="number"
                    value={newTotalMarks}
                    onChange={(e) => setNewTotalMarks(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Due Date *</label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Description & Instructions *</label>
                <textarea
                  rows={4}
                  placeholder="Provide detailed instructions for the students..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Publish Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & GRADE SUBMISSIONS MODAL */}
      {isSubmissionsModalOpen && selectedAssignmentForSubmissions && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                  {selectedAssignmentForSubmissions.courseCode}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedAssignmentForSubmissions.title} - Submissions</h3>
              </div>
              <button 
                onClick={() => {
                  setIsSubmissionsModalOpen(false);
                  setSelectedAssignmentForSubmissions(null);
                  setGradingSubId(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingSubmissions ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">No Submissions Yet</p>
                  <p className="text-[11px] text-slate-500">No students have submitted work for this assignment yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissionsList.map((sub) => {
                    const isGradingThis = gradingSubId === sub.$id;

                    return (
                      <div key={sub.$id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800">
                              <User className="w-3.5 h-3.5 text-indigo-600" /> {sub.studentName}
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Submitted on: {new Date(sub.submittedAt || sub.$createdAt).toLocaleString()}
                            </p>
                          </div>

                          {sub.grade !== undefined && sub.grade !== null ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Grade: {sub.grade} / {selectedAssignmentForSubmissions.totalMarks}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                              Pending Grade
                            </span>
                          )}
                        </div>

                        {sub.submissionText && (
                          <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {sub.submissionText}
                          </div>
                        )}

                        {sub.fileUrl && (
                          <div>
                            <a 
                              href={sub.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                            >
                              View Attached File / Document
                            </a>
                          </div>
                        )}

                        {sub.feedback && !isGradingThis && (
                          <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-600">
                            <strong>Instructor Feedback:</strong> "{sub.feedback}"
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/60">
                          {isGradingThis ? (
                            <div className="w-full space-y-3 pt-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-slate-700">Score (Max {selectedAssignmentForSubmissions.totalMarks})</label>
                                  <input
                                    type="number"
                                    value={gradeInput}
                                    onChange={(e) => setGradeInput(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                  <label className="text-[11px] font-semibold text-slate-700">Feedback / Comments</label>
                                  <input
                                    type="text"
                                    value={feedbackInput}
                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                    placeholder="Provide constructive feedback..."
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setGradingSubId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveGrade(sub.$id)}
                                  disabled={submittingGrade}
                                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                                >
                                  {submittingGrade && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>Save Grade</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGradingSubId(sub.$id);
                                setGradeInput(sub.grade !== undefined && sub.grade !== null ? sub.grade.toString() : '');
                                setFeedbackInput(sub.feedback || '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                              {sub.grade !== undefined && sub.grade !== null ? 'Update Grade & Feedback' : 'Grade Submission'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ViewAssignments.displayName = 'ViewAssignments';

export default ViewAssignments;