import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, ArrowLeft, Globe } from 'lucide-react';
import AdminHeader from '../../Components/AdminHeader';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { ID } from 'appwrite';

const ComTutorCreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    university: 'Global Community',
    department: '',
    level: '100',
    accessScope: 'community' as const,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const user = await account.get();
      if (!user) throw new Error('Unauthorized');

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        ID.unique(),
        {
          courseCode: formData.courseCode,
          courseTitle: formData.courseTitle,
          university: 'Global Community',
          department: formData.department,
          level: formData.level,
          lecturerId: user.$id,
          accessScope: 'community',
        }
      );

      navigate('/community_tutor/courses');
    } catch (err: any) {
      console.error('Failed to create community course:', err);
      setError(
        err?.message || 'Failed to create course. Please check your inputs.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#fbfbfc] px-4 py-6 text-slate-800 antialiased selection:bg-indigo-50 selection:text-indigo-900 sm:px-6 lg:px-8">
      {/* Background ambient light glow */}
      <div className="pointer-events-none absolute -top-10 left-1/3 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>
        </div>

        <AdminHeader
          title="Create Community Course"
          description="Set up a new community course unit, organize its track, and publish learning resources for independent learners."
          icon={<BookOpen size={20} />}
        />

        <div className="mt-6 rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] backdrop-blur-xl sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200/70 bg-rose-50/80 p-4 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Community Scope Banner */}
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-4 sm:items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
                <Globe size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">
                  Global Community Scope
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  Every course created here is automatically assigned to{' '}
                  <span className="font-semibold text-indigo-600">
                    community
                  </span>{' '}
                  access for open community learners.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-slate-700">
                  Course Code
                </label>
                <input
                  type="text"
                  name="courseCode"
                  required
                  placeholder="e.g. COM 201"
                  value={formData.courseCode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-slate-700">
                  Academic / Track Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-900 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                  <option value="General">General / Open</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wide text-slate-700">
                Course Title
              </label>
              <input
                type="text"
                name="courseTitle"
                required
                placeholder="e.g. Practical Web Engineering"
                value={formData.courseTitle}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-slate-700">
                  Workspace Scope Label
                </label>
                <input
                  type="text"
                  name="university"
                  required
                  disabled
                  value={formData.university}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200/80 bg-slate-100 px-4 py-3 text-xs font-semibold text-indigo-600 transition-all"
                />
                <p className="text-[10px] text-slate-400">
                  Automatically set to Global Community for community tutors.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-slate-700">
                  Department / Track
                </label>
                <input
                  type="text"
                  name="department"
                  required
                  placeholder="e.g. Software Engineering"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse items-center justify-end gap-3 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full cursor-pointer rounded-xl bg-slate-100 px-6 py-3 text-center text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Publish Course</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ComTutorCreateCourse;