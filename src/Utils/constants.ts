import { LayoutDashboard, BookOpen, Users, Megaphone } from 'lucide-react';

export const LecturerNavItems = [
  {
    label: 'Dashboard',
    path: '/lecturer',
    icon: LayoutDashboard,
  },
  {
    label: 'Courses',
    path: '/lecturer/courses',
    icon: BookOpen,
  },
  {
    label: 'My Students',
    path: '/lecturer/students',
    icon: Users,
  },
  {
    label: 'Announcements',
    path: '/lecturer/announcements',
    icon: Megaphone,
  },
];