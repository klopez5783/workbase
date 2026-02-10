import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { firestoreService } from "../../services/firestoreService";
import { estimatesService } from "../../services/estimateService";
import { useEmployeeStore } from "../../features/employees/store/employeeStore";
import {
  CircleArrowLeft,
  Save,
  Send,
  Loader,
  Plus,
  Trash2,
  User,
  X,
  Edit,
  Check,
  Briefcase,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const DEFAULT_TERMS = {
  isNonBinding: true,
  changesMayAffectPricing: true,
  approvalConstitutesAgreement: true,
  customTerms: "",
  paymentTerms: "Payment due within 30 days of project completion.",
};

export default function EstimateGenerator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams(); // For editing existing estimates
  const { currentEmployee } = useEmployeeStore();
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
  });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    projectName: "",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  const [estimateType, setEstimateType] = useState("simple"); // 'simple' or 'detailed'
  const [estimate, setEstimate] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    projectName: "",
    projectDescription: "",
    lineItems: [],
    taxRate: 7.5,
    discountAmount: 0,
    notes: "",
    terms: DEFAULT_TERMS,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    status: "draft",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load existing estimate if editing
  useEffect(() => {
    if (id) {
      loadEstimate(id);
    }
  }, [id]);

  const loadEstimate = async (estimateId) => {
    try {
      setLoading(true);
      const result = await firestoreService.getById("estimates", estimateId);

      if (result.success) {
        setEstimate(result.data);
        setEstimateType(result.data.estimateType || "simple");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading estimate:", err);
      setLoading(false);
    }
  };

  // Calculate totals based on estimate type
  const totals =
    estimateType === "simple"
      ? estimatesService.calculateSimpleTotals(
          estimate.lineItems,
          estimate.taxRate,
          estimate.discountAmount,
        )
      : estimatesService.calculateDetailedTotals(
          estimate.lineItems,
          estimate.taxRate,
          estimate.discountAmount,
        );

  const addLineItem = () => {
    const newItem =
      estimateType === "simple"
        ? {
            id: crypto.randomUUID(),
            description: "",
            quantity: 1,
            unit: "each",
            unitPrice: 0,
            total: 0,
          }
        : {
            id: crypto.randomUUID(),
            description: "",
            materialCost: 0,
            laborCost: 0,
            itemTotal: 0,
          };

    setEstimate({
      ...estimate,
      lineItems: [...estimate.lineItems, newItem],
    });
  };

  const updateLineItem = (id, field, value) => {
    const updatedItems = estimate.lineItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // Recalculate totals based on type
        if (estimateType === "simple") {
          if (field === "quantity" || field === "unitPrice") {
            updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
          }
        } else {
          if (field === "materialCost" || field === "laborCost") {
            updated.itemTotal =
              (updated.materialCost || 0) + (updated.laborCost || 0);
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
      lineItems: estimate.lineItems.filter((item) => item.id !== id),
    });
  };

  const openClientModal = () => {
    // Pre-fill form with existing data
    setClientForm({
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      clientPhone: estimate.clientPhone,
      clientAddress: estimate.clientAddress,
    });
    setShowClientModal(true);
  };

  const saveClientInfo = () => {
    if (!clientForm.clientName.trim()) {
      setError("Client name is required");
      return;
    }

    // Save to main estimate state
    setEstimate({
      ...estimate,
      clientName: clientForm.clientName,
      clientEmail: clientForm.clientEmail,
      clientPhone: clientForm.clientPhone,
      clientAddress: clientForm.clientAddress,
    });

    setShowClientModal(false);
    setError("");
  };

  // ============================================
  // PROJECT INFO HANDLERS
  // ============================================
  const openProjectModal = () => {
    setProjectForm({
      projectName: estimate.projectName,
      validUntil: estimate.validUntil,
    });
    setShowProjectModal(true);
  };

  const saveProjectInfo = () => {
    if (!projectForm.projectName.trim()) {
      setError("Project name is required");
      return;
    }

    setEstimate({
      ...estimate,
      projectName: projectForm.projectName,
      validUntil: projectForm.validUntil,
    });

    setShowProjectModal(false);
    setError("");
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError("");

      if (!estimate.clientName || !estimate.projectName) {
        setError("Client name and project name are required");
        setSaving(false);
        return;
      }

      const estimateNumber = id
        ? estimate.estimateNumber
        : await estimatesService.generateEstimateNumber(
            currentEmployee?.companyId,
          );

      const estimateData = {
        ...estimate,
        estimateType,
        estimateNumber,
        companyId: currentEmployee?.companyId,
        createdBy: currentEmployee?.id,
        ...totals,
        status: "draft",
        updatedAt: new Date().toISOString(),
      };

      if (!id) {
        estimateData.createdAt = new Date().toISOString();
      }

      const result = id
        ? await firestoreService.update("estimates", id, estimateData)
        : await firestoreService.create("estimates", estimateData);

      if (result.success) {
        navigate("/admin/estimates");
      } else {
        setError("Failed to save estimate");
      }

      setSaving(false);
    } catch (err) {
      console.error("Error saving estimate:", err);
      setError("Failed to save estimate");
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
            {t("common.back")}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {id ? "Edit Estimate" : "Create Estimate"}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Generate professional estimates for clients
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        )}

        {/* Estimate Type Selector */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Estimate Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Simple Estimate Option */}
            <label
              className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition ${
                estimateType === "simple"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="estimateType"
                value="simple"
                checked={estimateType === "simple"}
                onChange={(e) => handleEstimateTypeChange(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">
                    Simple Estimate
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Quick Job
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Best for small jobs (1-1.5 days). Single pricing column with
                  quantity and unit price.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Examples: Bathroom repaint, minor repairs, small installations
                </div>
              </div>
            </label>

            {/* Detailed Estimate Option */}
            <label
              className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition ${
                estimateType === "detailed"
                  ? "border-green-600 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="estimateType"
                value="detailed"
                checked={estimateType === "detailed"}
                onChange={(e) => handleEstimateTypeChange(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">
                    Detailed Estimate
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Large Project
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Separate Material and Labor costs. Perfect for complex
                  projects with detailed breakdowns.
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Examples: Full renovations, multi-room projects, construction
                </div>
              </div>
            </label>
          </div>

          {/* Warning when switching types with existing line items */}
          {estimate.lineItems.length > 0 && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3">
              <p className="text-yellow-900 text-sm font-medium">
                ⚠️ Changing estimate type will reset all line items. Save your
                work first if needed.
              </p>
            </div>
          )}
        </div>

        {/* STEP 2: Client Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Client Information
            </h2>

            {!estimate.clientName ? (
              <button
                onClick={openClientModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                <Plus size={18} />
                Add Client Info
              </button>
            ) : (
              <button
                onClick={openClientModal}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                <Edit size={18} />
                Edit
              </button>
            )}
          </div>

          {/* Display saved client info OR empty state */}
          {estimate.clientName ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Client Name
                </p>
                <p className="text-base font-bold text-gray-900">
                  {estimate.clientName}
                </p>
              </div>

              {estimate.clientEmail && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Email
                  </p>
                  <p className="text-base text-gray-900">
                    {estimate.clientEmail}
                  </p>
                </div>
              )}

              {estimate.clientPhone && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Phone
                  </p>
                  <p className="text-base text-gray-900">
                    {estimate.clientPhone}
                  </p>
                </div>
              )}

              {estimate.clientAddress && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Address
                  </p>
                  <p className="text-base text-gray-900">
                    {estimate.clientAddress}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center flex flex-row py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <User size={40} className="mx-auto mb-3 text-gray-400" />
              <div className="px-2">
                <p className="text-gray-600 font-medium mb-1">
                  No client information added
                </p>
                <p className="text-gray-500 text-sm">
                  Click "Add Client Info" to get started
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Project Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Project Information
            </h2>
          </div>

          <div className="">
            <div className="grid grid-cols-5 md:grid-cols-2 gap-2">
              {/* Project Name */}
              <div className="col-span-3 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={estimate.projectName}
                  onChange={(e) =>
                    setEstimate({ ...estimate, projectName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kitchen Renovation"
                  required
                />
              </div>

              {/* Valid Until Date */}
              <div className="col-span-2 md:col-span-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={estimate.validUntil}
                    onChange={(e) =>
                      setEstimate({ ...estimate, validUntil: e.target.value })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Estimate Number (Read-only if editing) */}
                {id && estimate.estimateNumber && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimate Number
                    </label>
                    <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono">
                      {estimate.estimateNumber}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-generated upon save
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Project Description */}
            <div className="mt-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={estimate.projectDescription}
                onChange={(e) =>
                  setEstimate({
                    ...estimate,
                    projectDescription: e.target.value,
                  })
                }
                rows={2}
                className="w-full h-15 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Complete kitchen renovation including new cabinets, countertops, flooring, and appliances."
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide a detailed description of the work to be performed
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Line Items</h2>
            </div>
            <button
              onClick={addLineItem}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>

          {estimate.lineItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-600 font-medium mb-2">
                No line items added yet
              </p>
              <p className="text-gray-500 text-sm">
                Click "Add Item" to start building your estimate
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Simple Estimate Layout */}
              {estimateType === "simple" && (
                <>
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-xs text-gray-700 uppercase">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Unit</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Line Items */}
                  {estimate.lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-3 items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      {/* Description */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Item description"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="0.01"
                          placeholder="1"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-2">
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            updateLineItem(item.id, "unit", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="each">Each</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="sqft">Sq Ft</option>
                          <option value="lbs">Lbs</option>
                          <option value="job">Job</option>
                          <option value="lot">Lot</option>
                        </select>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                item.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Total */}
                      <div className="col-span-1">
                        <div className="px-2 py-2 bg-gray-100 rounded text-sm font-semibold text-gray-900 text-center">
                          ${item.total.toFixed(2)}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* We'll add Detailed Layout in Step 10 */}
              {/* Detailed Estimate Layout (Material + Labor) */}
              {estimateType === "detailed" && (
                <>
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-xs text-gray-700 uppercase">
                    <div className="col-span-6">Item Description</div>
                    <div className="col-span-2 text-right">Material Cost</div>
                    <div className="col-span-2 text-right">Labor Cost</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Line Items */}
                  {estimate.lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-3 items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      {/* Description */}
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Floor, Dry Wall, Tile, etc."
                        />
                      </div>

                      {/* Material Cost */}
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            value={item.materialCost}
                            onChange={(e) =>
                              updateLineItem(
                                item.id,
                                "materialCost",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Labor Cost */}
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            value={item.laborCost}
                            onChange={(e) =>
                              updateLineItem(
                                item.id,
                                "laborCost",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="col-span-1">
                        <div className="px-2 py-2 bg-blue-50 rounded text-sm font-semibold text-blue-900 text-right">
                          ${item.itemTotal.toFixed(2)}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Material & Labor Subtotals for Detailed */}
                  {estimate.lineItems.length > 0 && (
                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                      <div className="grid grid-cols-12 gap-3 px-3">
                        <div className="col-span-6"></div>

                        {/* Material Total */}
                        <div className="col-span-2">
                          <div className="text-right">
                            <div className="text-xs font-semibold text-gray-600 mb-1">
                              Material Total:
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              ${totals.materialGrandTotal?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                        </div>

                        {/* Labor Total */}
                        <div className="col-span-2">
                          <div className="text-right">
                            <div className="text-xs font-semibold text-gray-600 mb-1">
                              Labor Total:
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              ${totals.laborGrandTotal?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2"></div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Totals Section */}
        {estimate.lineItems.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Totals</h2>
            </div>

            <div className="space-y-4 max-w-md ml-auto">
              {/* Subtotal */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 font-medium">Subtotal:</span>
                <span className="text-xl font-semibold text-gray-900">
                  ${totals.subtotal?.toFixed(2) || "0.00"}
                </span>
              </div>

              {/* Detailed Breakdown (only for detailed estimates) */}
              {estimateType === "detailed" && (
                <div className="pl-4 space-y-2 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Materials:</span>
                    <span className="font-medium text-gray-700">
                      ${totals.materialGrandTotal?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Labor:</span>
                    <span className="font-medium text-gray-700">
                      ${totals.laborGrandTotal?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
              )}

              {/* Discount */}
              <div className="flex items-center justify-between gap-4 py-2">
                <label className="text-gray-700 font-medium">Discount:</label>
                <div className="relative w-40">
                  <span className="absolute left-3 top-2.5 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={estimate.discountAmount}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        discountAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Tax Rate */}
              <div className="flex items-center justify-between gap-4 py-2">
                <label className="text-gray-700 font-medium">Tax Rate:</label>
                <div className="relative w-40">
                  <input
                    type="number"
                    value={estimate.taxRate}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.1"
                    placeholder="7.5"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">
                    %
                  </span>
                </div>
              </div>

              {/* Tax Amount */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 font-medium">Tax Amount:</span>
                <span className="text-xl font-semibold text-gray-900">
                  ${totals.taxAmount?.toFixed(2) || "0.00"}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-300 my-4"></div>

              {/* Grand Total */}
              <div className="flex items-center justify-between py-3 bg-blue-50 -mx-4 px-4 rounded-lg">
                <span className="text-xl font-bold text-gray-900">
                  Grand Total:
                </span>
                <span className="text-3xl font-bold text-blue-600">
                  ${totals.grandTotal?.toFixed(2) || "0.00"}
                </span>
              </div>

              {/* Calculation Breakdown (Helper) */}
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span>Calculation:</span>
                  <span className="font-mono">
                    ${totals.subtotal?.toFixed(2)} - $
                    {estimate.discountAmount.toFixed(2)} + $
                    {totals.taxAmount?.toFixed(2)} = $
                    {totals.grandTotal?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CLIENT INFO MODAL */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Client Information
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setError("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
                  <p className="text-red-900 font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientForm.clientName}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        clientName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Smith"
                    autoFocus
                  />
                </div>

                {/* Client Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientForm.clientEmail}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        clientEmail: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Client Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={clientForm.clientPhone}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        clientPhone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Client Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={clientForm.clientAddress}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        clientAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St, Columbus, OH 43201"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white p-6 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setError("");
                }}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveClientInfo}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Check size={18} />
                Save Client Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
