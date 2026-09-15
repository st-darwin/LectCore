import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import LecturerNav from '../../Components/LecturerNav';

export const Loader = async () => {
  const user = await auth.getExistingUser();
  
  if (!user) {
    return redirect('/login');
  }

  if (user.profile?.role === 'admin') {
    return redirect('/admin');
  }

  if (user.profile?.role === 'student') {
    return redirect('/student');
  }

  return user;
}

export default function LecturerLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 font-['Poppins'] overflow-x-hidden">
      <LecturerNav />
      {/* pt-20 on mobile creates explicit clearance below the fixed floating header to prevent content overlap */}
      <main className="flex-1 md:pl-80 overflow-y-auto pt-23 md:pt-6 p-4 sm:p-6 md:p-10 pb-10">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}