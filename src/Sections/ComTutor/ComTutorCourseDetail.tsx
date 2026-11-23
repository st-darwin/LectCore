import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  FileSpreadsheet,
  FileCode,
  File,
  X,
  Ghost,
  MessageSquare,
} from 'lucide-react';
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

const ComTutorCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Fetch course details
  const fetchCourseDetails = useCallback(async () => {
    if (!id) return;

    try {
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        id
      );

      setCourse(response as unknown as Course);
    } catch (err) {
      console.error('Failed to fetch course:', err);
      setCourse(null);
    }
  }, [id]);

  // Fetch materials belonging to this course
  const fetchMaterials = useCallback(async () => {
    if (!id) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        [Query.equal('courseId', id)]
      );

      setMaterials(response.documents as unknown as Material[]);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load course and materials
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetchCourseDetails();
    fetchMaterials();
  }, [id, fetchCourseDetails, fetchMaterials]);

  // Send notifications to learners enrolled in this exact course
  const sendCourseNotificationToLearners = async ({
    courseId,
    title,
    message,
    type = 'MATERIAL',
    relatedId,
  }: {
    courseId: string;
    title: string;
    message: string;
    type?: string;
    relatedId?: string;
  }) => {
    try {
      const enrollments = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [Query.equal('courseId', courseId)]
      );

      if (enrollments.documents.length === 0) return;

      const notificationPromises = enrollments.documents.map((enrollment) => {
        const learnerId = enrollment.studentId;

        return databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsId,
          ID.unique(),
          {
            userId: learnerId,
            title,
            message,
            type,
            relatedId,
            isRead: false,
          }
        );
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Failed to trigger learner notifications:', error);
    }
  };

  // Upload course material
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id || !title.trim() || !file) {
      alert('Please enter a material title and select a file.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size cannot exceed 50MB.');
      return;
    }

    let uploadedFileId: string | null = null;

    try {
      setUploading(true);

      const user = await account.get();

      if (!user) {
        throw new Error('Unauthorized');
      }

      // Upload file to Appwrite Storage
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        file
      );

      uploadedFileId = uploadedFile.$id;

      const fileUrl = storage
        .getFileView(appwriteConfig.storageId, uploadedFile.$id)
        .toString();

      // Create the course material document
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        ID.unique(),
        {
          courseId: id,
          title: title.trim(),
          fileId: uploadedFile.$id,
          fileUrl,
          uploadedBy: user.$id,
          bucketId: appwriteConfig.storageId,
        }
      );

      // Notify learners enrolled in this course
      await sendCourseNotificationToLearners({
        courseId: id,
        title: `New Material: ${course ? course.courseCode : 'Course'}`,
        message: `New resource uploaded: ${title.trim()}`,
        type: 'MATERIAL',
        relatedId: response.$id,
      });

      setTitle('');
      setFile(null);
      setIsModalOpen(false);
      setDragActive(false);

      await fetchMaterials();
    } catch (err: unknown) {
      console.error('Upload failed:', err);

      // Remove the uploaded file if saving its document failed
      if (uploadedFileId) {
        try {
          await storage.deleteFile(
            appwriteConfig.storageId,
            uploadedFileId
          );
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }
      }

      const message =
        err instanceof Error ? err.message : 'Failed to upload file.';

      alert(message);
    } finally {
      setUploading(false);
    }
  };

  // Delete course material
  const handleDelete = async (materialId: string, fileId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      await storage.deleteFile(
        appwriteConfig.storageId,
        fileId
      );

      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        materialId
      );

      setMaterials((prev) =>
        prev.filter((material) => material.$id !== materialId)
      );
    } catch (err) {
      console.error('Failed to delete material:', err);
      alert('Failed to delete material.');
    }
  };

  // File icon based on file extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return <FileText className="text-rose-500" size={18} />;
    }

    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="text-emerald-500" size={18} />;
    }

    if (['zip', 'rar', 'code', 'js', 'ts'].includes(ext || '')) {
      return <FileCode className="text-amber-500" size={18} />;
    }

    return <File className="text-indigo-500" size={18} />;
  };

  // Search materials
  const filteredMaterials = materials.filter((mat) =>
    mat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close modal and reset form
  const closeModal = () => {
    if (uploading) return;

    setIsModalOpen(false);
    setTitle('');
    setFile(null);
    setDragActive(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#fbfbfc] px-3 pb-16 pt-6 text-slate-800 antialiased selection:bg-indigo-50 selection:text-indigo-900 sm:px-6 lg:px-8">
      {/* Background ambient light */}
      <div className="pointer-events-none absolute -top-10 left-1/3 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
        {/* Back Navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/community_tutor/courses')}
            className="group inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            <span>Back to Community Courses</span>
          </button>
        </div>

        {/* Course Header */}
        <Header
          title={
            course
              ? `${course.courseCode}: ${course.courseTitle}`
              : 'Course Materials'
          }
          description={
            course
              ? `${course.department} • ${course.level} Level Community Track`
              : 'Manage syllabus, notes, and study files for community learners.'
          }
          icon={<FileText size={20} />}
        />

        {/* Action Bar */}
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Uploaded Resources
            </h3>

            <span className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
              {materials.length} {materials.length === 1 ? 'File' : 'Files'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/community_tutor/courses/${id}/discussions`)
              }
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200/80 bg-white px-4 py-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-50/50 active:scale-95 sm:flex-none sm:rounded-2xl sm:py-2.5"
            >
              <MessageSquare size={15} className="text-indigo-600" />
              <span>Q&A Board</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-95 sm:flex-none sm:rounded-2xl sm:py-2.5"
            >
              <Plus size={15} />
              <span>Add Material</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600"
            size={16}
          />

          <input
            type="text"
            placeholder="Search materials by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white/90 py-3.5 pl-11 pr-10 text-xs text-slate-900 shadow-[0_4px_20px_rgb(0,0,0,0.02)] backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:rounded-2xl"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Materials Content */}
        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-slate-200/70 bg-white/90 py-28 shadow-xs backdrop-blur-xl sm:rounded-[2.5rem] sm:py-36">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 sm:h-8 sm:w-8" />

              <p className="text-xs font-semibold tracking-wide text-slate-400">
                Loading course materials...
              </p>
            </div>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.$id}
                className="group flex items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200/70 bg-gradient-to-b from-white/95 to-white/70 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.02)] backdrop-blur-xl transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 sm:rounded-[2rem] sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100/70 bg-indigo-50/80 shadow-2xs sm:h-12 sm:w-12 sm:rounded-2xl">
                    {getFileIcon(mat.title)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h4
                      className="truncate text-xs font-semibold text-slate-900 transition-colors group-hover:text-indigo-600"
                      title={mat.title}
                    >
                      {mat.title}
                    </h4>

                    <span className="block text-[10px] font-medium text-slate-400 sm:text-[11px]">
                      Added{' '}
                      {new Date(mat.$createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-slate-100/80 p-2.5 text-slate-600 shadow-2xs transition-all hover:bg-indigo-600 hover:text-white"
                    title="Download File"
                    aria-label={`Download ${mat.title}`}
                  >
                    <Download size={15} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(mat.$id, mat.fileId)}
                    className="cursor-pointer rounded-xl bg-slate-100/80 p-2.5 text-slate-600 shadow-2xs transition-all hover:bg-rose-600 hover:text-white"
                    title="Delete Material"
                    aria-label={`Delete ${mat.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-indigo-200/80 bg-white/50 px-4 py-16 text-center backdrop-blur-xs sm:rounded-[2.5rem] sm:py-20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm sm:mb-4 sm:h-14 sm:w-14">
              <Ghost size={24} />
            </div>

            <h3 className="mb-1 text-xs font-semibold text-slate-900 sm:text-sm">
              {searchTerm
                ? `No materials found matching "${searchTerm}"`
                : 'No course materials uploaded yet'}
            </h3>

            <p className="mx-auto mb-5 max-w-sm text-[11px] text-slate-400 sm:mb-6 sm:text-xs">
              {searchTerm
                ? 'Try adjusting your keyword query to locate your files.'
                : 'Get started by sharing your lecture notes, assignments, or syllabus slides with community learners.'}
            </p>

            {!searchTerm && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700"
              >
                <Plus size={14} />
                <span>Upload First File</span>
              </button>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {isModalOpen && (
          <div
            className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="animate-in zoom-in-95 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl duration-200 sm:rounded-[2.5rem] sm:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                    Upload Course Material
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
                    Share lecture slides, notes, or assignments.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="cursor-pointer rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Material Title */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="material-title"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Material Title
                  </label>

                  <input
                    id="material-title"
                    type="text"
                    required
                    placeholder="e.g. Week 1: Introduction Slides"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-3 text-xs text-slate-900 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:rounded-2xl sm:px-4 sm:text-sm"
                  />
                </div>

                {/* File Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Select File
                  </label>

                  <div
                    className={`rounded-xl border-2 border-dashed p-5 text-center transition-all sm:rounded-2xl sm:p-6 ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);

                      const droppedFile = e.dataTransfer.files?.[0];

                      if (droppedFile) {
                        setFile(droppedFile);
                      }
                    }}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) =>
                        setFile(e.target.files?.[0] || null)
                      }
                    />

                    <label
                      htmlFor="file-upload"
                      className="flex cursor-pointer flex-col items-center gap-2"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
                        <Upload size={18} />
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-indigo-600 hover:underline">
                          Click to browse
                        </span>

                        <span className="text-xs text-slate-400">
                          {' '}or drag and drop
                        </span>
                      </div>

                      <p className="max-w-[260px] truncate text-[11px] text-slate-400">
                        {file ? (
                          <span className="font-semibold text-slate-700">
                            {file.name}
                          </span>
                        ) : (
                          'PDF, DOCX, PPTX, ZIP up to 50MB'
                        )}
                      </p>
                    </label>
                  </div>

                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-[11px] font-medium text-rose-500 transition-colors hover:text-rose-600"
                    >
                      Remove selected file
                    </button>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={uploading}
                    className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-3"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={uploading || !file || !title.trim()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}

                    <span>
                      {uploading ? 'Uploading File...' : 'Upload File'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComTutorCourseDetail;