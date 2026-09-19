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
  FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface Assignment {
  $id: string;
  title: string;
  description: string;
  courseId: string;
  lecturerId: string;
  dueDate: string;
  $createdAt: string;
  courseCode?: string;
  lecturerName?: string;
}

interface CourseMap {
  [key: string]: { code: string; title: string };
}

const ViewAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [coursesList, setCoursesList] = useState<{ id: string; code: string }[]>([]);

  // Fetch assignments alongside courses and lecturers for smooth lookups
  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, coursesRes] = await Promise.all([
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId || 'assignments'),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId)
      ]);

      const courseMap: CourseMap = {};
      const uniqueCourses: { id: string; code: string }[] = [];

      coursesRes.documents.forEach((doc: any) => {
        const code = doc.courseCode || doc.title || 'GEN';
        courseMap[doc.$id] = { code, title: doc.courseTitle || doc.title || 'General' };
        uniqueCourses.push({ id: doc.$id, code });
      });

      setCoursesList(uniqueCourses);

      const formattedAssignments = assignmentsRes.documents.map((doc: any) => {
        const courseInfo = courseMap[doc.courseId] || { code: 'GEN', title: 'General Course' };
        return {
          ...doc,
          courseCode: courseInfo.code,
          lecturerName: doc.lecturerName || doc.lecturerId || 'Assigned Instructor'
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

  // Handle deletion
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

  // Filter logic
  const filteredAssignments = assignments.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = courseFilter === 'all' || item.courseId === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Calculate statistics for stat cards
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
        <AdminHeader 
          title="Manage Assignments"
          description="Track student assessments, review course codes, and manage active deadlines."
          icon={<FileText className="w-6 h-6" />}
          badgeText="Assessments Portal"
        />
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
                className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
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
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: <strong className={isOverdue ? 'text-red-600 font-semibold' : 'text-slate-700 font-semibold'}>{new Date(item.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(item.$id)}
                    disabled={deletingId === item.$id}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Delete Assignment"
                  >
                    {deletingId === item.$id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

ViewAssignments.displayName = 'ViewAssignments';

export default ViewAssignments;