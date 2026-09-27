import { LayoutDashboard, BookOpen, Users, FileText, ShieldAlert, Settings, Megaphone, Activity, MessagesSquare, Settings2Icon, GraduationCap } from 'lucide-react';

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
  {
    label: 'Assignments',
    path: '/lecturer/assignments',
    icon: FileText,
  },
    {
    label : "Chat",
    path: "/lecturer/chat",
    icon :  MessagesSquare

  }
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
  {
    label : "Real time Sync",
    path: "/student/real-time-sync",
    icon : Activity


  },
  

  {
    label : "Chat",
    path: "/student/chat",
    icon :  MessagesSquare

  },
  {
    label : "Grades",
    path: "/student/grades",
    icon :  GraduationCap,
  },

  {
    label : "Settings",
    path: "/student/settings",
    icon : Settings2Icon
  }
];

export const AdminNavItems = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'User Management',
    path: '/admin/users',
    icon: Users,
  },
  {
    label: 'All Courses',
    path: '/admin/courses',
    icon: BookOpen,
  },
  {
    label: 'Announcements',
    path: '/admin/announcements',
    icon: Megaphone,
  },
  {
    label: 'System Logs',
    path: '/admin/logs',
    icon: ShieldAlert,
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
  },
    {
    label : "Chat",
    path: "/admin/chat",
    icon :  MessagesSquare

  },
];