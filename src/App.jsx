import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEmployeeStore } from './features/employees/store/employeeStore';
import { firestoreService } from './services/firestoreService';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Receipts from './pages/Receipts';
import Time from './pages/Time';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Projects from './pages/projects';
import ProjectManagement from './pages/admin/ProjectManagement';
import CompanyManagement from './pages/admin/CompanyManagement';
import CompanyView from './pages/CompanyView';
import WorkerManagement from './pages/admin/WorkerManagement';
import WorkerClockIn from './pages/WorkerClockIn';
import ProfileSettings from './pages/ProfileSettings';
import DailyWorkLog from './pages/DailyWorkLog';
import DailyReportsViewer from './pages/DailyReportsViewer';
import { authService } from './services/authService';
import AdminWorkLogs from './pages/admin/AdminWorkLogs';
import AdminTools from './pages/admin/AdminTools';
import TimecardReport from './pages/TimecardReport';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import ProjectHoursPage from './pages/ProjectHoursPage';
import SMSTerms from './pages/SMSTerms';
import JoinCompany from './pages/JoinCompany';
import TestOCR from './pages/TestOCR';
// import ExpenseList from './components/expenses/';
// import ReciptScanner from './components/expenses/ReceiptScanner';
import TestCamera from './pages/TestCamera';

function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser, loading } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentEmployee) {
    const hasRequiredRole = currentEmployee.role === requiredRole || currentEmployee.role === 'admin';
    
    if (!hasRequiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-5">
          <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-lg">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Admin access required.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
}

function App() {
  const { currentUser } = useAuth();
  const { setCurrentEmployee } = useEmployeeStore();

  useEffect(() => {
    if (currentUser) {
      const loadEmployee = async () => {
        const result = await firestoreService.query('users', [
          { field: 'uid', operator: '==', value: currentUser.uid }
        ]);

        if (result.success && result.data.length > 0) {
          const userData = result.data[0];
          setCurrentEmployee({
            id: currentUser.uid,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            companyId: userData.companyId || null,
            createdAt: userData.createdAt,
          });
        }
      };

      loadEmployee();
    } else {
      setCurrentEmployee(null);
    }
  }, [currentUser, setCurrentEmployee]);

return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/" /> : <Signup />} />
        <Route path="/sms-terms" element={<SMSTerms />} />
        <Route path="/join-company" element={<JoinCompany />} />
        <Route path="/test-camera" element={<TestCamera />} />

        {/* Worker Clock-In (Public) */}
        <Route path="/worker/:accessKey" element={<WorkerClockIn />} />

        {/* Main App Routes (WITH Layout - has sidebar/navbar) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="time" element={<Time />} />
          <Route path="reports" element={<Reports />} />
          <Route path="documents" element={<Documents />} />
          <Route path="company" element={<CompanyView />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="daily-work-log" element={<DailyWorkLog />} />
          <Route path="daily-reports" element={<DailyReportsViewer />} />
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/project-hours" element={<ProjectHoursPage />} />
          <Route path="/test-ocr" element={<TestOCR />} />
          {/* <Route path="/projects/:projectId/expenses" element={<ExpenseList />} />
          <Route path="/projects/:projectId/expenses/scan" element={<ReciptScanner />} /> */}
          
          {/* ✅ MOVE ADMIN TOOLS HERE - Inside Layout */} 
          <Route 
            path="admin/tools" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminTools />
              </ProtectedRoute>
            } 
          />
          
          {/* ✅ MOVE ADMIN WORK LOGS HERE - Inside Layout */}
          <Route 
            path="admin/work-logs" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminWorkLogs />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="reports/time-card" 
            element={
              <ProtectedRoute requiredRole="admin">
                <TimecardReport />
              </ProtectedRoute>
            } 
            
          />


          <Route
            path="admin/projects"
            element={
              <ProtectedRoute requiredRole="admin">
                <Projects />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/company"
            element={
              <ProtectedRoute requiredRole="admin">
                <CompanyManagement />
              </ProtectedRoute>
            }
          />

        </Route>//end Route tag

        {/* Admin Management Pages (WITHOUT Layout - full page for complex management) */}
        
        <Route
          path="/admin/workers"
          element={
            <ProtectedRoute requiredRole="admin">
              <WorkerManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;