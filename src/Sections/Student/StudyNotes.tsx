import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentNotes, createStudyNote, deleteStudyNote, type StudyNote } from '../../services/studyNotesService';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Bookmark, Plus, Trash2, FileText, Stamp, ArrowLeft, Loader2 } from 'lucide-react';

export default function StudyNotes() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [courseCode, setCourseCode] = useState<string>('Course');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setUserId(user.$id);

      try {
        const courseDoc: any = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          courseId!
        );
        if (courseDoc?.courseCode) {
          setCourseCode(courseDoc.courseCode);
        }
      } catch (err) {
        console.warn("Could not load course meta info", err);
      }

      const data = await getStudentNotes(user.$id, courseId!);
      setNotes(data as unknown as StudyNote[]);
    } catch (err) {
      console.error('Failed to load user session or notes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !userId) return;

    setSubmitting(true);
    try {
      await createStudyNote({
        userId,
        courseId,
        title,
        content,
      });
      setTitle('');
      setContent('');
      const data = await getStudentNotes(userId, courseId);
      setNotes(data as unknown as StudyNote[]);
    } catch (err) {
      console.error('Failed to create note', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId?: string) => {
    if (!noteId || !userId || !courseId) return;
    try {
      await deleteStudyNote(noteId);
      const data = await getStudentNotes(userId, courseId);
      setNotes(data as unknown as StudyNote[]);
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 sm:py-36 bg-white/80 backdrop-blur-xl rounded-[1.75rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xs mx-2 sm:mx-0">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wide">Loading your study notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20 sm:pb-16 animate-in fade-in duration-300 px-3 sm:px-0">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>

        <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/80 text-[11px] sm:text-xs font-bold text-indigo-700 shadow-2xs truncate max-w-[200px]">
          {courseCode} • Study Space
        </span>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden p-4 sm:p-8 rounded-[1.75rem] sm:rounded-[2.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 border border-indigo-100/80 shadow-lg shadow-indigo-100/20 space-y-2">
        <div className="absolute -right-16 -top-16 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 sm:w-64 sm:h-64 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Bookmark size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-semibold tracking-tight text-slate-900 truncate">
              Study Notes & Bookmarks
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1 sm:line-clamp-none">
              Capture custom revision takeaways, code snippets, and highlights.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Note Card */}
      <div className="p-4 sm:p-8 rounded-[1.75rem] sm:rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Plus size={15} />
          </div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add New Revision Note</h2>
        </div>

        <form onSubmit={handleAddNote} className="space-y-3 pt-1">
          <input
            type="text"
            placeholder="Note title (e.g., Chapter 4 Summary)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 sm:px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            required
          />
          <textarea
            placeholder="Write your study insights, reminders, or notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3.5 sm:px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
          />
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>{submitting ? 'Saving Note...' : 'Save Note'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Saved Notes List Section */}
      <div className="p-4 sm:p-8 rounded-[1.75rem] sm:rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <FileText size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Saved Notes</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Private course repository</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shrink-0">
            {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2 px-4">
            <FileText size={26} className="mx-auto text-slate-400 opacity-60" />
            <p className="text-xs font-bold text-slate-700">No Study Notes Yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Use the form above to record your personal summaries or takeaways for this course.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {notes.map((note) => (
              <div 
                key={note.$id}
                className="group p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5 overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 break-words">
                      {note.title}
                    </h3>
                    <button
                      onClick={() => handleDelete(note.$id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed break-words">
                    {note.content || 'No details provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Stamp size={11} className="text-indigo-500" /> Bookmark
                  </span>
                  <span>{note.$createdAt ? new Date(note.$createdAt).toLocaleDateString() : 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}