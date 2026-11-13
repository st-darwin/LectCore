import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, BookOpen, Save, Building, Globe } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { Query } from 'appwrite';

const LEVELS = ['100', '200', '300', '400', '500', 'General'];

const CourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [courseCode, setCourseCode] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [level, setLevel] = useState<string>('100');
  const [accessScope, setAccessScope] = useState<'institutional' | 'community'>('institutional');

  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        id!
      );
      setCourseCode(response.courseCode || '');
      setCourseTitle(response.courseTitle || '');
      setDepartment(response.department || '');
      setLevel(response.level || '100');
      
      const scope = response.accessScope || 'institutional';
      setAccessScope(scope);

      if (scope === 'community') {
        setUniversity('Global Community');
      } else {
        // If institutional, fallback to document or fetch user profile university
        if (response.university && response.university !== 'Global Community') {
          setUniversity(response.university);
        } else {
          const sessionUser = await account.get();
          const userRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('userId', sessionUser.$id)]
          );
          if (userRes.documents.length > 0) {
            setUniversity(userRes.documents[0].university || '');
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch course:", err);
      setError("Could not load course details.");
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = async (scope: 'institutional' | 'community') => {
    setAccessScope(scope);
    if (scope === 'community') {
      setUniversity('Global Community');
    } else {
      try {
        const sessionUser = await account.get();
        const userRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', sessionUser.$id)]
        );
        if (userRes.documents.length > 0) {
          setUniversity(userRes.documents[0].university || '');
        }
      } catch {
        // Keep existing if fetch fails
      }
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
          university: accessScope === 'community' ? 'Global Community' : university.trim(),
          department: department.trim(),
          level,
          accessScope,
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="mb-2">
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
        description="Update the details, visibility scope, and academic level for this course unit."
        ctaText=""
        ctaUrl=""
        icon={<BookOpen size={20} />}
      />

      {error ? (
        <div className="text-center py-16 rounded-2xl bg-rose-50/50 border border-rose-100 text-rose-600 text-xs font-medium">
          {error}
        </div>
      ) : (
        <div className="bg-white/75 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <form onSubmit={handleUpdate} className="space-y-5">
            {/* Access Scope Toggle Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-wide">Course Visibility & Access Scope</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleScopeChange('institutional')}
                  className={`flex items-start sm:items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    accessScope === 'institutional'
                      ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${accessScope === 'institutional' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Building size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Institutional Only</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Strictly for students in your university</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeChange('community')}
                  className={`flex items-start sm:items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    accessScope === 'community'
                      ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${accessScope === 'community' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Globe size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Global Community</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Open to all independent learners worldwide</p>
                  </div>
                </button>
              </div>
            </div>

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
                      {lvl === 'General' ? 'General / Open' : `${lvl} Level`}
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
                  disabled
                  value={university}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-semibold cursor-not-allowed transition-all"
                />
                <p className="text-[10px] text-slate-400">Auto-filled based on your active profile or scope setting.</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/lecturer/courses')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
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