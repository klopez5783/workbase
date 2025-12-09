import { useState } from 'react';
import { Zap, Compass, X } from 'lucide-react';
import ProjectForm from './ProjectForm';
import ProjectWizard from './ProjectWizard';

export default function ProjectFormSelector({ onClose, existingProject = null }) {
  const [mode, setMode] = useState(null); // null = selection screen, 'quick' or 'guided'

  // If editing existing project, skip selection and go straight to quick form
  if (existingProject && mode === null) {
    return <ProjectForm onClose={onClose} existingProject={existingProject} />;
  }

  // Show mode selection
  if (mode === null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-8 my-8 relative">
          {/* Close button - X at top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Create New Project
          </h2>
          <p className="text-gray-600 text-center mb-3">
            Choose how you'd like to set up your project
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Guided Wizard Option */}
            <button
              onClick={() => setMode('guided')}
              className="group p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex flex-row">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
                  <Compass className="text-green-600 group-hover:text-white transition-colors" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 ml-5 self-center">
                  Guided Setup
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Step-by-step process with helpful tips. We'll walk you through each detail one at a time.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Recommended for first-time users</span>
              </div>
            </button>

            {/* Quick Form Option */}
            <button
              onClick={() => setMode('quick')}
              className="group p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex flex-row">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                  <Zap className="text-blue-600 group-hover:text-white transition-colors" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 ml-5 self-center">
                  Quick Form
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                All fields on one screen. Perfect if you know exactly what you need and want to move fast.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Best for experienced users</span>
              </div>
            </button>

          </div>

          <div className="mt-8 text-center">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render selected mode
  if (mode === 'quick') {
    return <ProjectForm onClose={onClose} existingProject={existingProject} />;
  }

  if (mode === 'guided') {
    return <ProjectWizard onClose={onClose} existingProject={existingProject} />;
  }

  return null;
}