import { Outlet, redirect } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import StudentNav from '../../Components/StudentNav';

export const Loader = async () => {
  const user = await auth.getExistingUser();
  
  if (!user) {
    return redirect('/login');
  }

  // Redirect admins or lecturers attempting to access the student view
  if (user.profile?.role === 'admin') {
    return redirect('/admin');
  }

  if (user.profile?.role === 'lecturer') {
    return redirect('/lecturer');
  }

  return null;
}

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row">
      <StudentNav />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default StudentLayout;