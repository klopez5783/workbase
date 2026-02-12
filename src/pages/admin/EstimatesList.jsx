import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firestoreService } from "../../services/firestoreService";
import { useEmployeeStore } from "../../features/employees/store/employeeStore";
import {
  CircleArrowLeft,
  Plus,
  Loader,
  FileText,
  Calendar,
  DollarSign,
  User,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { estimatePDFService } from "../../services/estimatePDFService";
import { parseDate } from "../../utils/dateUtils";

export default function EstimatesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentEmployee } = useEmployeeStore();

  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, draft, sent, approved

  useEffect(() => {
    loadEstimates();
  }, [currentEmployee]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const result = await firestoreService.getAll("estimates");

      if (result.success) {
        // Filter by company
        const companyEstimates = result.data.filter(
          (estimate) => estimate.companyId === currentEmployee?.companyId,
        );

        // Sort by most recent first
        companyEstimates.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        setEstimates(companyEstimates);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading estimates:", err);
      setError("Failed to load estimates");
      setLoading(false);
    }
  };

  const deleteEstimate = async (id) => {
    if (
      !window.confirm("Delete this estimate? This action cannot be undone.")
    ) {
      return;
    }

    try {
      const result = await firestoreService.delete("estimates", id);

      if (result.success) {
        setEstimates(estimates.filter((est) => est.id !== id));
      } else {
        setError("Failed to delete estimate");
      }
    } catch (err) {
      console.error("Error deleting estimate:", err);
      setError("Failed to delete estimate");
    }
  };

  // Filter estimates by status
  const filteredEstimates =
    filterStatus === "all"
      ? estimates
      : estimates.filter((est) => est.status === filterStatus);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      expired: "bg-orange-100 text-orange-700",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage all your project estimates
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/estimates/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              New Estimate
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts" },
              { value: "sent", label: "Sent" },
              { value: "approved", label: "Approved" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                  filterStatus === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estimates List */}
        {filteredEstimates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No estimates found
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === "all"
                ? "Get started by creating your first estimate"
                : `No ${filterStatus} estimates yet`}
            </p>
            {filterStatus === "all" && (
              <button
                onClick={() => navigate("/admin/estimates/new")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create First Estimate
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEstimates.map((estimate) => (
              <div
                key={estimate.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {estimate.estimateNumber}
                  </h3>
                  <StatusBadge status={estimate.status} />
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      estimate.estimateType === "simple"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {estimate.estimateType === "simple" ? "Simple" : "Detailed"}
                  </span>
                </div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {/* Client */}
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-600">Client:</span>
                        <span className="font-semibold text-gray-900">
                          {estimate.clientName}
                        </span>
                      </div>

                      {/* Project */}
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-gray-600">Project:</span>
                        <span className="font-semibold text-gray-900">
                          {estimate.projectName}
                        </span>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-semibold text-gray-900">
                          {parseDate(estimate.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Right: Edit + Total stacked */}
                  <div className="flex flex-col items-end gap-3 ml-4 shrink-0">
                    <div className="">
                      <p className="text-xs text-gray-400 mb-0.5">Total</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${estimate.grandTotal?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
                  <div className="justify-items-center">
                    <button
                      onClick={() =>
                        estimatePDFService.previewPDF(estimate, {
                          name: "Your Company Name",
                          address: "123 Business St, Columbus, OH",
                          email: "info@yourcompany.com",
                          phone: "(555) 123-4567",
                        })
                      }
                      className="flex w-full items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                      <Eye size={18} />
                      Preview PDF
                    </button>

                    <button
                      onClick={() =>
                        estimatePDFService.downloadPDF(estimate, {
                          name: "Your Company Name",
                          address: "123 Business St, Columbus, OH",
                          email: "info@yourcompany.com",
                          phone: "(555) 123-4567",
                        })
                      }
                      className="flex mt-2 w-full items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download PDF
                    </button>
                  </div>

                  <div className="justify-items-center">
                    <button
                      onClick={() => deleteEstimate(estimate.id)}
                      className="flex w-full items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition ml-auto"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/admin/estimates/${estimate.id}/edit`)
                      }
                      className="flex mt-2 w-full items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition ml-auto"
                    >
                      <Edit size={15} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
