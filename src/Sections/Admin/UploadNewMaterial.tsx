import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLoaderData } from 'react-router-dom';
import { account } from '../../appwrite/Client';
import { 
  ArrowLeft, 
  UploadCloud, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  BookOpen, 
  Layers, 
  Building2,
  Upload,
  X,
  FileCheck
} from 'lucide-react';
import { databases, storage, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface CourseDetails {
  courseTitle: string;
  courseCode: string;
  department: string;
  level: string;
}

export const Loader = async() =>{
    const user = await account.get()
    if(!user) return null
    
    const userId = user.$id
return userId
}

const UploadNewMaterial: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const  currentUser = useLoaderData() as string
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loadingCourse, setLoadingCourse] = useState<boolean>(true);
  
  // Form states
  const [title, setTitle] = useState<string>('');
  const [fileType, setFileType] = useState<string>('PDF');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoadingCourse(true);
      const res = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        courseId as string 
      );
      setCourse({
        courseTitle: res.courseTitle || 'Untitled Course',
        courseCode: res.courseCode || 'N/A',
        department: res.department || 'General',
        level: res.level || '100L',
      });
    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoadingCourse(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) {
      alert('Please provide a material title and select a file to upload.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload file to Appwrite Storage Bucket
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        'unique()',
        selectedFile
      );

      // 2. Get the public view file URL string from Appwrite Storage
      const fileUrl = storage.getFileView(
        appwriteConfig.storageId,
        uploadedFile.$id
      ).toString();

      // 3. Create the database document entry fulfilling all required schema attributes
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        'unique()',
        {
          title: title.trim(),
          fileUrl: fileUrl,
          fileId: uploadedFile.$id,
        
          courseId: courseId as string,
          uploadedBy: currentUser as string, // Replace with dynamic user account name/ID if available
          bucketId: appwriteConfig.storageId,
        }
      );

      // Redirect back to the course materials view upon success
      navigate(`/admin/courses/${courseId}/materials`);
    } catch (error) {
      console.error('Error uploading course material:', error);
      alert('Failed to upload file or save material record. Please check your console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/admin/courses/${courseId}/materials`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Materials
        </button>
      </div>

      <AdminHeader 
        title="Upload Course Material"
        description={course ? `Adding new resources for ${course.courseCode}: ${course.courseTitle}` : 'Upload documents, notes, and resources for this course.'}
        icon={<UploadCloud className="w-6 h-6" />}
        badgeText="Material Uploader"
      />

      {/* Target Course Quick Banner */}
      {course && (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Course Code</p>
              <p className="text-xs font-bold text-indigo-600 mt-0.5">{course.courseCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">{course.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Level</p>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">{course.level}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form Card */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Resource Information</h3>
            <p className="text-xs text-slate-400">Provide the title, file format, and upload your document</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Material Title <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g., Week 1 Lecture Notes - Data Structures & Algorithms"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              File Format Type
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs cursor-pointer font-medium"
            >
              <option value="PDF">PDF Document (.pdf)</option>
              <option value="DOCX">Word Document (.docx)</option>
              <option value="PPTX">PowerPoint Presentation (.pptx)</option>
              <option value="Video">Video Recording (.mp4)</option>
              <option value="Archive">Archive Package (.zip / .rar)</option>
            </select>
          </div>

          {/* Drag and Drop File Upload Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Course File <span className="text-rose-500">*</span>
            </label>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                  : selectedFile 
                  ? 'border-emerald-300 bg-emerald-50/30' 
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              {selectedFile ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="mt-1 px-3 py-1 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Remove file
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag and drop your file here, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, PPTX, MP4, ZIP (Max 50MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/courses/${courseId}/materials`)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="px-7 py-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

UploadNewMaterial.displayName = 'UploadNewMaterial';

export default UploadNewMaterial;