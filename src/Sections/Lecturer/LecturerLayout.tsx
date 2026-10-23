// LecturerLayout.tsx
import { Outlet, redirect, useNavigation } from 'react-router-dom';
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
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 text-slate-900 font-['Poppins'] overflow-x-hidden">
      <LecturerNav />
      
      <main className="flex-1 lg:pl-80 overflow-y-auto pt-28 sm:pt-32 lg:pt-6 p-4 sm:p-6 lg:p-10 pb-10">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            /* Neat, minimal, and smooth skeleton loader matching your dashboard structure */
            <div className="space-y-6 animate-pulse">
              {/* Header Banner Skeleton */}
              <div className="p-6 sm:p-8 rounded-[2rem] sm:rounded-3xl bg-white/70 border border-slate-200/60 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-28 h-6 bg-slate-200 rounded-full" />
                  <div className="w-24 h-6 bg-slate-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 sm:w-1/2 h-8 bg-slate-200 rounded-xl" />
                  <div className="w-full sm:w-2/3 h-4 bg-slate-200 rounded-lg" />
                </div>
              </div>

              {/* Stats Grid Skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 sm:p-5 rounded-2xl bg-white/70 border border-slate-200/60 shadow-2xs space-y-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="w-16 h-3 bg-slate-200 rounded-md" />
                      <div className="w-12 h-6 bg-slate-200 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Content Grid Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 border border-slate-200/60 h-72 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="w-32 h-5 bg-slate-200 rounded-md" />
                    <div className="w-20 h-4 bg-slate-200 rounded-md" />
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-14 bg-slate-100 rounded-2xl" />
                    <div className="w-full h-14 bg-slate-100 rounded-2xl" />
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-white/70 border border-slate-200/60 h-72 space-y-4">
                  <div className="w-28 h-5 bg-slate-200 rounded-md" />
                  <div className="space-y-3">
                    <div className="w-full h-12 bg-slate-100 rounded-xl" />
                    <div className="w-full h-12 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}