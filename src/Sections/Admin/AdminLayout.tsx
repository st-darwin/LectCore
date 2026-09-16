// AdminLayout.tsx
import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import AdminNav from '../../Components/AdminNav';

export const Loader = async () => {
  const user = await auth.getExistingUser();
  
  if (!user) {
    return redirect('/login');
  }

  // Restrict access if the user is not an admin
  if (user.profile?.role !== 'admin') {
    if (user.profile?.role === 'lecturer') return redirect('/lecturer');
    if (user.profile?.role === 'student') return redirect('/student');
    return redirect('/login');
  }

  return null;
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row overflow-x-hidden">
      <AdminNav />
      <main className="flex-1 md:pl-80 overflow-y-auto pt-20 md:pt-6 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}