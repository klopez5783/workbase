import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { findCompanyByCode, normalizeCode } from '../utils/companyCode';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useEmployeeStore } from '../features/employees/store/employeeStore';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function JoinCompany() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentEmployee, setCurrentEmployee } = useEmployeeStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setError('No company code provided in the URL.');
      setLoading(false);
      return;
    }

    // Check if user is authenticated
    if (!currentUser) {
      setRequiresAuth(true);
      setLoading(false);
      return;
    }

    // Auto-join the company
    joinCompany(code);
  }, [searchParams, currentUser]);

  const joinCompany = async (code) => {
    setLoading(true);
    setError('');

    try {
      const normalizedCode = normalizeCode(code);

      // Find company by code
      const company = await findCompanyByCode(normalizedCode);

      if (!company) {
        setError('Invalid company code. The code may have expired or been regenerated.');
        setLoading(false);
        return;
      }

      // Check if user is already in a company
      const userDoc = await firestoreService.getById('users', currentUser.uid);
      if (userDoc && userDoc.companyId) {
        if (userDoc.companyId === company.id) {
          setError(`You are already a member of ${company.data.name}.`);
          setLoading(false);
          setTimeout(() => navigate('/'), 2000);
          return;
        }
        setError('You are already part of a company. Leave your current company first.');
        setLoading(false);
        return;
      }

      // Join the company
      await performJoin(company.id, company.data.name);

    } catch (err) {
      console.error('Error joining company:', err);
      setError(err.message || 'Failed to join company. Please try again.');
      setLoading(false);
    }
  };

  const performJoin = async (companyId, companyName) => {
    try {
      // Update user profile with companyId and join tracking
      await firestoreService.update('users', currentUser.uid, {
        companyId: companyId,
        joinedAt: new Date().toISOString(),
        joinMethod: 'link',
        updatedAt: new Date().toISOString(),
      });

      // Add user to company's workers array
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        workers: arrayUnion(currentUser.uid),
        updatedAt: new Date().toISOString(),
      });

      // Update employee store
      if (currentEmployee) {
        setCurrentEmployee({
          ...currentEmployee,
          companyId: companyId,
        });
      }

      // Log successful join
      console.log(`User ${currentUser.uid} successfully joined company ${companyId} via link`);

      setCompanyName(companyName);
      setSuccess(true);
      setLoading(false);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('Error in performJoin:', error);
      throw error;
    }
  };

  const handleLoginClick = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
    navigate('/login');
  };

  const handleSignUpClick = () => {
    // Store the current URL to redirect back after signup
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <Building2 size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join a Company</h1>
        </div>

        {/* Content */}
        {loading ? (
          // Loading State
          <div className="text-center py-8">
            <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <p className="text-gray-600">Joining company...</p>
          </div>
        ) : requiresAuth ? (
          // Requires Authentication State
          <div className="text-center">
            <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to join a company.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleLoginClick}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Login
              </button>
              <button
                onClick={handleSignUpClick}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Sign Up
              </button>
            </div>
          </div>
        ) : success ? (
          // Success State
          <div className="text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-gray-600 mb-1">
              You've successfully joined
            </p>
            <p className="text-xl font-semibold text-blue-600 mb-4">
              {companyName}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        ) : error ? (
          // Error State
          <div className="text-center">
            <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Join</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
              {!currentUser && (
                <button
                  onClick={handleLoginClick}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
