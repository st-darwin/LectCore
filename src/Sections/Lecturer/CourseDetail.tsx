import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Upload, Trash2, Download, ArrowLeft, Loader2, Plus, Search, FileSpreadsheet, FileCode, File, X, Sparkles } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, storage, appwriteConfig, account } from '../../appwrite/Client';
import { ID, Query } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;
}

interface Material {
  $id: string;
  title: string;
  fileId: string;
  fileUrl: string;
  uploadedBy: string;
  $createdAt: string;
}

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal / Form state for uploading
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
      fetchMaterials();
    }
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        id!
      );
      setCourse(response as unknown as Course);
    } catch (err) {
      console.error("Failed to fetch course:", err);
      setError("Course not found.");
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        [Query.equal('courseId', id!)]
      );
      setMaterials(response.documents as unknown as Material[]);
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    try {
      setUploading(true);
      const user = await account.get();
      if (!user) throw new Error("Unauthorized");

      // 1. Upload file to Appwrite Storage
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        file
      );

      // 2. Get public file view/download URL
      const fileUrl = storage.getFileView(
        appwriteConfig.storageId,
        uploadedFile.$id
      ).toString();

      // 3. Save document reference in course_materials collection
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        ID.unique(),
        {
          courseId: id,
          title: title.trim(),
          fileId: uploadedFile.$id,
          fileUrl: fileUrl,
          uploadedBy: user.$id,
          bucketId: appwriteConfig.storageId,
        }
      );

      // Reset form & refresh
      setTitle('');
      setFile(null);
      setIsModalOpen(false);
      fetchMaterials();
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(err?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string, fileId: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      await storage.deleteFile(appwriteConfig.storageId, fileId);
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        materialId
      );

      setMaterials(materials.filter((m) => m.$id !== materialId));
    } catch (err) {
      console.error("Failed to delete material:", err);
      alert("Failed to delete material.");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="text-rose-500" size={18} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="text-emerald-500" size={18} />;
    if (['zip', 'rar', 'code', 'js', 'ts'].includes(ext || '')) return <FileCode className="text-amber-500" size={18} />;
    return <File className="text-indigo-500" size={18} />;
  };

  // Filter materials based on search input
  const filteredMaterials = materials.filter((mat) =>
    mat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Back Navigation */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/lecturer/courses')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Courses</span>
        </button>
      </div>

      <Header
        title={course ? `${course.courseCode}: ${course.courseTitle}` : "Course Materials"}
        description={course ? `${course.department} • ${course.level} Level Curriculum` : "Manage syllabus, notes, and study files."}
        ctaText="Upload Material"
        ctaUrl="#"
        icon={<FileText size={20} />}
      />

      {/* Action Bar / Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-extrabold text-slate-900 tracking-wider uppercase">Uploaded Resources</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold border border-indigo-100">
            {materials.length} {materials.length === 1 ? 'File' : 'Files'}
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer scale-100 hover:scale-[1.02]"
        >
          <Plus size={15} />
          <span>Add Material</span>
        </button>
      </div>

      {/* Enhanced Search Bar */}
      <div className="mb-8 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
        <input
          type="text"
          placeholder="Search materials by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Materials Grid / Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.$id}
              className="group p-5 rounded-[2rem] bg-gradient-to-b from-white/90 to-white/60 backdrop-blur-xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 border border-indigo-100/50 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {getFileIcon(mat.title)}
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors" title={mat.title}>
                    {mat.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      Added {new Date(mat.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-100/80 hover:bg-indigo-600 hover:text-white text-slate-600 transition-all shadow-xs"
                  title="Download File"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => handleDelete(mat.$id, mat.fileId)}
                  className="p-2.5 rounded-xl bg-slate-100/80 hover:bg-rose-600 hover:text-white text-slate-600 transition-all shadow-xs cursor-pointer"
                  title="Delete Material"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-[2.5rem] bg-white/40 border border-dashed border-slate-200/80 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {searchTerm ? `No materials found matching "${searchTerm}"` : "No course materials uploaded yet"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchTerm ? "Try adjusting your keyword query to locate your files." : "Get started by sharing your lecture notes, assignments, or syllabus slides with students."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Upload First File</span>
            </button>
          )}
        </div>
      )}

      {/* Enhanced Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Course Material</h3>
                <p className="text-xs text-slate-400 mt-0.5">Share lecture slides, notes, or assignments.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 1: Introduction Slides"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select File</label>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    required
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                      <Upload size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600 hover:underline">Click to browse</span>
                      <span className="text-xs text-slate-400"> or drag and drop</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                      {file ? <span className="font-semibold text-slate-700">{file.name}</span> : "PDF, DOCX, PPTX, ZIP up to 50MB"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={14} />}
                  <span>{uploading ? 'Uploading File...' : 'Upload File'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;