// StudentLayout.tsx
import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import StudentNav from '../../Components/StudentNav';

export const Loader = async () => {
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

  return null;
}

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row overflow-x-hidden">
      <StudentNav />
      <main className="flex-1 md:pl-80 overflow-y-auto pt-20 md:pt-6 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}