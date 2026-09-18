import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  TrendingUp, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  Loader2,
  AlertCircle,
  Edit3,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Query } from 'appwrite';
import { databases, appwriteConfig } from '../../appwrite/Client';

import AdminHeader from '../../Components/AdminHeader';

interface UserDocument {
  $id: string;
  name: string;
  email: string;
  role: 'admin' | 'lecturer' | 'student' | string;
  campusId: string;
  phone: string;
  userId: string;
  university: string;
  $createdAt: string;
  $updatedAt: string;
}

const UsersView: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // State to handle which row's action dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown when clicking outside using a class check
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchUsersFromAppwrite();
  }, []);

  const fetchUsersFromAppwrite = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.orderDesc('$createdAt')]
      );

      const mappedUsers: UserDocument[] = response.documents.map((doc: any) => ({
        $id: doc.$id,
        name: doc.name || '',
        email: doc.email || '',
        role: doc.role || 'student',
        campusId: doc.campusId || '',
        phone: doc.phone || '',
        userId: doc.userId || '',
        university: doc.university || '',
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users from Appwrite:', error);
    } finally {
      setLoading(false);
    }
  };

  // Functional Delete Handler
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userId
      );
      // Update local state instantly
      setUsers(prev => prev.filter(user => user.$id !== userId));
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  // Functional Edit Handler
  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/edit/${userId}`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.campusId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const currentMonthCount = users.filter(u => new Date(u.$createdAt).getMonth() === new Date().getMonth()).length;
  const lastMonthCount = users.filter(u => new Date(u.$createdAt).getMonth() === new Date().getMonth() - 1).length;
  const growthRate = lastMonthCount > 0 ? (((currentMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1) : '+100';

  return (
    <div className="space-y-6 pb-12">
      {/* Reusable Soft Header Component */}
      <AdminHeader 
        title="User Management"
        description="Manage platform accounts, roles, institutional IDs, and system access."
        ctaText="Add New User"
        ctaIcon={<UserPlus className="w-4 h-4" />}
        ctaUrl="/admin/users/new"
        icon={<Users className="w-6 h-6" />}
      />

      {/* Enhanced Stats Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
              <TrendingUp className="w-3 h-3" /> Synced Properly
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100/60 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Joined This Month */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Joined This Month</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{currentMonthCount}</h3>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              vs. {lastMonthCount} last month
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100/60 group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Growth Rate */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-amber-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Growth Rate</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">+{growthRate}%</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 mt-2 bg-indigo-50/80 px-2.5 py-0.5 rounded-full border border-indigo-100/50">
              Monthly metric
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner border border-amber-100/60 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Active Roles */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-blue-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Roles</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {users.filter(u => u.role === 'admin' || u.role === 'lecturer').length} Staff
            </h3>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              {users.filter(u => u.role === 'student').length} Registered Students
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner border border-blue-100/60 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users Table Card Container */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, campus ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Enhanced Responsive Role Filter Dropdown */}
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200/80 text-slate-700 text-sm rounded-2xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs transition-all font-medium cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="lecturer">Lecturer</option>
                <option value="student">Student</option>
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading user directory from Appwrite...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No users found matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-4 px-6">User Info</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Campus & University</th>
                  <th className="py-4 px-6">Phone Contact</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.$id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* User Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex-shrink-0">
                          {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">{user.name || 'Unnamed User'}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-slate-300" /> {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize tracking-wide ${
                        user.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-100/80 shadow-xs'
                          : user.role === 'lecturer'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/80 shadow-xs'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Campus & University */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className="font-semibold text-indigo-600 block text-xs bg-indigo-50/80 px-2.5 py-0.5 rounded-lg w-fit border border-indigo-100/50">
                          {user.campusId || 'N/A'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-300" /> {user.university || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.phone || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.$createdAt ? new Date(user.$createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>

                    {/* Functional Edit & Delete Actions Dropdown */}
                    <td className="py-4 px-6 text-right relative">
                      <div className="inline-block text-left dropdown-container">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === user.$id ? null : user.$id)}
                          className="w-9 h-9 rounded-2xl bg-slate-100/80 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-all ml-auto shadow-xs cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openDropdownId === user.$id && (
                          <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-950/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">         
                            <button  
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleEditUser(user.$id);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit User
                            </button>
                            <button
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleDeleteUser(user.$id);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{totalUsers}</strong> total users</span>
          <div className="flex items-center gap-2">
            <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

UsersView.displayName = 'UsersView';

export default UsersView;