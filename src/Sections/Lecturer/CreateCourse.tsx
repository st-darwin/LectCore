import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, ArrowLeft, Globe, Building } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { ID, Query } from 'appwrite';

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
    accessScope: 'institutional' as 'institutional' | 'community',
  });

  // Automatically fetch user profile to pre-fill university if institutional
  useEffect(() => {
    const fetchUserInstitution = async () => {
      try {
        const sessionUser = await account.get();
        if (!sessionUser) return;

        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', sessionUser.$id)]
        );

        if (response.documents.length > 0) {
          const userDoc = response.documents[0];
          if (userDoc.university && formData.accessScope === 'institutional') {
            setFormData((prev) => ({ ...prev, university: userDoc.university }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile institution:", err);
      }
    };

    fetchUserInstitution();
  }, [formData.accessScope]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleScopeChange = async (scope: 'institutional' | 'community') => {
    if (scope === 'institutional') {
      try {
        const sessionUser = await account.get();
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', sessionUser.$id)]
        );
        const userUniversity = response.documents.length > 0 ? response.documents[0].university : '';
        setFormData((prev) => ({ ...prev, accessScope: scope, university: userUniversity }));
      } catch {
        setFormData((prev) => ({ ...prev, accessScope: scope }));
      }
    } else {
      setFormData((prev) => ({ ...prev, accessScope: scope, university: 'Global Community' }));
    }
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
          university: formData.accessScope === 'community' ? 'Global Community' : formData.university,
          department: formData.department,
          level: formData.level,
          lecturerId: user.$id,
          accessScope: formData.accessScope,
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Navigation */}
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
        description="Set up a new course unit, assign its visibility scope, and configure departmental parameters."
        icon={<BookOpen size={20} />}
      />

      <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 p-5 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] mt-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Access Scope Toggle Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-wide">Course Visibility & Access Scope</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleScopeChange('institutional')}
                className={`flex items-start sm:items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.accessScope === 'institutional'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${formData.accessScope === 'institutional' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <Building size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Institutional Only</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Strictly for students in your university</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleScopeChange('community')}
                className={`flex items-start sm:items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  formData.accessScope === 'community'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${formData.accessScope === 'community' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <Globe size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Global Community</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Open to all independent learners worldwide</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                <option value="General">General / Open</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">University Name</label>
              <input
                type="text"
                name="university"
                required
                disabled
                value={formData.university}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-semibold cursor-not-allowed transition-all"
              />
              <p className="text-[10px] text-slate-400">Auto-filled based on your active profile or scope setting.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">Department / Field</label>
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

          <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
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