import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, BookOpen, Save } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, appwriteConfig } from '../../appwrite/Client';

const LEVELS = ['100', '200', '300', '400', '500'];

const CourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [courseCode, setCourseCode] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [level, setLevel] = useState<string>('100');

  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        id!
      );
      setCourseCode(response.courseCode || '');
      setCourseTitle(response.courseTitle || '');
      setUniversity(response.university || '');
      setDepartment(response.department || '');
      setLevel(response.level || '100');
    } catch (err) {
      console.error("Failed to fetch course:", err);
      setError("Could not load course details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim()) return;

    try {
      setUpdating(true);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        id!,
        {
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          university: university.trim(),
          department: department.trim(),
          level,
        }
      );
      navigate('/lecturer/courses');
    } catch (err: any) {
      console.error("Failed to update course:", err);
      alert(err?.message || "Failed to update course.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

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
        title="Edit Course"
        description="Update the details, curriculum code, and academic level for this course unit."
        ctaText=""
        ctaUrl=""
        icon={<BookOpen size={20} />}
      />

      {error ? (
        <div className="text-center py-16 rounded-[2rem] bg-rose-50/50 border border-rose-100 text-rose-600 text-xs font-medium">
          {error}
        </div>
      ) : (
        <div className="max-w-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-8 shadow-[0_10px_30px_rgb(0,0,0,0.02)]">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl} Level
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Course Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Data Structures and Algorithms"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">University / Institution</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mountain Top University"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/lecturer/courses')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                <span>{updating ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseEdit;