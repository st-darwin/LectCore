// StudentLayout.tsx
import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import StudentNav from '../../Components/StudentNav';

export const Loader = async () => {
  try {
    const user = await auth.getExistingUser();
    
    if (!user) {
      return redirect('/login');
    }

    if (user.profile?.role === 'admin') {
      return redirect('/admin');
    }

    if (user.profile?.role === 'lecturer') {
      return redirect('/lecturer');
    }

    return user;
  } catch (error) {
    console.log("error fetching user", error);
    return redirect('/login');
  }
}

export default function StudentLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 font-['Poppins'] overflow-x-hidden">
      <StudentNav />
      {/* 
        - pt-24 on mobile gives standard clearance.
        - md:pt-32 provides a comfortable, wide-spread vertical margin specifically for tablets.
        - lg:pt-6 resets the top padding for desktop where the sidebar is active.
        - lg:pl-80 applies the sidebar offset exclusively on desktop viewports.
      */}
      <main className="flex-1 lg:pl-80 overflow-y-auto pt-24 md:pt-32 lg:pt-6 p-4 sm:p-6 lg:p-10 pb-10">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}