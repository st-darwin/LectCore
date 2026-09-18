import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Files, 
  Search, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  FolderOpen,
  ArrowRight,
  User
} from 'lucide-react';
import { Query } from 'appwrite';
import { databases, storage, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface CourseMaterial {
  $id: string;
  courseId: string;
  title: string;
  fileId: string;
  fileUrl: string;
  uploadedBy: string; // This holds the userId value
  bucketId: string;
  $createdAt: string;
}

const ViewAllMaterials: React.FC = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cache for resolved uploader names: { [userId]: name }
  const [uploaderNames, setUploaderNames] = useState<Record<string, string>>({});
  const [loadingUploaders, setLoadingUploaders] = useState<boolean>(false);

  // Fetch all course materials on load
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId
      );
      const docs = response.documents as unknown as CourseMaterial[];
      setMaterials(docs);
      setFilteredMaterials(docs);

      // Extract unique user IDs from uploadedBy fields
      const uniqueUserIds = Array.from(new Set(docs.map((item) => item.uploadedBy).filter(Boolean)));
      if (uniqueUserIds.length > 0) {
        fetchUserNames(uniqueUserIds);
      }
    } catch (error) {
      console.error('Error fetching course materials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch names from user collection where the 'userId' column matches uploadedBy
  const fetchUserNames = async (userIds: string[]) => {
    try {
      setLoadingUploaders(true);

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal('userId', userIds)]
      );

      const nameMapping: Record<string, string> = {};
      response.documents.forEach((userDoc: any) => {
        const userName = userDoc.name || 'Unknown User';
        // Map using the custom userId column value
        nameMapping[userDoc.userId] = userName;
      });

      setUploaderNames(nameMapping);
    } catch (error) {
      console.error('Error fetching user collection names:', error);
    } finally {
      setLoadingUploaders(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Filter materials based on search input (checks title, course ID, or resolved uploader name)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMaterials(materials);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredMaterials(
        materials.filter((item) => {
          const uploaderName = (uploaderNames[item.uploadedBy] || item.uploadedBy || '').toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            item.courseId.toLowerCase().includes(q) ||
            uploaderName.includes(q)
          );
        })
      );
    }
  }, [searchQuery, materials, uploaderNames]);

  // Handle document and storage bucket file deletion
  const handleDelete = async (material: CourseMaterial) => {
    if (!window.confirm(`Are you sure you want to delete "${material.title}"?`)) {
      return;
    }

    try {
      setDeletingId(material.$id);

      // 1. Delete file from Appwrite Storage Bucket if fileId and bucketId exist
      if (material.fileId && material.bucketId) {
        try {
          await storage.deleteFile(material.bucketId, material.fileId);
        } catch (storageErr) {
          console.warn('Could not delete file from storage bucket (it might already be removed):', storageErr);
        }
      }

      // 2. Delete document record from Appwrite Database
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseMaterialsId,
        material.$id
      );

      // Update local state
      setMaterials((prev) => prev.filter((item) => item.$id !== material.$id));
    } catch (error) {
      console.error('Error deleting material record:', error);
      alert('Failed to delete course material. Please check console.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pb-20 pt-2">
      {/* Back & Forward Navigation Bar - Fully Responsive Stack on Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/85 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
        </button>

        <Link
          to="/admin/courses" 
          className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer w-full sm:w-auto"
        >
          <span>View Courses</span> <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <AdminHeader 
        title="Course Materials Library"
        description="Manage uploaded lecture notes, study documents, and reference PDFs."
        icon={<Files className="w-6 h-6" />}
        badgeText="Resources"
      />

      {/* Control Bar (Search & Counter) */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            placeholder="Search by title, course ID, or uploader name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium text-right sm:text-left px-1">
          Showing <span className="font-bold text-slate-800">{filteredMaterials.length}</span> of {materials.length} files
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-slate-200/60">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading course materials...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/95 border border-slate-200/80 rounded-3xl text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No materials found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery ? 'No documents matched your search query.' : 'No course materials have been uploaded to the database yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredMaterials.map((item) => {
            const isDeleting = deletingId === item.$id;
            const formattedDate = new Date(item.$createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            // Get resolved name from batch query map
            const uploaderDisplayName = uploaderNames[item.uploadedBy] || (loadingUploaders ? 'Loading...' : 'Unknown User');

            return (
              <div 
                key={item.$id}
                className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold tracking-wide uppercase">
                      {item.courseId}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Uploaded on {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500 text-[11px] truncate flex items-center gap-1" title={uploaderDisplayName}>
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    By: <span className="font-medium text-slate-700 truncate">{uploaderDisplayName}</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Open File"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete Material"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

ViewAllMaterials.displayName = 'ViewAllMaterials';

export default ViewAllMaterials;