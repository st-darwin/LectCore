import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, Building2, CheckCircle2, Plus, Loader2, GraduationCap, Layers, FileText, Download, Search, FileCode, FileSpreadsheet, Archive } from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';

interface Course {
    $id: string;
    courseCode: string;
    courseTitle: string;
    department: string;
    level: string;
    description?: string;
    lecturerId?: string;
    instructorId?: string;
}

interface CourseMaterial {
    $id: string;
    courseId: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileId: string;
    bucketId: string;
    uploadedBy: string;
    $createdAt?: string;
}

const StudentCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [lecturerName, setLecturerName] = useState<string>('Instructor TBA');
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      const courseDoc = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        courseId!
      ) as unknown as Course;

      setCourse(courseDoc);

      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('studentId', user.$id), Query.equal('courseId', courseId!)]
      );

      if (enrollmentsRes.documents.length > 0) {
        setEnrollmentId(enrollmentsRes.documents[0].$id);
      } else {
        setEnrollmentId(null);
      }

      try {
        const materialsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseMaterialsId || 'course_materials',
          [Query.equal('courseId', courseId!)]
        );
        setMaterials(materialsRes.documents as unknown as CourseMaterial[]);
      } catch (err) {
        console.warn("Could not fetch course materials collection:", err);
      }

      const lId = courseDoc.lecturerId || courseDoc.instructorId;
      if (lId) {
        const usersCollectionId = (appwriteConfig as any).usersId || (appwriteConfig as any).userCollectionId || 'users';
        try {
          let uDoc: any = null;
          try {
            uDoc = await databases.getDocument(appwriteConfig.databaseId, usersCollectionId, lId);
          } catch {
            const userQueryRes = await databases.listDocuments(
              appwriteConfig.databaseId,
              usersCollectionId,
              [Query.equal('userId', lId)]
            );
            if (userQueryRes.documents.length > 0) {
              uDoc = userQueryRes.documents[0];
            }
          }

          if (uDoc) {
            const name = uDoc.name || uDoc.fullName || `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim();
            if (name) {
              setLecturerName(name);
            }
          }
        } catch (err) {
          console.error("Failed to fetch instructor from user collection:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch course details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnrollment = async () => {
    if (!courseId) return;
    try {
      setActionLoading(true);
      const user = await account.get();
      if (!user) return;

      if (enrollmentId) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.enrollmentsId,
          enrollmentId
        );
        setEnrollmentId(null);
      } else {
        const newEnrollment = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.enrollmentsId,
          ID.unique(),
          {
            studentId: user.$id,
            courseId: courseId,
            enrolledAt: new Date().toISOString(),
          }
        );
        setEnrollmentId(newEnrollment.$id);
      }
    } catch (err) {
      console.error("Failed to update enrollment:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(
      (mat) =>
        mat.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
        (mat.description && mat.description.toLowerCase().includes(materialSearch.toLowerCase()))
    );
  }, [materials, materialSearch]);

  const getFileIcon = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return <FileText size={15} className="text-rose-500" />;
    if (lower.includes('.doc') || lower.includes('.docx')) return <FileText size={15} className="text-blue-500" />;
    if (lower.includes('.xls') || lower.includes('.xlsx') || lower.includes('.csv')) return <FileSpreadsheet size={15} className="text-emerald-500" />;
    if (lower.includes('.zip') || lower.includes('.rar') || lower.includes('.tar')) return <Archive size={15} className="text-amber-500" />;
    if (lower.includes('.js') || lower.includes('.ts') || lower.includes('.html')) return <FileCode size={15} className="text-indigo-500" />;
    return <FileText size={15} className="text-indigo-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-36 bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 shadow-2xs">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wide">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-5 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 shadow-xs p-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
          <BookOpen size={20} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-800">Course Not Found</h2>
          <p className="text-xs text-slate-500">The course you are looking for might have been removed or is unavailable.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isEnrolled = !!enrollmentId;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300 px-2 sm:px-0">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Courses</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/80 text-xs font-bold text-indigo-700 shadow-2xs">
            {course.courseCode}
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs">
            {course.level} Level
          </span>
        </div>
      </div>

      {/* Hero Banner Card - Light Themed */}
      <div className="relative overflow-hidden p-6 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 border border-indigo-100/80 shadow-xl shadow-indigo-100/30 space-y-8">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 backdrop-blur-md border border-indigo-100 text-[11px] font-bold text-indigo-700 shadow-2xs">
            <GraduationCap size={13} className="text-indigo-600" />
            <span>{course.department} Department</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">
            {course.courseTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
              <User size={14} className="text-indigo-600" />
              <span>Instructor: <strong className="text-slate-900">{lecturerName}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
              <Building2 size={14} className="text-indigo-600" />
              <span>Department: <strong className="text-slate-900">{course.department}</strong></span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Layers size={15} className="text-indigo-600 shrink-0" />
            <span>{isEnrolled ? 'You are actively enrolled in this course.' : 'Enroll now to unlock course resources and materials.'}</span>
          </div>

          <button
            onClick={handleToggleEnrollment}
            disabled={actionLoading}
            className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${
              isEnrolled
                ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border border-emerald-200 hover:border-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
            }`}
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEnrolled ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Enrolled (Click to Unenroll)</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Enroll in Course</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description Section */}
      <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <GraduationCap size={16} />
          </div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Course Description & Overview</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal pl-0 sm:pl-10">
          {course.description || 'No detailed course description has been provided by the department yet.'}
        </p>
      </div>

      {/* Enhanced Course Materials Section */}
      <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Course Materials & Resources</h2>
              <p className="text-[11px] text-slate-400">Lecture notes, assignments, and reading materials</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
              {materials.length} {materials.length === 1 ? 'File' : 'Files'}
            </span>
          </div>
        </div>

        {isEnrolled && materials.length > 0 && (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search course materials by title or keyword..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        )}

        {!isEnrolled ? (
          <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2 border border-indigo-100">
              <FileText size={18} />
            </div>
            <p className="text-xs font-bold text-slate-800">Content Locked</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Enroll in this course to unlock and download lectures, notes, and study resources.</p>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMaterials.map((mat) => (
              <div 
                key={mat.$id}
                className="group p-5 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{mat.title}</h3>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                      {getFileIcon(mat.fileUrl)}
                    </div>
                  </div>
                  {mat.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{mat.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {mat.$createdAt ? new Date(mat.$createdAt).toLocaleDateString() : 'Resource file'}
                  </span>
                  {mat.fileUrl ? (
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs  transition-all shadow-2xs hover:shadow-xs active:scale-95"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No file attached</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : materials.length > 0 ? (
          <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Search size={22} className="mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-700">No Matching Materials Found</p>
            <p className="text-[11px] text-slate-400">No files matched your search keyword "{materialSearch}".</p>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileText size={24} className="mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-700">No Materials Uploaded Yet</p>
            <p className="text-[11px] text-slate-400">Your instructor has not uploaded lecture notes or resources for this course yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourseDetail;