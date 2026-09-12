import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { ID } from 'appwrite';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    university: '',
    department: '',
    level: '100',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const user = await account.get();
      if (!user) throw new Error("Unauthorized");

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        ID.unique(),
        {
          courseCode: formData.courseCode,
          courseTitle: formData.courseTitle,
          university: formData.university,
          department: formData.department,
          level: formData.level,
          lecturerId: user.$id,
        }
      );

      navigate('/lecturer/courses');
    } catch (err: any) {
      console.error("Failed to create course:", err);
      setError(err?.message || "Failed to create course. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Courses</span>
        </button>
      </div>

      <Header
        title="Create New Course"
        description="Set up a new course unit, assign its academic tier, and configure departmental parameters."
        icon={<BookOpen size={20} />}
      />

      <div className="max-w-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">Course Code</label>
              <input
                type="text"
                name="courseCode"
                required
                placeholder="e.g. COS 202"
                value={formData.courseCode}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">Academic Level</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-wide">Course Title</label>
            <input
              type="text"
              name="courseTitle"
              required
              placeholder="e.g. Object-Oriented Programming"
              value={formData.courseTitle}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">University Name</label>
              <input
                type="text"
                name="university"
                required
                placeholder="e.g. Mountain Top University"
                value={formData.university}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">Department</label>
              <input
                type="text"
                name="department"
                required
                placeholder="e.g. Computer Science"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Publish Course</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;