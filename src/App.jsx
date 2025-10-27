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

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;