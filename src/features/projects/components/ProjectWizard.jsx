import { useState } from 'react';
import { Loader, MapPin, X, ArrowRight, ArrowLeft, CheckCircle, Building2, User, Home, MapPinned } from 'lucide-react';
import { useProjectStore } from '../../projects/store/projectstore';
import { firestoreService } from '../../../services/firestoreService';
import LocationPicker from './LocationPicker';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmployeeStore } from '../../employees/store/employeeStore';

export default function ProjectWizard({ onClose, existingProject = null }) {
  const { currentUser } = useAuth();
  const { currentEmployee } = useEmployeeStore();

  // Parse existing address if editing
  const parseAddress = (fullAddress) => {
    if (!fullAddress) return { street: '', apt: '', city: '', state: 'Ohio', zip: '' };
    
    const parts = fullAddress.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const street = parts[0] || '';
      const city = parts[1] || '';
      const stateZip = parts[2]?.split(' ') || [];
      const state = stateZip[0] || 'Ohio';
      const zip = stateZip[1] || '';
      
      return { street, apt: '', city, state, zip };
    }
    
    return { street: fullAddress, apt: '', city: '', state: 'Ohio', zip: '' };
  };

  const initialAddress = existingProject?.address ? parseAddress(existingProject.address) : { street: '', apt: '', city: '', state: 'Ohio', zip: '' };

  // Form data
  const [name, setName] = useState(existingProject?.name || '');
  const [streetAddress, setStreetAddress] = useState(initialAddress.street);
  const [aptSuite, setAptSuite] = useState(initialAddress.apt);
  const [city, setCity] = useState(initialAddress.city);
  const [state, setState] = useState(initialAddress.state);
  const [zipCode, setZipCode] = useState(initialAddress.zip);
  const [clientName, setClientName] = useState(existingProject?.clientName || '');
  const [clientPhone, setClientPhone] = useState(existingProject?.clientPhone || '');
  const [geofenceRadius, setGeofenceRadius] = useState(existingProject?.geofenceRadius || 100);
  const [location, setLocation] = useState(existingProject?.location || null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const { addProject, updateProject } = useProjectStore();

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

  const totalSteps = 4;

  const getFullAddress = () => {
    const addressParts = [streetAddress];
    //if (aptSuite) addressParts[0] += ` ${aptSuite}`;
    addressParts.push(city);
    addressParts.push(`${state} ${zipCode}`);
    return addressParts.filter(Boolean).join(', ');
  };

  const handleLocationSet = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowLocationPicker(false);
    if (selectedLocation.address) {
      const parsed = parseAddress(selectedLocation.address);
      setStreetAddress(parsed.street);
      setCity(parsed.city);
      setState(parsed.state);
      setZipCode(parsed.zip);
    }
  };

  // Validation for each step
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return streetAddress.trim().length > 0 && 
               city.trim().length > 0 && 
               state.trim().length > 0 && 
               zipCode.trim().length === 5;
      case 3:
        return location !== null;
      case 4:
        return clientName.trim().length > 0;
      default:
        return false;
    }
  };

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

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    const fullAddress = getFullAddress();

    const projectData = {
      name,
      address: fullAddress,
      location,
      geofenceRadius: Number(geofenceRadius),
      clientName,
      clientPhone,
      status: 'active',
      assignedEmployees: existingProject?.assignedEmployees || [],
      assignedWorkers: existingProject?.assignedWorkers || [],
      createdAt: existingProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(existingProject ? {} : { createdBy: currentEmployee?.companyId }),
    };

    try {
      if (existingProject) {
        const projectId = existingProject.firestoreId || existingProject.id;
        await firestoreService.update('projects', projectId, projectData);
        updateProject(existingProject.id, projectData);
      } else {
        const result = await firestoreService.create('projects', projectData);
        
        if (result.success) {
          addProject({
            id: result.id,
            firestoreId: result.id,
            ...projectData,
          });
        }
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step components
  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="text-blue-600" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          Let's start with the basics
        </h3>
        <p className="text-gray-600">
          What would you like to name this project?
        </p>
      </div>

      <div>
        <label className="block text-md font-semibold text-gray-700 mb-2">
          Project Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Kitchen Renovation, Main Street Office Build"
          className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-sm text-gray-500 mt-2">
          💡 Choose a name that helps you identify this project easily
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn max-h-[50vh] overflow-y-auto">
      <div className="text-center mb-4">
        
        <div className="w-15 h-15 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Home className="text-green-600" size={26} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
            Where is the job site?
        </h3>

        <p className="text-gray-600 text-md">
          Tell us the address where the work will be done
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address
          </label>
          <input
            type="text"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apartment, Suite, etc. <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={aptSuite}
            onChange={(e) => setAptSuite(e.target.value)}
            placeholder="Suite 200"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
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
              ZIP Code
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
            State
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
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">

      {!showLocationPicker ? (
        <div className="space-y-4">
            
        <div className="text-center mb-4">
            <div className="w-15 h-15 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinned className="text-purple-600" size={30} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
                Let's pin the exact location
            </h3>
            <p className="text-gray-600 text-md">
                This helps workers clock in from the right spot
            </p>
        </div>

          <button
            type="button"
            onClick={() => setShowLocationPicker(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-lg"
          >
            <MapPin size={24} />
            {location ? 'Change Location on Map' : 'Set Location on Map'}
          </button>

          {location && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <p className="text-green-900 font-semibold mb-2">
                    ✓ Location Confirmed
                  </p>
                  <p className="text-green-700 text-sm font-mono">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                  {location.address && (
                    <p className="text-green-700 text-sm mt-2">
                      {location.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
            <p className="text-blue-900 font-medium text-sm mb-1">
              Why do we need this?
            </p>
            <p className="text-blue-700 text-sm">
              Workers must be within {geofenceRadius}m ({Math.round(geofenceRadius * 3.28)}ft) of this location to clock in. This prevents time theft and ensures accuracy.
            </p>
          </div>

          {location && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clock-In Radius (optional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(e.target.value)}
                  min="10"
                  max="200"
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-gray-900 w-24">
                  {geofenceRadius}m
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Most projects use 50-150 meters depending on site size
              </p>
            </div>
          )}
        </div>
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

  const renderStep4 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="text-orange-600" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Who's the client?
        </h3>
        <p className="text-gray-600">
          Help us keep track of who this project is for
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="John Smith"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-2">
            💡 Having contact info handy helps when you need to reach them
          </p>
        </div>
      </div>

      {/* Summary Preview */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mt-8">
        <h4 className="font-bold text-gray-900 mb-4">Project Summary</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Project Name:</span>
            <span className="font-semibold text-gray-900">{name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Address:</span>
            <span className="font-semibold text-gray-900 text-right">{getFullAddress()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location Set:</span>
            <span className="font-semibold text-green-600">{location ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Client:</span>
            <span className="font-semibold text-gray-900">{clientName || 'Not set'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {existingProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={28} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
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
            <span>Basics</span>
            <span>Address</span>
            <span>Location</span>
            <span>Client</span>
          </div>
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
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {existingProject ? 'Update Project' : 'Create Project'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}