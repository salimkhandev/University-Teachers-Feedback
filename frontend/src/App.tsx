import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute   from './components/auth/ProtectedRoute';
import LoginForm        from './components/auth/LoginForm';
import StudentDashboard from './components/student/Dashboard';
import TeacherDashboard from './components/teacher/Dashboard';
import AdminDashboard   from './components/admin/Dashboard';
import SetupWizard      from './components/setup/SetupWizard';

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <div>
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400 mt-2">You don't have permission to view this page.</p>
        <a href="/login" className="btn-primary inline-block mt-6">Back to Login</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"        element={<LoginForm />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>

          {/* Teacher routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin"       element={<AdminDashboard />} />
            <Route path="/admin/setup" element={<SetupWizard />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
