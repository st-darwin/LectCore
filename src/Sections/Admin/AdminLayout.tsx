import { Outlet, redirect } from 'react-router-dom'
import { auth } from '../../appwrite/Auth'

export const Loader = async () => {
  const user = await auth.getExistingUser();
  
  if (!user) {
    return redirect('/login');
  }

  // Redirect lecturers trying to access admin panel
  if (user.profile?.role === 'lecturer') {
    return redirect('/lecturer');
  }

  // Redirect students trying to access admin panel
  if (user.profile?.role === 'student') {
    return redirect('/student'); // Change to your student dashboard route if different
  }

  return null;
}

const AdminLayout = () => {
  return (
    <div>
      admin
      <Outlet />
    </div>
  )
}

export default AdminLayout