import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Upload, 
  Search, 
  FileText, 
  X, 
  BookOpen,
  Eye
} from 'lucide-react';
import AdminHeader from '../../Components/AdminHeader';
import { generateAndSaveQuiz, type Question } from '../../services/geminiQuiz';
import { account, databases, storage, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
}

interface CourseMaterial {
  $id: string;
  courseId: string;
  title: string;
  fileId: string;
  fileUrl: string;
  bucketId?: string;
}

const QuizGenerator: React.FC = () => {
  // Course State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  // Material Source Mode: 'drag' | 'search'
  const [sourceMode, setSourceMode] = useState<'drag' | 'search'>('drag');

  // Existing Materials Search State
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState<boolean>(false);
  const [loadingFileContent, setLoadingFileContent] = useState<boolean>(false);

  // Drag and Drop & Content State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [notesContent, setNotesContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Form & Quiz Creation State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[] | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // 1. Fetch Lecturer's Courses on Mount
  useEffect(() => {
    fetchLecturerCourses();
  }, []);

  // 2. Fetch Course Materials when a Course is Selected
  useEffect(() => {
    if (selectedCourseId) {
      const matchedCourse = courses.find(
        (c) => c.$id === selectedCourseId || c.courseCode === selectedCourseId
      );
      if (matchedCourse) {
        fetchCourseMaterials(matchedCourse.$id, matchedCourse.courseCode);
      } else {
        fetchCourseMaterials(selectedCourseId, selectedCourseId);
      }
    } else {
      setMaterials([]);
      setSelectedMaterial(null);
    }
  }, [selectedCourseId, courses]);

  const fetchLecturerCourses = async () => {
    try {
      setLoadingCourses(true);
      const user = await account.get();
      if (!user) return;

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('lecturerId', user.$id)]
      );

      setCourses(response.documents as unknown as Course[]);
    } catch (err) {
      console.error('Failed to fetch lecturer courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchCourseMaterials = async (docId: string, code: string) => {
    try {
      setLoadingMaterials(true);
      
      const queries = [];
      if (docId && code && docId !== code) {
        queries.push(Query.or([
          Query.equal('courseId', docId),
          Query.equal('courseId', code)
        ]));
      } else {
        queries.push(Query.equal('courseId', docId));
      }

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        queries
      );

      setMaterials(response.documents as unknown as CourseMaterial[]);
    } catch (err) {
      console.error('Failed to fetch course materials:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Safe selection of material preventing binary/PDF garbled output
  const handleSelectMaterial = async (mat: CourseMaterial) => {
    setSelectedMaterial(mat);
    try {
      setLoadingFileContent(true);
      const bucketId = mat.bucketId || appwriteConfig.storageId;
      
      const downloadUrl = storage.getFileDownload(bucketId, mat.fileId);
      const response = await fetch(downloadUrl.toString());
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const text = await response.text();
      
      // Prevent binary PDF or HTML headers from dumping unreadable bytes into the textarea
      if (text.startsWith('<!DOCTYPE') || text.includes('%PDF') || text.includes('\u0000')) {
        setNotesContent(`Course Material Title: ${mat.title}\nCourse ID: ${mat.courseId}\nReference File URL: ${mat.fileUrl}\n\nInstructions for AI: Generate an objective multiple-choice assessment based on standard academic study concepts related to "${mat.title}".`);
      } else {
        setNotesContent(text || `Course Material: ${mat.title}`);
      }
      
      setUploadedFileName(mat.title);
    } catch (err) {
      console.warn('Using structured metadata fallback for binary/PDF file:', err);
      setNotesContent(`Course Material Title: ${mat.title}\nReference File URL: ${mat.fileUrl}\n\nInstructions for AI: Generate a rigorous multiple-choice assessment covering core educational concepts for "${mat.title}".`);
      setUploadedFileName(mat.title);
    } finally {
      setLoadingFileContent(false);
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text && !text.includes('\u0000')) {
        setNotesContent(text);
      } else {
        setNotesContent(`Uploaded Document: ${file.name}\n\nInstructions for AI: Formulate a comprehensive quiz based on key testing principles covered in ${file.name}.`);
      }
    };
    reader.readAsText(file);
  };

  // Submit Handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !title.trim() || !notesContent.trim()) return;

    try {
      setGenerating(true);
      setSuccess(false);

      const user = await account.get();
      if (!user) return;

      const newQuiz = await generateAndSaveQuiz(
        selectedCourseId,
        title,
        description,
        notesContent,
        user.$id
      );

      setPreviewQuestions(JSON.parse(newQuiz.questions));
      setSuccess(true);
      setTitle('');
      setDescription('');
      setNotesContent('');
      setUploadedFileName('');
      setSelectedMaterial(null);
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please check your Gemini API key configuration in .env.local.');
    } finally {
      setGenerating(false);
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(materialSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
      {/* Header */}
      <AdminHeader
        title="AI Quiz Generator"
        description="Instantly convert course materials or uploaded files into automated multiple-choice assessments."
        badgeText="AI Assessment Lab"
        icon={<Sparkles className="w-6 h-6 text-indigo-600" />}
      />

      {/* Main Generator Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Step 1: Course & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                1. Select Course *
              </label>
              {loadingCourses ? (
                <div className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                  <span>Loading your courses...</span>
                </div>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((course) => (
                    <option key={course.$id} value={course.$id}>
                      {course.courseCode} — {course.courseTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                2. Assessment Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 4 Quiz: Data Structures"
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Short Description / Instructions (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Test your understanding of stack and queue operations."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Step 2: Content Source Switcher */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                3. Choose Source Content *
              </label>

              {/* Mode Toggle Pills */}
              <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSourceMode('drag')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sourceMode === 'drag'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload size={13} />
                  <span>File Drop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('search')}
                  disabled={!selectedCourseId}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    sourceMode === 'search'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search size={13} />
                  <span>Course Materials</span>
                </button>
              </div>
            </div>

            {/* Mode A: Drag & Drop Zone */}
            {sourceMode === 'drag' && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
                    : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/80'
                }`}
              >
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx,.pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {uploadedFileName ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                    <FileText size={16} />
                    <span>Scanned: {uploadedFileName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFileName('');
                        setNotesContent('');
                      }}
                      className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-500 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                      <Upload size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Drag & drop lecture file here, or <span className="text-indigo-600 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400">Supports text documents, scanned notes, and PDFs</p>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Search Existing Course Materials */}
            {sourceMode === 'search' && (
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-3xl border border-slate-200/80">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={materialSearchQuery}
                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                    placeholder="Search material title..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {loadingMaterials ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                    <span>Loading materials for this course...</span>
                  </div>
                ) : filteredMaterials.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredMaterials.map((mat) => {
                      const isSelected = selectedMaterial?.$id === mat.$id;
                      return (
                        <button
                          key={mat.$id}
                          type="button"
                          onClick={() => handleSelectMaterial(mat)}
                          className={`p-3 rounded-2xl text-left border text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <BookOpen size={15} className={isSelected ? 'text-indigo-200' : 'text-indigo-600'} />
                            <span className="truncate">{mat.title}</span>
                          </div>
                          {isSelected && loadingFileContent && (
                            <Loader2 size={13} className="animate-spin text-white shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No uploaded course materials found for this course.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scanned Material Preview Box */}
          {notesContent && (
            <div className="space-y-2 bg-indigo-50/40 p-4 rounded-3xl border border-indigo-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                  <FileText size={15} className="text-indigo-600" />
                  <span>Scanned Material Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[11px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>{showPreview ? 'Hide Text' : 'View Text'}</span>
                </button>
              </div>
              
              {showPreview && (
                <div className="max-h-36 overflow-y-auto p-3 rounded-2xl bg-white border border-indigo-100 text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                  {notesContent}
                </div>
              )}
            </div>
          )}

          {/* Text Area Content Context */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Prompt Context / Editable Content *
            </label>
            <textarea
              rows={6}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Scanned file content or lecture notes appear here. You can refine or paste text directly..."
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={generating || !selectedCourseId || !title.trim() || !notesContent.trim()}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating Quiz via Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate & Publish Quiz</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Notification & Preview */}
      {success && previewQuestions && (
        <div className="bg-emerald-50/90 backdrop-blur-xl p-6 rounded-3xl border border-emerald-200 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>Quiz generated and published to Appwrite!</span>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Questions Created ({previewQuestions.length})
            </h4>
            {previewQuestions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white border border-emerald-100 space-y-2 shadow-2xs">
                <p className="text-xs font-bold text-slate-900">
                  {idx + 1}. {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border ${
                        opt === q.correctAnswer
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizGenerator;