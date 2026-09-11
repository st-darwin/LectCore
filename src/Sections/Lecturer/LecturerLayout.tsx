import { Outlet, redirect } from 'react-router-dom'
import { auth } from '../../appwrite/Auth'

export const Loader = async () => {
  const user = await auth.getExistingUser();
  
  if (!user) {
    return redirect('/login');
  }

  // If an admin or student hits this route, redirect them accordingly
  if (user.profile?.role === 'admin') {
    return redirect('/admin');
  }

  if (user.profile?.role === 'student') {
    return redirect('/student');
  }

  return null;
}

const LecturerLayout = () => {
  return (
    <div>
      lecturer dashboard
      <Outlet />
    </div>
  )
}

export default LecturerLayout