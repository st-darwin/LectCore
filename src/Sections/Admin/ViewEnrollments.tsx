import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  BookOpen, 
  Calendar, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  FolderOpen,
  ArrowRight,
  User
} from 'lucide-react';
import { Query } from 'appwrite';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface Enrollment {
  $id: string;
  studentId: string; 
  courseId: string; // References the course document ID
  enrolledAt: string;
  $createdAt: string;
}

const ViewEnrollments: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Caching maps
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [courseCodes, setCourseCodes] = useState<Record<string, string>>({});
  const [loadingMetaData, setLoadingMetaData] = useState<boolean>(false);

  // Fetch all enrollment records on load
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId
      );
      const docs = response.documents as unknown as Enrollment[];
      setEnrollments(docs);
      setFilteredEnrollments(docs);

      // Extract unique IDs for batch fetching
      const uniqueStudentIds = Array.from(new Set(docs.map((item) => item.studentId).filter(Boolean)));
      const uniqueCourseIds = Array.from(new Set(docs.map((item) => item.courseId).filter(Boolean)));

      if (uniqueStudentIds.length > 0 || uniqueCourseIds.length > 0) {
        fetchMetaData(uniqueStudentIds, uniqueCourseIds);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Batch fetch student names and course codes simultaneously
  const fetchMetaData = async (studentIds: string[], courseIds: string[]) => {
    try {
      setLoadingMetaData(true);

      // 1. Fetch Students
      if (studentIds.length > 0) {
        const userResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', studentIds)]
        );
        const nameMapping: Record<string, string> = {};
        userResponse.documents.forEach((userDoc: any) => {
          nameMapping[userDoc.userId] = userDoc.name || 'Unknown Student';
        });
        setStudentNames(nameMapping);
      }

      // 2. Fetch Courses
      if (courseIds.length > 0) {
        const courseResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId, // Make sure appwriteConfig.coursesId is defined in your config
          [Query.equal('$id', courseIds)]
        );
        const codeMapping: Record<string, string> = {};
        courseResponse.documents.forEach((courseDoc: any) => {
          // Adjust 'courseCode' to match the column attribute name in your courses collection (e.g. courseCode, code, title)
          codeMapping[courseDoc.$id] = courseDoc.courseCode || courseDoc.title || 'Unknown Course';
        });
        setCourseCodes(codeMapping);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setLoadingMetaData(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  // Filter enrollments based on search input (checks course code, course ID, student ID, or resolved student name)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEnrollments(enrollments);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredEnrollments(
        enrollments.filter((item) => {
          const studentName = (studentNames[item.studentId] || '').toLowerCase();
          const courseCode = (courseCodes[item.courseId] || item.courseId || '').toLowerCase();
          return (
            courseCode.includes(q) ||
            item.courseId.toLowerCase().includes(q) ||
            item.studentId.toLowerCase().includes(q) ||
            studentName.includes(q)
          );
        })
      );
    }
  }, [searchQuery, enrollments, studentNames, courseCodes]);

  // Handle enrollment record deletion
  const handleDelete = async (enrollment: Enrollment) => {
    if (!window.confirm(`Are you sure you want to remove this student enrollment?`)) {
      return;
    }

    try {
      setDeletingId(enrollment.$id);

      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        enrollment.$id
      );

      setEnrollments((prev) => prev.filter((item) => item.$id !== enrollment.$id));
    } catch (error) {
      console.error('Error deleting enrollment record:', error);
      alert('Failed to delete enrollment. Please check console.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pb-20 pt-2">
      {/* Back & Forward Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/85 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
        </button>

        <Link
          to="/admin/courses" 
          className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer w-full sm:w-auto"
        >
          <span>View Courses</span> <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <AdminHeader 
        title="Student Enrollments"
        description="Monitor course registrations, active student participation, and enrollment dates."
        icon={<Users className="w-6 h-6" />}
        badgeText="Registrations"
      />

      {/* Control Bar (Search & Counter) */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            placeholder="Search by course code, student name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium text-right sm:text-left px-1">
          Showing <span className="font-bold text-slate-800">{filteredEnrollments.length}</span> of {enrollments.length} enrollments
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-slate-200/60">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading enrollments...</p>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/95 border border-slate-200/80 rounded-3xl text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No enrollments found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery ? 'No records matched your search query.' : 'No students have enrolled in any courses yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredEnrollments.map((item) => {
            const isDeleting = deletingId === item.$id;
            const formattedDate = new Date(item.enrolledAt || item.$createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            const studentDisplayName = studentNames[item.studentId] || (loadingMetaData ? 'Loading...' : 'Unknown Student');
            const courseCodeDisplay = courseCodes[item.courseId] || (loadingMetaData ? 'Loading...' : item.courseId);

            return (
              <div 
                key={item.$id}
                className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold tracking-wide uppercase flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      {courseCodeDisplay}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{studentDisplayName}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Enrolled on {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-400 text-[10px] font-mono truncate" title={item.studentId}>
                    ID: {item.studentId}
                  </span>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    title="Remove Enrollment"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
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

ViewEnrollments.displayName = 'ViewEnrollments';

export default ViewEnrollments;