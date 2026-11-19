import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Loader2,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCheck,
  MessageSquare,
  Building,
  Globe,
  Search,
  X
} from 'lucide-react';
import AdminHeader from '../../Components/AdminHeader';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Assignment {
  $id: string;
  $createdAt: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  accessScope?: string;
}

interface Course {
  $id: string;
  courseCode?: string;
  code?: string;
  title?: string;
  accessScope?: string;
}

interface Submission {
  $id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
}

type ScopeTab = 'institutional' | 'community';

const StudentAssignmentsView = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coursesMap, setCoursesMap] = useState<
    Record<string, { code: string; accessScope: string }>
  >({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeScopeTab, setActiveScopeTab] =
    useState<ScopeTab>('institutional');
  const [filterTab, setFilterTab] =
    useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch student's course enrollments
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId || 'enrollments',
        [Query.equal('studentId', user.$id)]
      );

      const enrolledCourseIds = enrollmentsRes.documents.map(
        (doc: any) => doc.courseId
      );

      if (enrolledCourseIds.length === 0) {
        setAssignments([]);
        setCoursesMap({});
        setSubmissions([]);
        return;
      }

      // 2. Fetch enrolled courses
      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId || 'courses',
        [Query.equal('$id', enrolledCourseIds)]
      );

      const map: Record<
        string,
        { code: string; accessScope: string }
      > = {};

      coursesRes.documents.forEach((doc: any) => {
        const courseDoc = doc as unknown as Course;
        map[courseDoc.$id] = {
          code:
            courseDoc.code ||
            courseDoc.courseCode ||
            courseDoc.title ||
            'Course',
          accessScope: courseDoc.accessScope || 'institutional'
        };
      });

      setCoursesMap(map);

      // 3. Fetch assignments for enrolled courses
      const assignmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        [Query.equal('courseId', enrolledCourseIds)]
      );

      // Sort newest assignments first using Appwrite's creation date
      const sortedAssignments = (
        assignmentsRes.documents as unknown as Assignment[]
      ).sort((a, b) => {
        const dateA = new Date(a.$createdAt).getTime();
        const dateB = new Date(b.$createdAt).getTime();
        return dateB - dateA;
      });

      setAssignments(sortedAssignments);

      // 4. Fetch student's submissions
      const submissionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.submissionsId || 'submissions',
        [Query.equal('studentId', user.$id)]
      );

      setSubmissions(
        submissionsRes.documents as unknown as Submission[]
      );
    } catch (err) {
      console.error(
        'Failed to fetch student assignments data:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(
      (sub) => sub.assignmentId === assignmentId
    );
  };

  // Process assignments with course and submission information
  const processedAssignments = useMemo(() => {
    return assignments.map((assignment) => {
      const submission = getSubmissionForAssignment(assignment.$id);
      const isSubmitted = !!submission;
      const isGraded =
        submission?.grade !== undefined &&
        submission?.grade !== null;
      const isPastDue =
        new Date() > new Date(assignment.dueDate);
      const courseInfo = coursesMap[assignment.courseId];
      const courseCode =
        courseInfo?.code || assignment.courseId;
      const accessScope = (
        assignment.accessScope ||
        courseInfo?.accessScope ||
        'institutional'
      ).toLowerCase();

      let status: 'completed' | 'pending' = 'pending';
      if (isSubmitted) {
        status = 'completed';
      }

      return {
        ...assignment,
        courseCode,
        accessScope,
        submission,
        isSubmitted,
        isGraded,
        isPastDue,
        status
      };
    });
  }, [assignments, coursesMap, submissions]);

  // Apply scope, status, and search filters
  const filteredAssignments = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return processedAssignments.filter((item) => {
      // 1. Scope filter
      const isComm = item.accessScope === 'community';

      if (activeScopeTab === 'institutional' && isComm) {
        return false;
      }

      if (activeScopeTab === 'community' && !isComm) {
        return false;
      }

      // 2. Status filter
      if (filterTab === 'pending' && item.isSubmitted) {
        return false;
      }

      if (filterTab === 'completed' && !item.isSubmitted) {
        return false;
      }

      // 3. Search filter
      if (search) {
        const matchesSearch =
          item.title?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.courseCode?.toLowerCase().includes(search);

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [
    processedAssignments,
    activeScopeTab,
    filterTab,
    searchQuery
  ]);

  // Scope counts
  const institutionalCount = useMemo(() => {
    return processedAssignments.filter(
      (item) => item.accessScope !== 'community'
    ).length;
  }, [processedAssignments]);

  const communityCount = useMemo(() => {
    return processedAssignments.filter(
      (item) => item.accessScope === 'community'
    ).length;
  }, [processedAssignments]);

  // Counts for the currently selected scope and search
  const scopeAssignments = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return processedAssignments.filter((item) => {
      const matchesScope =
        activeScopeTab === 'institutional'
          ? item.accessScope !== 'community'
          : item.accessScope === 'community';

      const matchesSearch =
        !search ||
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.courseCode?.toLowerCase().includes(search);

      return matchesScope && matchesSearch;
    });
  }, [processedAssignments, activeScopeTab, searchQuery]);

  const allCount = scopeAssignments.length;
  const pendingCount = scopeAssignments.filter(
    (item) => !item.isSubmitted
  ).length;
  const completedCount = scopeAssignments.filter(
    (item) => item.isSubmitted
  ).length;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <AdminHeader
        title="My Assignments"
        description="Track your coursework, view deadlines, submit your assignments, and check feedback across your institutional and community courses."
        icon={<ClipboardList size={20} />}
      />

      {/* Institutional vs Community Tabs */}
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
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] ${
              activeScopeTab === 'institutional'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            {institutionalCount}
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
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] ${
              activeScopeTab === 'community'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            {communityCount}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:max-w-md">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assignments or courses..."
          className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white border border-indigo-100 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* All / Pending / Completed Tabs */}
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
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              filterTab === 'all'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {allCount}
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
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              filterTab === 'pending'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
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
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              filterTab === 'completed'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {completedCount}
          </span>
        </button>
      </div>

      {/* Assignments */}
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
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-indigo-600" />
                      <span>{item.courseCode}</span>
                    </span>
                  </div>

                  {item.isGraded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/60 text-[10px] font-semibold">
                      <CheckCheck size={12} className="text-violet-600" />
                      <span>
                        Marked ({item.submission?.grade}/{item.totalMarks})
                      </span>
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
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Grade and Feedback Preview */}
                {item.isGraded && (
                  <div className="p-3 rounded-2xl bg-violet-50/60 border border-violet-100/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-violet-900">
                      <span>
                        Grade: {item.submission?.grade} / {item.totalMarks}
                      </span>
                    </div>

                    {item.submission?.feedback && (
                      <p className="text-slate-600 text-[11px] leading-relaxed flex items-start gap-1.5 pt-1 border-t border-violet-100/60">
                        <MessageSquare
                          size={13}
                          className="text-violet-500 shrink-0 mt-0.5"
                        />
                        <span className="italic">
                          "{item.submission.feedback}"
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-indigo-100/60 flex items-center justify-between gap-2 text-xs">
                <div className="space-y-1 text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <Calendar size={13} className="text-indigo-600" />
                    <span>
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-[11px]">
                    <Award size={13} className="text-indigo-600" />
                    <span>{item.totalMarks} Total Marks</span>
                  </span>
                </div>

                <button
                  onClick={() =>
                    navigate(`/student/assignment/${item.$id}`)
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>
                    {item.isSubmitted ? 'View Submission' : 'Submit Work'}
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-indigo-50/30 border border-dashed border-indigo-200/80 space-y-2">
          <FileText size={24} className="mx-auto text-indigo-400 mb-1" />
          <p className="text-xs font-semibold text-slate-800">
            {searchQuery
              ? 'No Matching Assignments'
              : 'No Assignments Found'}
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? `No assignments match "${searchQuery}". Try another search term.`
              : 'No assignments match your selected scope tab or filter criteria.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors mt-2"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsView;