import { useMemo, useCallback, useState } from "react";
import { List } from "react-window";
import {
  User,
  Briefcase,
  Edit,
  Trash2,
  Check,
  Square,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * TimeEntryTable Component
 *
 * Reusable component for displaying time entries with:
 * - Grouping by employee and project
 * - Multi-select functionality
 * - Bulk actions support
 * - Optional virtualization for large datasets
 * - Print-friendly layout
 * - Pagination/limit per project
 *
 * @param {Object} props
 * @param {Array} props.entries - Array of time entry objects
 * @param {Array} props.selectedEntries - Array of selected entry IDs
 * @param {Function} props.onToggleSelect - Callback when entry selection changes
 * @param {Function} props.onSelectEmployee - Callback to select all entries for an employee
 * @param {Function} props.onSelectProject - Callback to select all entries for a project
 * @param {Function} props.onEdit - Callback when edit button clicked
 * @param {Function} props.onDelete - Callback when delete button clicked
 * @param {Function} props.onApprove - Callback when approve button clicked
 * @param {Function} props.calculateHours - Function to calculate hours between clock in/out
 * @param {Function} props.formatDate - Function to format date
 * @param {Function} props.formatTime - Function to format time
 * @param {Function} props.getEmployeeName - Function to get employee name from ID
 * @param {Function} props.getProjectName - Function to get project name from ID
 * @param {Boolean} props.useVirtualization - Enable virtual scrolling (default: auto based on count)
 * @param {Boolean} props.showActions - Show action buttons (default: true)
 * @param {Boolean} props.showSelection - Show selection checkboxes (default: true)
 * @param {Number} props.entriesPerProject - Max entries to show per project (default: no limit)
 */
export default function TimeEntryTable({
  entries = [],
  selectedEntries = [],
  onToggleSelect,
  onSelectEmployee,
  onSelectProject,
  onEdit,
  onDelete,
  onApprove,
  calculateHours,
  formatDate,
  formatTime,
  getEmployeeName,
  getProjectName,
  useVirtualization: forceVirtualization,
  showActions = true,
  showSelection = true,
  entriesPerProject = null,
}) {
  // Track expanded projects (for "Show More" functionality)
  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleProjectExpansion = (employeeName, projectName) => {
    const key = `${employeeName}-${projectName}`;
    setExpandedProjects((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Auto-enable virtualization for large datasets
  const useVirtualization =
    forceVirtualization !== undefined
      ? forceVirtualization
      : entries.length > 100;

  // Group entries by employee and project
  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const empName = getEmployeeName(entry.workerId);
      const projName = getProjectName(entry.projectId);

      if (!acc[empName]) acc[empName] = {};
      if (!acc[empName][projName]) acc[empName][projName] = [];

      acc[empName][projName].push(entry);
      return acc;
    }, {});
  }, [entries, getEmployeeName, getProjectName]);

  // Flatten entries for virtualized view
  const flatEntries = useMemo(() => {
    const flat = [];
    Object.entries(groupedEntries).forEach(([employeeName, projects]) => {
      Object.entries(projects).forEach(([projectName, projectEntries]) => {
        projectEntries.forEach((entry) => {
          flat.push({
            ...entry,
            _employeeName: employeeName,
            _projectName: projectName,
          });
        });
      });
    });
    return flat;
  }, [groupedEntries]);

  // Virtualized Row Component
  const VirtualizedRow = useCallback(
    ({ index, style }) => {
      const entry = flatEntries[index];
      const hours = calculateHours(entry.clockIn, entry.clockOut);
      const isSelected = selectedEntries.includes(entry.id);

      return (
        <div
          style={style}
          className={`flex items-center border-b border-gray-200 ${
            isSelected
              ? "bg-purple-50"
              : index % 2 === 0
                ? "bg-white"
                : "bg-gray-50"
          }`}
        >
          {showSelection && (
            <div className="w-16 px-4 py-3 text-center flex-shrink-0">
              <input
                type="checkbox"
                className="w-5 h-5 cursor-pointer"
                checked={isSelected}
                onChange={() => onToggleSelect(entry.id)}
              />
            </div>
          )}
          <div className="flex-1 px-4 py-3 text-sm text-gray-900 min-w-[120px]">
            {entry._employeeName}
          </div>
          <div className="flex-1 px-4 py-3 text-sm text-gray-900 min-w-[150px]">
            {entry._projectName}
          </div>
          <div className="flex-1 px-4 py-3 text-sm text-gray-900 min-w-[100px]">
            {formatDate(entry.clockIn)}
          </div>
          <div className="flex-1 px-4 py-3 text-sm text-gray-900 font-mono min-w-[100px]">
            {formatTime(entry.clockIn)}
          </div>
          <div className="flex-1 px-4 py-3 text-sm text-gray-900 font-mono min-w-[100px]">
            {formatTime(entry.clockOut)}
          </div>
          <div className="w-24 px-4 py-3 text-right text-sm font-bold text-gray-900 flex-shrink-0">
            {hours.toFixed(2)}
          </div>
          <div className="w-32 px-4 py-3 text-center flex-shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                entry.status === "approved"
                  ? "bg-green-100 text-green-800"
                  : entry.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {entry.status || "Pending"}
            </span>
          </div>
          {showActions && (
            <div className="w-40 px-4 py-3 text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-2">
                {entry.status !== "approved" && onApprove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(entry);
                    }}
                    className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(entry);
                    }}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(entry);
                    }}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
    },
    [
      flatEntries,
      selectedEntries,
      onToggleSelect,
      calculateHours,
      formatDate,
      formatTime,
      showSelection,
      showActions,
      onApprove,
      onEdit,
      onDelete,
    ],
  );

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <p className="text-gray-500 text-lg">No time entries to display</p>
      </div>
    );
  }

  // VIRTUALIZED VIEW (for large datasets)
  if (useVirtualization) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b-2 border-gray-300 px-4 py-3 flex items-center text-sm font-bold text-gray-900 uppercase print:hidden">
          {showSelection && <div className="w-16 flex-shrink-0">Select</div>}
          <div className="flex-1 min-w-[120px]">Employee</div>
          <div className="flex-1 min-w-[150px]">Project</div>
          <div className="flex-1 min-w-[100px]">Date</div>
          <div className="flex-1 min-w-[100px]">Time In</div>
          <div className="flex-1 min-w-[100px]">Time Out</div>
          <div className="w-24 flex-shrink-0 text-right">Hours</div>
          <div className="w-32 flex-shrink-0 text-center">Status</div>
          {showActions && (
            <div className="w-40 flex-shrink-0 text-center">Actions</div>
          )}
        </div>

        {/* Virtualized List */}
        <List
          height={600}
          itemCount={flatEntries.length}
          itemSize={60}
          width="100%"
          className="print:hidden"
        >
          {VirtualizedRow}
        </List>

        {/* Print-friendly version (hidden on screen) */}
        <div className="hidden print:block">
          {flatEntries.map((entry, index) => (
            <VirtualizedRow key={entry.id} index={index} style={{}} />
          ))}
        </div>
      </div>
    );
  }

  // GROUPED VIEW (for smaller datasets or print)
  return (
    <div className="space-y-8">
      {Object.entries(groupedEntries).map(([employeeName, projects]) => {
        const employeeTotal = Object.values(projects)
          .flat()
          .reduce(
            (sum, entry) => sum + calculateHours(entry.clockIn, entry.clockOut),
            0,
          );

        const allEmployeeEntries = Object.values(projects).flat();
        const employeeSelected = allEmployeeEntries.every((e) =>
          selectedEntries.includes(e.id),
        );

        return (
          <div
            key={employeeName}
            className="bg-white rounded-xl shadow-sm border-2 border-gray-300 overflow-hidden print:break-inside-avoid print:mb-8"
          >
            {/* Employee Header */}
            <div className="bg-gray-800 text-white p-4 print:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User size={24} />
                  <div>
                    <h2 className="text-2xl font-bold">{employeeName}</h2>
                    <p className="text-gray-300 text-sm">
                      Employee
                      {showSelection && (
                        <span className="ml-2">
                          (
                          {
                            allEmployeeEntries.filter((e) =>
                              selectedEntries.includes(e.id),
                            ).length
                          }
                          /{allEmployeeEntries.length} selected)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Total Hours</p>
                  <p className="text-3xl font-bold">
                    {employeeTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Projects */}
            {Object.entries(projects).map(([projectName, projectEntries]) => {
              const projectTotal = projectEntries.reduce(
                (sum, entry) =>
                  sum + calculateHours(entry.clockIn, entry.clockOut),
                0,
              );
              const allProjectSelected = projectEntries.every((e) =>
                selectedEntries.includes(e.id),
              );

              // Limit entries if entriesPerProject is set
              const projectKey = `${employeeName}-${projectName}`;
              const isExpanded = expandedProjects[projectKey];
              const hasLimit = entriesPerProject && entriesPerProject > 0;
              const totalEntries = projectEntries.length;
              const shouldShowMore =
                hasLimit && totalEntries > entriesPerProject;
              const displayedEntries =
                hasLimit && !isExpanded
                  ? projectEntries.slice(0, entriesPerProject)
                  : projectEntries;
              const hiddenCount = totalEntries - entriesPerProject;

              return (
                <div
                  key={projectName}
                  className="border-b-2 border-gray-200 last:border-b-0"
                >
                  {/* Project Header */}
                  <div className="bg-gray-100 p-3 flex items-center justify-between print:bg-gray-200">
                    <div className="flex items-center gap-2">
                      {showSelection && onSelectProject && (
                        <button
                          onClick={() => onSelectProject(projectEntries)}
                          className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition print:hidden"
                          title={
                            allProjectSelected
                              ? "Deselect all for this project"
                              : "Select all for this project"
                          }
                        >
                          {allProjectSelected ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      )}
                      <Briefcase size={20} className="text-gray-600" />
                      <span className="font-bold text-lg text-gray-900">
                        {projectName}
                        {showSelection && (
                          <span className="ml-2 text-sm text-gray-600">
                            (
                            {
                              projectEntries.filter((e) =>
                                selectedEntries.includes(e.id),
                              ).length
                            }
                            /{projectEntries.length})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                      {projectTotal.toFixed(2)} hrs
                    </span>
                  </div>

                  {/* Time Entries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                          {showSelection && (
                            <th
                              className="px-4 py-3 text-center print:hidden"
                              style={{ width: "60px" }}
                            >
                              <span className="text-xs font-normal text-gray-600">
                                Select
                              </span>
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                            Employee
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                            Time In
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 uppercase">
                            Time Out
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 uppercase">
                            Hours
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase print:hidden">
                            Status
                          </th>
                          {showActions && (
                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 uppercase print:hidden">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedEntries.map((entry, idx) => {
                          const hours = calculateHours(
                            entry.clockIn,
                            entry.clockOut,
                          );
                          const isSelected = selectedEntries.includes(entry.id);

                          return (
                            <tr
                              key={entry.id}
                              className={`border-b border-gray-200 ${
                                isSelected
                                  ? "bg-purple-50"
                                  : idx % 2 === 0
                                    ? "bg-white"
                                    : "bg-gray-50"
                              }`}
                            >
                              {showSelection && (
                                <td className="px-4 py-3 text-center print:hidden">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 cursor-pointer"
                                    checked={isSelected}
                                    onChange={() => onToggleSelect(entry.id)}
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3 text-lg text-gray-900 font-semibold">
                                {entry.workerName || entry.userName}
                              </td>
                              <td className="px-4 py-3 text-lg text-gray-900">
                                {formatDate(entry.clockIn)}
                              </td>
                              <td className="px-4 py-3 text-lg text-gray-900 font-mono">
                                {formatTime(entry.clockIn)}
                              </td>
                              <td className="px-4 py-3 text-lg text-gray-900 font-mono">
                                {formatTime(entry.clockOut)}
                              </td>
                              <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                                {hours.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center print:hidden">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    entry.status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : entry.status === "rejected"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {entry.status || "Pending"}
                                </span>
                              </td>
                              {showActions && (
                                <td className="px-4 py-3 text-center print:hidden">
                                  <div className="flex items-center justify-center gap-2">
                                    {entry.status !== "approved" &&
                                      onApprove && (
                                        <button
                                          onClick={() => onApprove(entry)}
                                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                          title="Approve"
                                        >
                                          <Check size={18} />
                                        </button>
                                      )}
                                    {onEdit && (
                                      <button
                                        onClick={() => onEdit(entry)}
                                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                        title="Edit"
                                      >
                                        <Edit size={18} />
                                      </button>
                                    )}
                                    {onDelete && (
                                      <button
                                        onClick={() => onDelete(entry)}
                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                        title="Delete"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Show More / Show Less Button */}
                    {shouldShowMore && (
                      <div className="bg-gray-50 p-3 border-t border-gray-200 print:hidden">
                        <button
                          onClick={() =>
                            toggleProjectExpansion(employeeName, projectName)
                          }
                          className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={20} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={20} />
                              Show {hiddenCount} More{" "}
                              {hiddenCount === 1 ? "Entry" : "Entries"}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
