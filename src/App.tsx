import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import Login from "./Sections/Root/Login";
import Signup from "./Sections/Root/SiginUp";
import LecturerLayout, { Loader as lecturerLoader } from "./Sections/Lecturer/LecturerLayout";
import AdminLayout, { Loader as adminLoader } from "./Sections/Admin/AdminLayout";
import StudentLayout, { Loader as studentLoader } from "./Sections/Student/StudentLayout";

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
        {/* Once you build admin pages, add them here like this: */}
        {/* <Route index element={<AdminDashboard />} /> */}
      </Route>

      {/* Lecturer Layout & Nested Routes */}
      <Route path="/lecturer" element={<LecturerLayout />} loader={lecturerLoader}>
        {/* Once you build lecturer pages, add them here like this: */}
        {/* <Route index element={<LecturerDashboard />} /> */}
      </Route>

      {/* Student Layout & Nested Routes */}
      <Route path="/student" element={<StudentLayout />} loader={studentLoader}>
        {/* Once you build student pages, add them here like this: */}
        {/* <Route index element={<StudentDashboard />} /> */}
      </Route>
    </>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}