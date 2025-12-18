import { useState } from 'react';
import {
  Loader,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Building2,
  Home,
  Users,
  MapPin,
  MapPinned,
  Sparkles
} from 'lucide-react';
import { firestoreService } from '../../../services/firestoreService';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmployeeStore } from '../../employees/store/employeeStore';
import { useProjectStore } from '../../projects/store/projectstore';
import LocationPicker from '../../projects/components/LocationPicker';

/**
 * AdminOnboardingWizard Component
 * TurboTax-style step-by-step wizard for new admin users
 * Guides through: Company Setup → First Project → First Worker → Complete
 */
export default function AdminOnboardingWizard({ onComplete }) {
  const { currentUser } = useAuth();
  const { setCurrentEmployee } = useEmployeeStore();
  const { addProject } = useProjectStore();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Step 1: Company data
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [industry, setIndustry] = useState('Construction');

  // Step 2: Project data
  const [projectName, setProjectName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Ohio');
  const [zipCode, setZipCode] = useState('');
  const [location, setLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState(100);

  // Step 3: Worker data
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [skipWorker, setSkipWorker] = useState(false);

  // Created resource IDs (for tracking and linking)
  const [createdCompanyId, setCreatedCompanyId] = useState(null);
  const [createdProjectId, setCreatedProjectId] = useState(null);

  const totalSteps = 3;

  // US states list
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  // Industry options
  const industries = [
    'Construction',
    'General Contracting',
    'Electrical',
    'Plumbing',
    'HVAC',
    'Carpentry',
    'Roofing',
    'Landscaping',
    'Other'
  ];

  // Helper functions
  const getFullAddress = () => {
    const addressParts = [streetAddress, city, `${state} ${zipCode}`];
    return addressParts.filter(Boolean).join(', ');
  };

  const handleLocationSet = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowLocationPicker(false);
  };

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');

    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleCompanyPhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCompanyPhone(formatted);
  };

  const handleWorkerPhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setWorkerPhone(formatted);
  };

  const generateAccessKey = () => {
    return crypto.randomUUID();
  };

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return companyName.trim().length > 0;
      case 2:
        return projectName.trim().length > 0 &&
               streetAddress.trim().length > 0 &&
               city.trim().length > 0 &&
               state.trim().length > 0 &&
               zipCode.trim().length === 5 &&
               location !== null;
      case 3:
        // Can skip OR must provide valid worker data
        return skipWorker || (
          workerName.trim().length > 0 &&
          workerPhone.replace(/\D/g, '').length === 10
        );
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      setError('');
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setError('Please fill in all required fields before continuing');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Step submit handlers
  const handleStep1Submit = async () => {
    if (!validateStep(1)) {
      setError('Please complete all required fields');
      return false;
    }

    setLoading(true);
    setError('');

    try {
      // Create company
      const companyData = {
        name: companyName.trim(),
        phone: companyPhone || '',
        industry: industry,
        createdBy: currentUser?.uid,
        workers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const companyResult = await firestoreService.create('companies', companyData);

      if (!companyResult.success) {
        throw new Error(companyResult.error || 'Failed to create company');
      }

      const companyId = companyResult.id;
      setCreatedCompanyId(companyId);

      // Update user profile with companyId
      await firestoreService.update('users', currentUser.uid, {
        companyId: companyId,
      });

      // Update current employee in store
      setCurrentEmployee({
        ...currentUser,
        companyId: companyId,
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error creating company:', err);
      setError(err.message || 'Failed to create company');
      setLoading(false);
      return false;
    }
  };

  const handleStep2Submit = async () => {
    if (!validateStep(2)) {
      setError('Please complete all required fields');
      return false;
    }

    setLoading(true);
    setError('');

    try {
      const fullAddress = getFullAddress();

      const projectData = {
        name: projectName.trim(),
        address: fullAddress,
        location,
        geofenceRadius: Number(geofenceRadius),
        clientName: '',
        clientPhone: '',
        status: 'active',
        assignedEmployees: [],
        assignedWorkers: [],
        createdBy: createdCompanyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projectResult = await firestoreService.create('projects', projectData);

      if (!projectResult.success) {
        throw new Error(projectResult.error || 'Failed to create project');
      }

      const projectId = projectResult.id;
      setCreatedProjectId(projectId);

      // Add to store
      addProject({
        id: projectId,
        firestoreId: projectId,
        ...projectData,
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
      setLoading(false);
      return false;
    }
  };

  const handleStep3Submit = async () => {
    if (!validateStep(3)) {
      setError('Please complete all required fields or skip this step');
      return false;
    }

    setLoading(true);
    setError('');

    try {
      // If skipping worker creation, just mark onboarding complete
      if (!skipWorker) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
        const digits = workerPhone.replace(/\D/g, '');

        const workerData = {
          name: workerName.trim(),
          phone: workerPhone,
          phoneRaw: digits,
          accessKey: generateAccessKey(),
          accessKeyCreatedAt: now.toISOString(),
          accessKeyExpiresAt: expiresAt.toISOString(),
          status: 'active',
          companyId: createdCompanyId,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        const workerResult = await firestoreService.create('workers', workerData);

        if (!workerResult.success) {
          throw new Error(workerResult.error || 'Failed to create worker');
        }

        // Assign worker to project
        if (createdProjectId) {
          await firestoreService.update('projects', createdProjectId, {
            assignedWorkers: [workerResult.id],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Mark onboarding as complete in user profile
      await firestoreService.update('users', currentUser.uid, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      });

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error creating worker:', err);
      setError(err.message || 'Failed to create worker');
      setLoading(false);
      return false;
    }
  };

  // Main submit handler for final step
  const handleFinish = async () => {
    const success = await handleStep3Submit();
    if (success) {
      // Move to success screen
      setCurrentStep(4);
    }
  };

  // Continue to next step with auto-submit logic
  const handleContinue = async () => {
    if (currentStep === 1) {
      const success = await handleStep1Submit();
      if (success) {
        setCompletedSteps(new Set([...completedSteps, 1]));
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const success = await handleStep2Submit();
      if (success) {
        setCompletedSteps(new Set([...completedSteps, 2]));
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      await handleFinish();
    }
  };

  // Step render functions
  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="text-blue-600" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Let's set up your company
        </h3>
        <p className="text-gray-600">
          Tell us a bit about your business to get started
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Smith Construction LLC"
            className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="tel"
            value={companyPhone}
            onChange={handleCompanyPhoneChange}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Industry / Type
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mt-6">
        <p className="text-blue-900 font-medium text-sm mb-1">
          Why do we need this?
        </p>
        <p className="text-blue-700 text-sm">
          Your company profile helps organize all your projects, workers, and time tracking in one place.
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn">
      {!showLocationPicker ? (
        <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Create your first project
            </h3>
            <p className="text-gray-600">
              Where will your team be working?
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Downtown Office Remodel"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Columbus"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="43215"
                  maxLength="5"
                  pattern="[0-9]{5}"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {states.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set Location on Map *
              </label>
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                <MapPin size={24} />
                {location ? 'Change Location on Map' : 'Set Location on Map'}
              </button>

              {location && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mt-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                    <div className="flex-1">
                      <p className="text-green-900 font-semibold mb-2">
                        ✓ Location Confirmed
                      </p>
                      <p className="text-green-700 text-sm font-mono">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">Select Location</h4>
            <button
              type="button"
              onClick={() => setShowLocationPicker(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <LocationPicker
            initialLocation={location}
            onLocationSet={handleLocationSet}
            address={getFullAddress()}
          />
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-orange-600" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Add your first worker
        </h3>
        <p className="text-gray-600">
          Start building your team (you can skip this for now)
        </p>
      </div>

      {!skipWorker ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-4">
            <p className="text-blue-900 text-sm">
              <strong>No account needed!</strong> Workers receive a link to clock in/out instantly.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Worker Name *
            </label>
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Worker Phone *
            </label>
            <input
              type="tel"
              value={workerPhone}
              onChange={handleWorkerPhoneChange}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              📱 We'll send a link so they can clock in
            </p>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Assigned to:</strong> {projectName || 'Your first project'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSkipWorker(true)}
            className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm font-medium"
          >
            Skip for now
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-xl p-8">
            <p className="text-gray-600 mb-4">
              No problem! You can add workers anytime from the dashboard.
            </p>
            <button
              type="button"
              onClick={() => setSkipWorker(false)}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Actually, I'll add one now
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSuccessScreen = () => (
    <div className="space-y-6 animate-fadeIn text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="text-green-600" size={48} />
      </div>

      <div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">
          You're all set! 🎉
        </h3>
        <p className="text-gray-600 text-lg">
          Your workspace is ready to go
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 rounded-2xl p-6 mt-8">
        <h4 className="font-bold text-gray-900 mb-4 text-left">What we created:</h4>
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{companyName}</p>
              <p className="text-sm text-gray-600">Your company profile</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Home className="text-green-600" size={16} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{projectName}</p>
              <p className="text-sm text-gray-600">Your first project</p>
            </div>
          </div>

          {!skipWorker && workerName && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="text-orange-600" size={16} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{workerName}</p>
                <p className="text-sm text-gray-600">Your first worker</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-2 mt-8"
      >
        <Sparkles size={24} />
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Welcome to WorkBase!
            </h2>
            {currentStep < 4 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
                    onComplete();
                  }
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={28} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {currentStep < 4 && (
            <>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex-1">
                    <div className={`h-2 rounded-full transition-all ${
                      completedSteps.has(step) || currentStep > step
                        ? 'bg-green-500'
                        : currentStep === step
                        ? 'bg-blue-500'
                        : 'bg-gray-200'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs font-medium text-gray-600">
                <span>Company</span>
                <span>Project</span>
                <span>Worker</span>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderSuccessScreen()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={loading || !validateStep(currentStep)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    {currentStep === 1 && 'Creating Company...'}
                    {currentStep === 2 && 'Creating Project...'}
                    {currentStep === 3 && 'Setting Up...'}
                  </>
                ) : (
                  <>
                    {currentStep === 3 ? 'Finish' : 'Continue'}
                    {currentStep < 3 && <ArrowRight size={20} />}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
