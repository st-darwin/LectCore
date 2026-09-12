import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Upload, Trash2, Download, ArrowLeft, Loader2, Plus, Search } from 'lucide-react';
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
      // 1. Delete file from storage
      await storage.deleteFile(appwriteConfig.storageId, fileId);

      // 2. Delete document record
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

  // Filter materials based on search input
  const filteredMaterials = materials.filter((mat) =>
    mat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate('/lecturer/courses')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Courses</span>
        </button>
      </div>

      <Header
        title={course ? `${course.courseCode}: ${course.courseTitle}` : "Course Materials"}
        description={course ? `${course.department} • ${course.level} Level` : "Manage syllabus, notes, and study files."}
        ctaText="Upload Material"
        ctaUrl="#"
        icon={<FileText size={20} />}
      />

      {/* Action Bar with Header Title & Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Uploaded Resources</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Material</span>
        </button>
      </div>

      {/* Search Bar Input */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search materials by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.$id}
              className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-xs flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{mat.title}</h4>
                  <span className="text-[11px] text-slate-400">
                    Added {new Date(mat.$createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                  title="Download File"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => handleDelete(mat.$id, mat.fileId)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors cursor-pointer"
                  title="Delete Material"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-white/40 border border-dashed border-slate-200/80">
          <FileText size={24} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-medium text-slate-500">
            {searchTerm ? "No course materials found matching your search." : "No course materials uploaded yet."}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Upload Course Material</h3>
            <p className="text-xs text-slate-400 mb-5">Share lecture slides, notes, or reading assignments.</p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 1: Introduction Slides"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select File</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={14} />}
                  <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
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