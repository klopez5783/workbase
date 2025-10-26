import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Receipts from './pages/Receipts';
import Time from './pages/Time';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  const { currentUser } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/" /> : <Signup />} />

        {/* Protected Routes */}
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;