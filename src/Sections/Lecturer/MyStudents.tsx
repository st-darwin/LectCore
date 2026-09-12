import { useState, useEffect } from 'react';
import { Users, Search, Mail, Loader2 } from 'lucide-react';
import Header from '../../Components/Header';
import { databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

interface Student {
  $id: string;
  name: string;
  email: string;
  department?: string;
  level?: string;
}

const MyStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('role', 'student')]
      );
      setStudents(response.documents as unknown as Student[]);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header
        title="My Students"
        description="View and manage students enrolled in your department and courses."
        ctaText="Export List"
        ctaUrl="#"
        icon={<Users size={20} />}
      />

      {/* Search Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-1">
          Total: {filteredStudents.length} Students
        </span>
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.$id}
              className="p-5 rounded-2xl bg-white/75 backdrop-blur-xl border border-slate-200/60 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{student.name}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                  {student.level ? `${student.level} Level` : 'Student'}
                </span>
                <span className="text-slate-400">{student.department || 'Computer Science'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[2rem] bg-white/40 border border-dashed border-slate-200/80">
          <Users size={24} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-medium text-slate-500">No students found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default MyStudents;