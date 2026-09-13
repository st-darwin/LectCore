import { LayoutDashboard, BookOpen, FileText, Megaphone , Users } from 'lucide-react';

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

export const StudentNavItems = [
  {
    label: 'Dashboard',
    path: '/student',
    icon: LayoutDashboard,
  },
  {
    label: 'Courses',
    path: '/student/courses',
    icon: BookOpen,
  },
  {
    label: 'Assignments',
    path: '/student/assignments',
    icon: FileText,
  },
  {
    label: 'Announcements',
    path: '/student/announcements',
    icon: Megaphone,
  },
];