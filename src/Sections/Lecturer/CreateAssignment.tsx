import { useState, useEffect } from 'react';
import { ClipboardList, Loader2, BookOpen, Calendar, Award, FileText, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
}

const CreateAssignment = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [courseId, setCourseId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [totalMarks, setTotalMarks] = useState<string>('');

  useEffect(() => {
    fetchLecturerCourses();
  }, []);

  const fetchLecturerCourses = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        [Query.equal('lecturerId', user.$id)]
      );

      const fetchedCourses = coursesRes.documents as unknown as Course[];
      setCourses(fetchedCourses);
      if (fetchedCourses.length > 0) {
        setCourseId(fetchedCourses[0].$id);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("Failed to load your courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !description || !dueDate || !totalMarks) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const user = await account.get();
      if (!user) return;

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.assignmentId || 'assignments',
        ID.unique(),
        {
          courseId,
          lecturerId: user.$id,
          title,
          description,
          dueDate: new Date(dueDate).toISOString(),
          totalMarks: parseInt(totalMarks, 10),
        }
      );

      // Navigate back or reset
      navigate(-1);
    } catch (err: any) {
      console.error("Failed to create assignment:", err);
      setError(err?.message || "Failed to create assignment. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-white/75 backdrop-blur-xl border border-slate-200/60 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={18} />
        </button>
        <Header
          title="Create Assignment"
          description="Publish a new assignment for your students enrolled in your courses."
          icon={<ClipboardList size={20} />}
        />
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-slate-200/70 shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <BookOpen size={28} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No Courses Available</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">You need to create at least one course before you can post an assignment.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Course Select */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <BookOpen size={13} className="text-indigo-500" />
                <span>Select Course</span>
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                required
              >
                {courses.map((course) => (
                  <option key={course.$id} value={course.$id}>
                    {course.courseCode} - {course.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <FileText size={13} className="text-indigo-500" />
                <span>Assignment Title</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Data Structures Mid-term Project"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <FileText size={13} className="text-indigo-500" />
                <span>Description & Instructions</span>
              </label>
              <textarea
                rows={4}
                placeholder="Provide detailed guidelines and requirements for the assignment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <Calendar size={13} className="text-indigo-500" />
                  <span>Due Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  required
                />
              </div>

              {/* Total Marks */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <Award size={13} className="text-indigo-500" />
                  <span>Total Marks</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Publish Assignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateAssignment;