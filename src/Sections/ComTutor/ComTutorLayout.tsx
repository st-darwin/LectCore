import { Outlet, redirect, useNavigation } from 'react-router-dom';
import { auth } from '../../appwrite/Auth';
import ComTutorNav from '../../Components/ComTutorNav';

export const Loader = async () => {
  try {
    const user = await auth.getExistingUser();

    if (!user) {
      return redirect('/login');
    }

    switch (user.profile?.role) {
      case 'admin':
        return redirect('/admin');

      case 'student':
        return redirect('/student');

      case 'lecturer':
        return redirect('/lecturer');

      case 'community_student':
        return redirect('/community_student');

      case 'community_tutor':
        return user;

      default:
        return redirect('/login');
    }
  } catch (error) {
    console.error('Community Tutor authentication error:', error);
    return redirect('/login');
  }
};

const ComTutorLayout = () => {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-100 font-['Poppins'] lg:flex-row">
      <ComTutorNav />

      <main className="min-w-0 flex-1 pt-24 sm:pt-28 lg:pl-80 lg:pt-4">
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="animate-pulse space-y-6">
              {/* Header Skeleton */}
              <div className="space-y-2">
                <div className="h-7 w-48 rounded-lg bg-slate-200/70" />
                <div className="h-4 w-72 max-w-full rounded-lg bg-slate-200/50" />
              </div>

              {/* Stats Skeleton */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 rounded-2xl border border-slate-200/60 bg-white p-5"
                  >
                    <div className="mb-5 h-9 w-9 rounded-xl bg-slate-100" />
                    <div className="h-5 w-24 rounded-lg bg-slate-200/70" />
                    <div className="mt-2 h-3 w-16 rounded-lg bg-slate-100" />
                  </div>
                ))}
              </div>

              {/* Content Skeleton */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="h-72 rounded-2xl border border-slate-200/60 bg-white lg:col-span-2" />
                <div className="h-72 rounded-2xl border border-slate-200/60 bg-white" />
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default ComTutorLayout;