import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedPage from './components/ProtectedPage';

// Import Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Participants from './pages/Participants';
import Teams from './pages/Teams';
import Attendance from './pages/Attendance';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Announcements from './pages/Announcements';
import Reports from './pages/Reports';
import Committee from './pages/Committee';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

function App() {
  const commonRoles = ['super_admin', 'admin', 'viewer'];
  const writeRoles = ['super_admin', 'admin'];

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes inside layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Dashboard />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Tournaments />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/participants"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Participants />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Teams />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Attendance />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Leaderboard />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rules"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Rules />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Announcements />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Reports />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              
              {/* Super Admin Restricted */}
              <Route
                path="/committee"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <ProtectedPage>
                      <Committee />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <ProtectedPage>
                      <AuditLogs />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />

              {/* Admin/Super Admin Restricted */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={writeRoles}>
                    <ProtectedPage>
                      <Settings />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />

              {/* General Profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={commonRoles}>
                    <ProtectedPage>
                      <Profile />
                    </ProtectedPage>
                  </ProtectedRoute>
                }
              />

              {/* Fallback routing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
