import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { firestoreService } from '../../services/firestoreService';
import { estimatesService } from '../../services/estimateService';
import { useEmployeeStore } from '../../features/employees/store/employeeStore';
import {
  CircleArrowLeft,
  Save,
  Send,
  Loader,
  Plus,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DEFAULT_TERMS = {
  isNonBinding: true,
  changesMayAffectPricing: true,
  approvalConstitutesAgreement: true,
  customTerms: '',
  paymentTerms: 'Payment due within 30 days of project completion.'
};

export default function EstimateGenerator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams(); // For editing existing estimates
  const { currentEmployee } = useEmployeeStore();

  const [estimateType, setEstimateType] = useState('simple'); // 'simple' or 'detailed'
  const [estimate, setEstimate] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectName: '',
    projectDescription: '',
    lineItems: [],
    taxRate: 7.5,
    discountAmount: 0,
    notes: '',
    terms: DEFAULT_TERMS,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft'
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load existing estimate if editing
  useEffect(() => {
    if (id) {
      loadEstimate(id);
    }
  }, [id]);

  const loadEstimate = async (estimateId) => {
    try {
      setLoading(true);
      const result = await firestoreService.getById('estimates', estimateId);
      
      if (result.success) {
        setEstimate(result.data);
        setEstimateType(result.data.estimateType || 'simple');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading estimate:', err);
      setLoading(false);
    }
  };

  // Calculate totals based on estimate type
  const totals = estimateType === 'simple'
    ? estimatesService.calculateSimpleTotals(estimate.lineItems, estimate.taxRate, estimate.discountAmount)
    : estimatesService.calculateDetailedTotals(estimate.lineItems, estimate.taxRate, estimate.discountAmount);

  const addLineItem = () => {
    const newItem = estimateType === 'simple'
      ? {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unit: 'each',
          unitPrice: 0,
          total: 0
        }
      : {
          id: crypto.randomUUID(),
          description: '',
          materialCost: 0,
          laborCost: 0,
          itemTotal: 0
        };

    setEstimate({
      ...estimate,
      lineItems: [...estimate.lineItems, newItem]
    });
  };

  const updateLineItem = (id, field, value) => {
    const updatedItems = estimate.lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate totals based on type
        if (estimateType === 'simple') {
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
          }
        } else {
          if (field === 'materialCost' || field === 'laborCost') {
            updated.itemTotal = (updated.materialCost || 0) + (updated.laborCost || 0);
          }
        }
        
        return updated;
      }
      return item;
    });
    
    setEstimate({ ...estimate, lineItems: updatedItems });
  };

  const removeLineItem = (id) => {
    setEstimate({
      ...estimate,
      lineItems: estimate.lineItems.filter(item => item.id !== id)
    });
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');

      if (!estimate.clientName || !estimate.projectName) {
        setError('Client name and project name are required');
        setSaving(false);
        return;
      }

      const estimateNumber = id ? estimate.estimateNumber : await estimatesService.generateEstimateNumber(currentEmployee?.companyId);

      const estimateData = {
        ...estimate,
        estimateType,
        estimateNumber,
        companyId: currentEmployee?.companyId,
        createdBy: currentEmployee?.id,
        ...totals,
        status: 'draft',
        updatedAt: new Date().toISOString()
      };

      if (!id) {
        estimateData.createdAt = new Date().toISOString();
      }

      const result = id
        ? await firestoreService.update('estimates', id, estimateData)
        : await firestoreService.create('estimates', estimateData);

      if (result.success) {
        navigate('/admin/estimates');
      } else {
        setError('Failed to save estimate');
      }

      setSaving(false);
    } catch (err) {
      console.error('Error saving estimate:', err);
      setError('Failed to save estimate');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
          >
            <CircleArrowLeft size={25} />
            {t('common.back')}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {id ? 'Edit Estimate' : 'Create Estimate'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">Generate professional estimates for clients</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        )}

        {/* We'll add the form sections here in the next steps */}
        <div className="text-center py-12">
          <p className="text-gray-600">Form sections coming next...</p>
        </div>
      </div>
    </div>
  );
}