
import { Outlet, redirect } from 'react-router-dom'
import { auth } from '../../appwrite/Auth'

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
    <div>
      welcome student
      <Outlet />
    </div>
  )
}

export default StudentLayout