import { useState } from 'react';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { migrateAllProjects, validateProjectMigration } from '../utils/migrateProjects';

export default function MigrationButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleMigrate = async () => {
    if (!window.confirm('This will migrate all projects to the new dual-array structure. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const migrationResult = await migrateAllProjects();
      setResult(migrationResult);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const validationResult = await validateProjectMigration();
      setResult({
        ...validationResult,
        type: 'validation'
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
      >
        <Database size={20} />
        Project Migration
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Project Migration Tool</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>What this does:</strong> Migrates projects from the old single
                assignedWorkers array to the new dual-array structure (assignedEmployees + assignedWorkers).
              </p>
              <p className="text-sm text-blue-900 mt-2">
                • <strong>assignedEmployees</strong> - UIDs of authenticated Users<br />
                • <strong>assignedWorkers</strong> - IDs of SMS-only Workers
              </p>
            </div>

            {loading && (
              <div className="text-center py-8">
                <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
                <p className="text-gray-600">Processing...</p>
              </div>
            )}

            {result && !loading && (
              <div className="mb-6">
                {result.type === 'validation' ? (
                  // Validation Results
                  <div className={`p-4 rounded-lg ${
                    result.issuesFound === 0
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {result.issuesFound === 0 ? (
                        <CheckCircle className="text-green-600" size={24} />
                      ) : (
                        <AlertCircle className="text-yellow-600" size={24} />
                      )}
                      <h3 className="font-bold text-lg">Validation Results</h3>
                    </div>
                    <p className="mb-2">
                      <strong>Total Projects:</strong> {result.total}
                    </p>
                    <p className="mb-2">
                      <strong>Issues Found:</strong> {result.issuesFound}
                    </p>
                    {result.issues && result.issues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Issues:</h4>
                        <div className="space-y-2">
                          {result.issues.map((issue, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border">
                              <p className="font-semibold">{issue.projectName}</p>
                              <p className="text-sm text-gray-600">{issue.issue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : result.success !== false ? (
                  // Migration Results
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="text-green-600" size={24} />
                      <h3 className="font-bold text-lg">Migration Complete!</h3>
                    </div>
                    <p className="mb-1">
                      <strong>Total Projects:</strong> {result.total}
                    </p>
                    <p className="mb-1">
                      <strong>Migrated:</strong> {result.migrated}
                    </p>
                    <p className="mb-1">
                      <strong>Skipped:</strong> {result.skipped}
                    </p>
                    <p className="mb-1">
                      <strong>Failed:</strong> {result.failed}
                    </p>
                  </div>
                ) : (
                  // Error
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-red-600" size={24} />
                      <h3 className="font-bold text-lg">Migration Failed</h3>
                    </div>
                    <p className="text-red-700">{result.error}</p>
                  </div>
                )}
              </div>
            )}

            {!loading && (
              <div className="flex gap-3">
                <button
                  onClick={handleValidate}
                  className="flex-1 bg-blue-100 text-blue-700 py-3 px-4 rounded-xl font-semibold hover:bg-blue-200 transition"
                >
                  Validate Projects
                </button>
                <button
                  onClick={handleMigrate}
                  className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                  Run Migration
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
