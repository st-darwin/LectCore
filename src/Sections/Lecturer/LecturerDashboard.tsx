
import Header from '../../Components/Header';
import { useLoaderData } from 'react-router-dom';

import { BookOpen } from 'lucide-react';
import { account } from '../../appwrite/Client';


export const Loader =async()=>{
    const user = await account.get();
    if(!user){console.log("No user found");}

    return user;
    
}

const LecturerDashboard = () => {
const user = useLoaderData() as { name: string | null; email: string; $id: string; profile?: { role: string } };
const l = user.name || "Lecturer";


 
  return (
    <div>
      <Header
        title={`Welcome back, ${l} 👋`}
        description="Manage your courses and track student performance."
        ctaText="View Courses"
        ctaUrl="/lecturer/courses"
        icon={<BookOpen size={20} />}
      />
    </div>
  );
};

export default LecturerDashboard;

