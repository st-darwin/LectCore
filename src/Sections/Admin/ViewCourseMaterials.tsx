import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  Search, 
  ExternalLink, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Layers, 
  HardDrive
} from 'lucide-react';
import { Query } from 'appwrite';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface CourseMaterial {
  $id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: string;
  courseId: string;
  $createdAt: string;
}

interface CourseDetails {
  courseTitle: string;
  courseCode: string;
  department: string;
  level: string;
  university: string;
  lecturerId: string;
}

const ViewCourseMaterials: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseAndMaterials();
    }
  }, [courseId]);

  const fetchCourseAndMaterials = async () => {
    try {
      setLoading(true);

      // Fetch course details and associated materials concurrently
      const [courseRes, materialsRes] = await Promise.all([
        databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          courseId as string
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseMaterialsId,
          [Query.equal('courseId', courseId as string), Query.orderDesc('$createdAt')]
        )
      ]);

      setCourse({
        courseTitle: courseRes.courseTitle || 'Untitled Course',
        courseCode: courseRes.courseCode || 'N/A',
        department: courseRes.department || 'General',
        level: courseRes.level || '100L',
        university: courseRes.university || '',
        lecturerId: courseRes.lecturerId || '',
      });

      const mappedMaterials: CourseMaterial[] = materialsRes.documents.map((doc: any) => ({
        $id: doc.$id,
        title: doc.title || doc.name || 'Untitled Material',
        fileUrl: doc.fileUrl || doc.fileId || '#',
        fileType: doc.fileType || 'PDF',
        fileSize: doc.fileSize || 'Unknown size',
        courseId: doc.courseId,
        $createdAt: doc.$createdAt,
      }));

      setMaterials(mappedMaterials);
    } catch (error) {
      console.error('Error fetching course materials data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(materialId);
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        materialId
      );
      setMaterials(prev => prev.filter(m => m.$id !== materialId));
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete course material. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMaterials = materials.filter(mat =>
    mat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/courses')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Courses
        </button>
      </div>

      <AdminHeader 
        title={course ? `${course.courseCode}: ${course.courseTitle}` : 'Course Materials'}
        description={course ? `Manage and review files uploaded for ${course.department} (${course.level}).` : 'Loading course details...'}
        ctaText="Upload New Material"
        ctaUrl={`/admin/courses/${courseId}/materials/new`}
        icon={<FileText className="w-6 h-6" />}
        badgeText="Material Repository"
      />

      {/* Quick Summary Info Cards */}
      {course && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-4 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{course.department}</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-4 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Level</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{course.level}</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-4 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Uploads</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{materials.length} Files Available</p>
            </div>
          </div>
        </div>
      )}

      {/* Materials List Section */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search uploaded materials..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>
          <div className="text-xs font-medium text-slate-500 w-full sm:w-auto text-right">
            Showing <strong>{filteredMaterials.length}</strong> of <strong>{materials.length}</strong> files
          </div>
        </div>

        <div className="min-h-[250px] p-4 sm:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading course files from Appwrite...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No files found matching your search query.</p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Card Stack (< md) */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredMaterials.map((material) => (
                  <div 
                    key={material.$id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 relative hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                            {material.title}
                          </h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Uploaded: {new Date(material.$createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                        {material.fileType || 'Document'}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <a
                          href={material.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </a>
                        <button
                          onClick={() => handleDeleteMaterial(material.$id)}
                          disabled={deletingId === material.$id}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {deletingId === material.$id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table Layout (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-4 px-6">Material Title</th>
                      <th className="py-4 px-6">Format</th>
                      <th className="py-4 px-6">Date Uploaded</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredMaterials.map((material) => (
                      <tr key={material.$id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0 shadow-xs">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block leading-tight">{material.title}</span>
                              <span className="text-xs text-slate-400 block mt-0.5">ID: {material.$id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                            {material.fileType || 'Document'}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                          {new Date(material.$createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={material.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View File
                            </a>
                            <button
                              onClick={() => handleDeleteMaterial(material.$id)}
                              disabled={deletingId === material.$id}
                              className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              {deletingId === material.$id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ViewCourseMaterials.displayName = 'ViewCourseMaterials';

export default ViewCourseMaterials;