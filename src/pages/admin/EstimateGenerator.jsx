import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { firestoreService } from "../../services/firestoreService";
import { estimatesService } from "../../services/estimateService";
import { useEmployeeStore } from "../../features/employees/store/employeeStore";
import {
  CircleArrowLeft,
  Save,
  Loader,
  Plus,
  User,
  X,
  Edit,
  Check,
  FileSpreadsheet,
  Eye,
  ChevronRight,
  ChevronLeft,
  Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { estimatePDFService } from "../../services/estimatePDFService";
import React from "react";

const DEFAULT_TERMS = {
  isNonBinding: true,
  changesMayAffectPricing: true,
  approvalConstitutesAgreement: true,
  customTerms: "",
  paymentTerms: "Payment due within 30 days of project completion.",
};

// ─── STEPPER ────────────────────────────────────────────────
const STEPS = [
  { number: 1, label: "Type" },
  { number: 2, label: "Details" },
  { number: 3, label: "Terms" },
  { number: 4, label: "Review" },
];

function Stepper({ currentStep }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-start w-full">
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              {/* Step (Circle + Label) */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isActive
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : step.number}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-xs font-semibold whitespace-nowrap
                  ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                        ? "text-blue-500"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-4 mx-2 transition-all
                  ${currentStep > step.number ? "bg-blue-600" : "bg-gray-200"}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── REVIEW ROW ─────────────────────────────────────────────
function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-sm font-semibold text-gray-500 w-32 shrink-0">
        {label}:
      </span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function EstimateGenerator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentEmployee } = useEmployeeStore();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showLineItemModal, setShowLineItemModal] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
  });

  const [editingLineItem, setEditingLineItem] = useState(null);
  const [lineItemForm, setLineItemForm] = useState({
    description: "",
    notes: "",
    quantity: 1,
    unit: "sqft",
    unitPrice: 0,
    total: 0,
    materialCost: 0,
    laborCost: 0,
    itemTotal: 0,
  });

  const [estimateType, setEstimateType] = useState("simple");
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

  useEffect(() => {
    if (id) loadEstimate(id);
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

  // Unit Picker Scroll
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // ─── STEP NAVIGATION ──────────────────────────────────────
  const validateStep = (step) => {
    if (step === 2) {
      if (!estimate.clientName) {
        setError("Please add client information before continuing.");
        return false;
      }
      if (!estimate.projectName) {
        setError("Project name is required.");
        return false;
      }
      if (estimate.lineItems.length === 0) {
        setError("Please add at least one line item.");
        return false;
      }
    }
    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError("");
    setCurrentStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── ESTIMATE TYPE ────────────────────────────────────────
  const handleEstimateTypeChange = (newType) => {
    if (estimate.lineItems.length > 0) {
      if (
        window.confirm(
          "Changing estimate type will clear all line items. Continue?",
        )
      ) {
        setEstimateType(newType);
        setEstimate({ ...estimate, lineItems: [] });
      }
    } else {
      setEstimateType(newType);
    }
  };

  // ─── CLIENT ───────────────────────────────────────────────
  const openClientModal = () => {
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
    setEstimate({ ...estimate, ...clientForm });
    setShowClientModal(false);
    setError("");
  };

  // ─── LINE ITEMS ───────────────────────────────────────────
  const openLineItemModal = (item = null) => {
    if (item) {
      setEditingLineItem(item);
      setLineItemForm({ ...item });
      setShowOptionalDetails(!!item.notes);
    } else {
      setEditingLineItem(null);
      setShowOptionalDetails(false);
      setLineItemForm(
        estimateType === "simple"
          ? {
              description: "",
              notes: "",
              quantity: 1,
              unit: "sqft",
              unitPrice: 0,
              total: 0,
            }
          : {
              description: "",
              notes: "",
              materialCost: 0,
              laborCost: 0,
              itemTotal: 0,
            },
      );
    }
    setShowLineItemModal(true);
  };

  const saveLineItem = () => {
    if (!lineItemForm.description.trim()) {
      setError("Item description is required");
      return;
    }
    const form = { ...lineItemForm };
    if (estimateType === "simple") {
      form.total = (form.quantity || 0) * (form.unitPrice || 0);
    } else {
      form.itemTotal = (form.materialCost || 0) + (form.laborCost || 0);
    }
    if (editingLineItem) {
      setEstimate({
        ...estimate,
        lineItems: estimate.lineItems.map((item) =>
          item.id === editingLineItem.id ? { ...form, id: item.id } : item,
        ),
      });
    } else {
      setEstimate({
        ...estimate,
        lineItems: [
          ...estimate.lineItems,
          { ...form, id: crypto.randomUUID() },
        ],
      });
    }
    setShowLineItemModal(false);
    setShowOptionalDetails(false);
    setError("");
  };

  const deleteLineItem = (itemId) => {
    if (window.confirm("Delete this line item?")) {
      setEstimate({
        ...estimate,
        lineItems: estimate.lineItems.filter((item) => item.id !== itemId),
      });
    }
  };

  // ─── SAVE ─────────────────────────────────────────────────
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
      if (!id) estimateData.createdAt = new Date().toISOString();
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

  const companyInfo = {
    name: "Your Company Name",
    address: "123 Business St, Columbus, OH",
    email: "info@yourcompany.com",
    phone: "(555) 123-4567",
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-3 grid grid-cols-5">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 font-semibold mb-4 flex items-center gap-2"
          >
            <CircleArrowLeft size={25} />
            {t("common.back")}
          </button>
          <div className="text-center col-span-3 self-auto">
            <h1 className="text-2xl font-bold text-gray-900">
              {id ? "Edit Estimate" : "Create Estimate"}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Generate professional estimates
            </p>
          </div>
        </div>

        {/* Stepper */}
        <Stepper currentStep={currentStep} />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        )}

        {/* ─── STEP 1: ESTIMATE TYPE ─── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              What type of estimate do you need?
            </h2>
            <p className="text-gray-500 text-sm mb-3">
              Choose based on the size and complexity of the job.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`relative flex items-start p-5 border-2 rounded-xl cursor-pointer transition 
                    ${estimateType === "simple" ? "border-blue-600 bg-blue-50" : "border-blue-100 hover:border-gray-300"}`}
              >
                <input
                  type="radio"
                  name="estimateType"
                  value="simple"
                  checked={estimateType === "simple"}
                  onChange={(e) => handleEstimateTypeChange(e.target.value)}
                  className="mt-1"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">
                      Simple Estimate
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      Quick Job
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Best for small jobs (1–1.5 days).{" "}
                    <b>Single pricing column</b> with quantity and unit price.
                  </p>
                </div>
              </label>

              <label
                className={`relative flex items-start p-5 border-2 rounded-xl cursor-pointer transition
                     ${estimateType === "detailed" ? "border-green-600 bg-green-50" : "border-green-100 hover:border-gray-300"}`}
              >
                <input
                  type="radio"
                  name="estimateType"
                  value="detailed"
                  checked={estimateType === "detailed"}
                  onChange={(e) => handleEstimateTypeChange(e.target.value)}
                  className="mt-1"
                />
                <div className="ml-3">
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
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ─── STEP 2: DETAILS ─── */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {/* Client Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Client Information
                </h2>
                {!estimate.clientName ? (
                  <button
                    onClick={openClientModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    <Plus size={18} /> Add Client
                  </button>
                ) : (
                  <button
                    onClick={openClientModal}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                  >
                    <Edit size={18} /> Edit
                  </button>
                )}
              </div>

              {estimate.clientName ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      Client Name
                    </p>
                    <p className="font-bold text-gray-900">
                      {estimate.clientName}
                    </p>
                  </div>
                  {estimate.clientEmail && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Email
                      </p>
                      <p className="text-gray-900">{estimate.clientEmail}</p>
                    </div>
                  )}
                  {estimate.clientPhone && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Phone
                      </p>
                      <p className="text-gray-900">{estimate.clientPhone}</p>
                    </div>
                  )}
                  {estimate.clientAddress && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Address
                      </p>
                      <p className="text-gray-900">{estimate.clientAddress}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <User size={36} className="text-gray-300 shrink-0" />
                  <div>
                    <p className="text-gray-600 font-medium">
                      No client added yet
                    </p>
                    <p className="text-gray-400 text-sm">
                      Click "Add Client" to get started
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Project Info */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Project Information
              </h2>
              <div className="grid grid-cols-5 gap-3 mb-3">
                <div className="col-span-3">
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
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={estimate.validUntil}
                    onChange={(e) =>
                      setEstimate({ ...estimate, validUntil: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Complete kitchen renovation including new cabinets, countertops..."
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Line Items ({estimate.lineItems.length})
                </h2>
                <button
                  onClick={() => openLineItemModal()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Plus size={18} /> Add Item
                </button>
              </div>

              {estimate.lineItems.length === 0 ? (
                <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileSpreadsheet
                    size={36}
                    className="text-gray-300 shrink-0"
                  />
                  <div>
                    <p className="text-gray-600 font-medium">
                      No line items yet
                    </p>
                    <p className="text-gray-400 text-sm">
                      Click "Add Item" to start building your estimate
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {estimate.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition group relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLineItem(item.id);
                        }}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition z-10"
                        title="Delete item"
                      >
                        <X size={18} />
                      </button>
                      <div
                        onClick={() => openLineItemModal(item)}
                        className="cursor-pointer pr-8"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900">
                            {item.description}
                          </h3>
                          <span className="text-lg font-bold text-gray-900">
                            $
                            {estimateType === "simple"
                              ? item.total.toFixed(2)
                              : item.itemTotal.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {estimateType === "simple" ? (
                            <>
                              {item.quantity} {item.unit} × $
                              {item.unitPrice.toFixed(2)}
                            </>
                          ) : (
                            <>
                              Material: ${item.materialCost.toFixed(2)} + Labor:
                              ${item.laborCost.toFixed(2)}
                            </>
                          )}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            {estimate.lineItems.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Totals</h2>
                <div className="space-y-3 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      ${totals.subtotal?.toFixed(2)}
                    </span>
                  </div>
                  {estimateType === "detailed" && (
                    <div className="pl-3 border-l-2 border-gray-200 space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Materials</span>
                        <span>${totals.materialGrandTotal?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor</span>
                        <span>${totals.laborGrandTotal?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600">Discount</label>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">
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
                        onFocus={(e) => e.target.select()}
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm text-gray-600">Tax Rate</label>
                    <div className="relative w-32">
                      <input
                        type="number"
                        value={estimate.taxRate}
                        onChange={(e) =>
                          setEstimate({
                            ...estimate,
                            taxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full pl-2 pr-6 py-1.5 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({estimate.taxRate}%)</span>
                    <span className="font-semibold text-gray-900">
                      ${totals.taxAmount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${totals.grandTotal?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: TERMS & NOTES ─── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Terms & Conditions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-5">
                Terms & Conditions
              </h2>
              <div className="space-y-4 mb-6">
                {[
                  {
                    key: "isNonBinding",
                    label:
                      "This estimate is non-binding and subject to final inspection",
                  },
                  {
                    key: "changesMayAffectPricing",
                    label:
                      "Changes to scope or materials may affect final pricing",
                  },
                  {
                    key: "approvalConstitutesAgreement",
                    label:
                      "Approval of this estimate constitutes agreement to proceed with work as described",
                  },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={estimate.terms[key]}
                      onChange={(e) =>
                        setEstimate({
                          ...estimate,
                          terms: { ...estimate.terms, [key]: e.target.checked },
                        })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={estimate.terms.paymentTerms}
                  onChange={(e) =>
                    setEstimate({
                      ...estimate,
                      terms: {
                        ...estimate.terms,
                        paymentTerms: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Payment due within 30 days of project completion"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custom Terms{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={estimate.terms.customTerms}
                  onChange={(e) =>
                    setEstimate({
                      ...estimate,
                      terms: { ...estimate.terms, customTerms: e.target.value },
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add any additional terms or conditions..."
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Additional Notes
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Internal only — not shown on the final estimate.
              </p>
              <textarea
                value={estimate.notes}
                onChange={(e) =>
                  setEstimate({ ...estimate, notes: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add any internal notes about this estimate..."
              />
            </div>
          </div>
        )}

        {/* ─── STEP 4: REVIEW ─── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Estimate Summary
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${estimateType === "simple" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                >
                  {estimateType === "simple" ? "Simple" : "Detailed"} Estimate
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Client
                  </h3>
                  <ReviewRow label="Name" value={estimate.clientName} />
                  <ReviewRow label="Email" value={estimate.clientEmail} />
                  <ReviewRow label="Phone" value={estimate.clientPhone} />
                  <ReviewRow label="Address" value={estimate.clientAddress} />
                </div>

                {/* Project */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Project
                  </h3>
                  <ReviewRow label="Name" value={estimate.projectName} />
                  <ReviewRow
                    label="Valid Until"
                    value={
                      estimate.validUntil
                        ? new Date(estimate.validUntil).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long", day: "numeric" },
                          )
                        : null
                    }
                  />
                  <ReviewRow
                    label="Description"
                    value={estimate.projectDescription}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Review */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Line Items
              </h2>
              <div className="space-y-2">
                {estimate.lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {estimateType === "simple" ? (
                          <>
                            {item.quantity} {item.unit} × $
                            {item.unitPrice.toFixed(2)}
                          </>
                        ) : (
                          <>
                            Material: ${item.materialCost.toFixed(2)} + Labor: $
                            {item.laborCost.toFixed(2)}
                          </>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900 ml-4">
                      $
                      {estimateType === "simple"
                        ? item.total.toFixed(2)
                        : item.itemTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 max-w-xs ml-auto text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${totals.subtotal?.toFixed(2)}</span>
                </div>
                {estimate.discountAmount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Discount</span>
                    <span>-${estimate.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({estimate.taxRate}%)</span>
                  <span>${totals.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-blue-600">
                    ${totals.grandTotal?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  estimatePDFService.previewPDF(
                    {
                      ...estimate,
                      ...totals,
                      estimateType,
                      createdAt: estimate.createdAt || new Date().toISOString(),
                      estimateNumber: estimate.estimateNumber || "DRAFT",
                    },
                    companyInfo,
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                <Eye size={18} /> Preview PDF
              </button>

              <button
                onClick={() =>
                  estimatePDFService.downloadPDF(
                    {
                      ...estimate,
                      ...totals,
                      createdAt: estimate.createdAt || new Date().toISOString(),
                      estimateNumber: estimate.estimateNumber || "DRAFT",
                    },
                    companyInfo,
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                <Download size={18} /> Download PDF
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Estimate"}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP NAVIGATION BUTTONS ─── */}
        <div
          className={`flex mt-3 ${currentStep === 1 ? "justify-end" : "justify-between"}`}
        >
          {currentStep > 1 && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          {currentStep < 4 && (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ─── CLIENT MODAL ─── */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
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
                <X size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-900 text-sm font-medium">{error}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: "clientName",
                    label: "Client Name",
                    type: "text",
                    placeholder: "John Smith",
                    required: true,
                  },
                  {
                    key: "clientEmail",
                    label: "Email",
                    type: "email",
                    placeholder: "john@example.com",
                  },
                  {
                    key: "clientPhone",
                    label: "Phone",
                    type: "tel",
                    placeholder: "(555) 123-4567",
                  },
                  {
                    key: "clientAddress",
                    label: "Address",
                    type: "text",
                    placeholder: "123 Main St, Columbus, OH 43201",
                  },
                ].map(({ key, label, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {label}{" "}
                      {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={type}
                      value={clientForm[key]}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, [key]: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder={placeholder}
                      autoFocus={key === "clientName"}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white p-6 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setError("");
                }}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveClientInfo}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Check size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LINE ITEM MODAL ─── */}
      {showLineItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLineItem ? "Edit" : "Add"} Line Item
              </h2>
              <button
                onClick={() => {
                  setShowLineItemModal(false);
                  setShowOptionalDetails(false);
                  setError("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
                  <p className="text-red-900 text-sm font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lineItemForm.description}
                  onChange={(e) =>
                    setLineItemForm({
                      ...lineItemForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Blue Pearl Granite"
                  autoFocus
                />
              </div>

              {estimateType === "simple" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={lineItemForm.quantity}
                        onChange={(e) =>
                          setLineItemForm({
                            ...lineItemForm,
                            quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {/* Unit Picker Dropdown */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Unit
                      </label>

                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setShowUnitPicker(!showUnitPicker)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left text-base flex items-center justify-between bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <span className="text-gray-900">
                          {[
                            { value: "each", label: "Each" },
                            { value: "hour", label: "Hour" },
                            { value: "day", label: "Day" },
                            { value: "week", label: "Week" },
                            { value: "job", label: "Job" },
                            { value: "sqft", label: "Sq Ft" },
                            { value: "sqyd", label: "Sq Yd" },
                            { value: "acre", label: "Acre" },
                            { value: "lf", label: "Linear Ft" },
                            { value: "ft", label: "Foot" },
                            { value: "in", label: "Inch" },
                            { value: "yd", label: "Yard" },
                            { value: "allowance", label: "Allowance" },
                            { value: "lump_sum", label: "Lump Sum" },
                            { value: "permit", label: "Permit" },
                            { value: "dump", label: "Dump Fee" },
                          ].find((o) => o.value === lineItemForm.unit)?.label ||
                            "Select unit"}
                        </span>
                        <ChevronRight
                          size={16}
                          className={`text-gray-400 transition-transform ${showUnitPicker ? "rotate-90" : ""}`}
                        />
                      </button>

                      {/* Dropdown */}
                      {showUnitPicker && (
                        <>
                          {/* Backdrop to close on outside tap */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowUnitPicker(false)}
                          />

                          {/* Picker Panel */}
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            <div className="overflow-y-auto max-h-52">
                              {[
                                {
                                  group: "Labor",
                                  options: [
                                    { value: "each", label: "Each" },
                                    { value: "hour", label: "Hour" },
                                    { value: "day", label: "Day" },
                                    { value: "week", label: "Week" },
                                    { value: "job", label: "Job" },
                                  ],
                                },
                                {
                                  group: "Area",
                                  options: [
                                    { value: "sqft", label: "Sq Ft" },
                                    { value: "sqyd", label: "Sq Yd" },
                                    { value: "acre", label: "Acre" },
                                  ],
                                },
                                {
                                  group: "Length",
                                  options: [
                                    { value: "lf", label: "Linear Ft" },
                                    { value: "ft", label: "Foot" },
                                    { value: "in", label: "Inch" },
                                    { value: "yd", label: "Yard" },
                                  ],
                                },
                                {
                                  group: "Contractor",
                                  options: [
                                    { value: "allowance", label: "Allowance" },
                                    { value: "lump_sum", label: "Lump Sum" },
                                    { value: "permit", label: "Permit" },
                                    { value: "dump", label: "Dump Fee" },
                                  ],
                                },
                              ].map((group) => (
                                <div key={group.group}>
                                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wide sticky top-0">
                                    {group.group}
                                  </div>
                                  {group.options.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setLineItemForm({
                                          ...lineItemForm,
                                          unit: opt.value,
                                        });
                                        setShowUnitPicker(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition ${
                                        lineItemForm.unit === opt.value
                                          ? "bg-blue-50 text-blue-700 font-semibold"
                                          : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                    >
                                      {opt.label}
                                      {lineItemForm.unit === opt.value && (
                                        <Check
                                          size={14}
                                          className="text-blue-600"
                                        />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        value={lineItemForm.unitPrice}
                        onChange={(e) =>
                          setLineItemForm({
                            ...lineItemForm,
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {["materialCost", "laborCost"].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {field === "materialCost"
                          ? "Material Cost"
                          : "Labor Cost"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={lineItemForm[field]}
                          onChange={(e) =>
                            setLineItemForm({
                              ...lineItemForm,
                              [field]: parseFloat(e.target.value) || 0,
                            })
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Total Preview */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Total:
                </span>
                <span className="text-xl font-bold text-blue-600">
                  $
                  {estimateType === "simple"
                    ? (lineItemForm.quantity * lineItemForm.unitPrice).toFixed(
                        2,
                      )
                    : (
                        lineItemForm.materialCost + lineItemForm.laborCost
                      ).toFixed(2)}
                </span>
              </div>

              {/* Optional Notes */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition">
                    Optional Details
                  </span>
                  <ChevronRight
                    size={18}
                    className={`text-gray-400 transition-transform ${showOptionalDetails ? "rotate-90" : ""}`}
                  />
                </button>
                {showOptionalDetails && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={lineItemForm.notes || ""}
                      onChange={(e) =>
                        setLineItemForm({
                          ...lineItemForm,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-none"
                      placeholder="Specifications, dimensions, or special instructions..."
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLineItemModal(false);
                  setShowOptionalDetails(false);
                  setError("");
                }}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveLineItem}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Check size={16} />
                {editingLineItem ? "Update" : "Add"} Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
