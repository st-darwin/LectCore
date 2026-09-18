import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import Login from "./Sections/Root/Login";
import Signup from "./Sections/Root/SiginUp";
import LecturerLayout, { Loader as lecturerLoader } from "./Sections/Lecturer/LecturerLayout";
import AdminLayout, { Loader as adminLoader } from "./Sections/Admin/AdminLayout";
import StudentLayout, { Loader as studentLoader } from "./Sections/Student/StudentLayout";
import LecturerDashboard, { Loader as DashbaordLoader } from "./Sections/Lecturer/LecturerDashboard";

import CreateCourse from "./Sections/Lecturer/CreateCourse";
import CourseView from "./Sections/Lecturer/CourseView";
import CourseDetail from "./Sections/Lecturer/CourseDetail";
import MyStudents from "./Sections/Lecturer/MyStudents";
import AssignmentView from "./Sections/Lecturer/AssignmentView";
import CourseEdit from "./Sections/Lecturer/CourseEdit";
import Announcements , {Loader as AnnouncementLoader} from "./Sections/Lecturer/Announcements";
import StudentDashboard from "./Sections/Student/StudentDashboard";
import StudentCourseView from "./Sections/Student/StudentCourseView";
import StudentCourseBrowse from "./Sections/Student/StudentCourseBrowse";
import StudentCourseDetail from "./Sections/Student/StudentCourseDetail";
import StudentAnnouncement from "./Sections/Student/StudentAnnouncement";
import CreateAssignment from "./Sections/Lecturer/CreateAssignment";
import SubmissionsView from "./Sections/Lecturer/SubmissionView";
import StudentAssignmentsView from "./Sections/Student/StudentAssignmentsView";
import StudentAssignmentSubmit from "./Sections/Student/StudentAssignmentSubmit";
import AdminDashboard from "./Sections/Admin/AdminDashboard";
import UsersView from "./Sections/Admin/UsersView";
import CreateUser from "./Sections/Admin/CreateNewUser";
import AdminCourseView from "./Sections/Admin/AdminCourseView";
import EditUser from "./Sections/Admin/EditUser";
import ViewCourseMaterials from "./Sections/Admin/ViewCourseMaterials";
import UploadNewMaterial , {Loader as UploadLoader} from "./Sections/Admin/UploadNewMaterial";


const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Redirect the base URL to login to prevent 404 blank pages */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Auth Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/sign-up" element={<Signup />} />

      {/* Admin Layout & Nested Routes */}
      <Route path="/admin" element={<AdminLayout />} loader={adminLoader}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersView />} />
        <Route path="users/edit/:id" element={<EditUser />} />
        <Route path="users/new" element={<CreateUser />} />
        <Route path="courses"  element={<AdminCourseView />} />
        <Route path="courses/:courseId/materials" element={<ViewCourseMaterials/>} />
        <Route  path="courses/:courseId/materials/new" element={<UploadNewMaterial/>} loader={UploadLoader}/>
      </Route>

      {/* Lecturer Layout & Nested Routes */}
      <Route path="/lecturer" element={<LecturerLayout />} loader={lecturerLoader}>
        <Route index element={<LecturerDashboard />} loader={DashbaordLoader} />
        <Route path="courses" element={<CourseView />} />
        <Route path="course/create" element={<CreateCourse />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="courses/edit/:id" element={<CourseEdit />} />
        <Route path="students" element={<MyStudents />} />
        <Route path="announcements" element={<Announcements />} loader={AnnouncementLoader} />
        <Route path="assignments" element={<AssignmentView />} />
        <Route path="assignments/create" element={<CreateAssignment />} />
        <Route path="submissions/:assignmentId" element={<SubmissionsView />} />

      </Route>

      {/* Student Layout & Nested Routes */}
      <Route path="/student" element={<StudentLayout />} loader={studentLoader}>
         <Route index element={<StudentDashboard />} />
         <Route path="courses" element={<StudentCourseView/>} />
          <Route path="courses/browse" element={<StudentCourseBrowse/>} />
          <Route path="courses/:courseId" element={<StudentCourseDetail/>} />
          <Route path="announcements" element={<StudentAnnouncement/>} />
          <Route path="assignments" element={<StudentAssignmentsView/>} />
          <Route path="assignment/:assignmentId" element={<StudentAssignmentSubmit/>} />

        {/* Once you build student pages, add them here like this: */}
        {/* <Route index element={<StudentDashboard />} /> */}
      </Route>
    </>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}