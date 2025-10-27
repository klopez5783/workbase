import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEmployeeStore } from './features/employees/store/employeeStore';
import { firestoreService } from './services/firestoreService';
import { useEffect } from 'react';
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

function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser } = useAuth();
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee);

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check role if required
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

  // Load current employee data when user logs in
  useEffect(() => {
    if (currentUser) {
      const loadEmployee = async () => {
        // Get user data from Firestore
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
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/" /> : <Signup />} />

        {/* Main App Routes (with Layout) */}
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
          <Route path="projects" element={<Projects />} />
        </Route>

        {/* Admin Routes (without Layout, full page) */}
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute requiredRole="admin">
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;