import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { CircleArrowLeft } from 'lucide-react';

export default function Receipts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser?.uid) return;

      try {
        // Step 1: Get the admin's user document to find their companyId
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.error('User document not found');
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const companyId = userData?.companyId;

        if (!companyId) {
          console.error('User does not have a companyId');
          setLoading(false);
          return;
        }

        // Step 2: Query projects where createdBy equals the companyId
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('createdBy', '==', companyId));
        const snapshot = await getDocs(q);
        
        const projectsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentUser?.uid]);

  const handleProjectSelect = (projectId) => {
    navigate(`/projects/${projectId}/receipts/scan`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('receipts.noProjectsTitle')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('receipts.noProjectsDescription')}
          </p>
          <button
            onClick={() => navigate('/projects/new')}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
          >
            {t('wizard.createProject')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 m-4 font-semibold mb-4 flex items-center gap-2"
        >
          <CircleArrowLeft size={25} /> {t('common.back')}
        </button>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
            📸
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {t('receipts.addReceipt')}
            </h1>
            <p className="text-md font-bold text-gray-800">
              {t('receipts.selectProjectPrompt')}
            </p>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="px-4 pt-4 pb-20">
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project.id)}
              className="w-full bg-white rounded-xl p-4 shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md active:scale-[0.98] transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                {/* Project Icon */}
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                  <svg 
                    className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                    />
                  </svg>
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.address && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {project.address}
                    </p>
                  )}
                </div>

                {/* Arrow Icon */}
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Helper text for multiple projects */}
        {projects.length > 1 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('receipts.tapToOpenCamera')}
          </p>
        )}
      </div>
    </div>
  );
}