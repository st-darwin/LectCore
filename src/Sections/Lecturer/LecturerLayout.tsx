// LecturerLayout.tsx
import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import LecturerNav from '../../Components/LecturerNav';

export const Loader = async () => {
  try {
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
  } catch (error) {
    console.log("error fetching user", error);
    return redirect('/login');
  }
}

export default function LecturerLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 font-['Poppins'] overflow-x-hidden">
      <LecturerNav />
      {/* 
        - pt-28 sm:pt-32 provides a comfortable, spacious vertical gap between the floating top header and the outlet on mobile & tablets.
        - lg:pt-6 resets it back to compact top padding for desktop where the sidebar handles navigation instead.
        - lg:pl-80 ensures the wide-spread layout only applies margins for the sidebar on large desktop screens.
      */}
      <main className="flex-1 lg:pl-80 overflow-y-auto pt-28 sm:pt-32 lg:pt-6 p-4 sm:p-6 lg:p-10 pb-10">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}