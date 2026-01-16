import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  CheckCircle,
  Image as ImageIcon,
  Upload,
  X,
  Download,
  Trash2,
  Eye,
  Loader,
  File,
  AlertCircle,
  Folder,
  Calendar,
  FilePenLine,
  Save
} from 'lucide-react';
import { storageService } from '../services/storageServices';
import { firestoreService } from '../services/firestoreService';

export default function ProjectDocuments({ projectId, projectName, readOnly = false }) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [error, setError] = useState('');
  const [editingDocument, setEditingDocument] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const result = await firestoreService.query('projectFiles', [
        { field: 'projectId', operator: '==', value: projectId }
      ]);

      if (result.success) {
        setDocuments(result.data);
        console.log('📄 Loaded documents:', result.data);
      } else {
        console.error('Failed to load documents:', result.error);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(t('documents.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const getDocumentsByCategory = (category) => {
    return documents.filter(doc => doc.category === category);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'contracts': return FileText;
      case 'permits': return CheckCircle;
      case 'plans': return File;
      case 'photos': return ImageIcon;
      default: return FileText;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'contracts': return 'blue';
      case 'permits': return 'green';
      case 'plans': return 'orange';
      case 'photos': return 'purple';
      default: return 'gray';
    }
  };

  const categories = [
    { id: 'contracts', name: t('documents.contracts'), description: t('documents.contractsDesc') },
    { id: 'permits', name: t('documents.permits'), description: t('documents.permitsDesc') },
    { id: 'plans', name: t('documents.plans'), description: t('documents.plansDesc') },
    { id: 'photos', name: t('documents.photos'), description: t('documents.photosDesc') },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
        <p className="text-gray-600">{t('documents.loadingDocuments')}</p>
      </div>
    );
  }

  return (
    <>
      {showToast && (
        <div
          className={`fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]
            transition-all duration-500
            ${showToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-10px]"}`}
        >
          {t('documents.updateSuccess')}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Folder className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">{t('documents.title')}</h2>
          </div>
          {!readOnly && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 text-sm"
            >
              <Upload size={16} />
              {t('common.upload')}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-900 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.id);
            const color = getCategoryColor(category.id);
            const categoryDocs = getDocumentsByCategory(category.id);
            const count = categoryDocs.length;

            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                }}
                className={`w-full flex items-center justify-between p-3 bg-${color}-50 hover:bg-${color}-100 rounded-lg transition`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`text-${color}-600`} size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-600">
                      {t('documents.fileCount', { count })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm text-${color}-600 font-medium`}>
                  {t('documents.view')}
                </span>
              </button>
            );
          })}

          {/* Upload Button for General Documents */}
          {!readOnly && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setShowUploadModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition border-2 border-dashed border-gray-300"
            >
              <Upload className="text-gray-600" size={20} />
              <span className="font-semibold text-gray-700">{t('documents.uploadNew')}</span>
            </button>
          )}
        </div>

        {/* Document Count Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            {t('documents.totalCount', { count: documents.length })}
          </p>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          projectId={projectId}
          projectName={projectName}
          preselectedCategory={selectedCategory}
          categories={categories}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedCategory(null);
          }}
          onSuccess={() => {
            setShowUploadModal(false);
            setSelectedCategory(null);
            loadDocuments();
          }}
        />
      )}

      {/* Document List Modal */}
      {selectedCategory && !showUploadModal && (
        <DocumentListModal
          category={selectedCategory}
          categoryName={categories.find(c => c.id === selectedCategory)?.name}
          documents={getDocumentsByCategory(selectedCategory)}
          readOnly={readOnly}
          onClose={() => setSelectedCategory(null)}
          onDelete={async (docId) => {
            await firestoreService.delete('projectFiles', docId);
            loadDocuments();
          }}
          onView={(doc) => setViewingDocument(doc)}
          onEdit={(doc) => setEditingDocument(doc)}
        />
      )}

      {editingDocument && (
        <DocumentEditModal
          documentData={editingDocument}
          categories={categories}
          onClose={() => setEditingDocument(null)}
          onSuccess={() => {
            setEditingDocument(null);
            loadDocuments();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
  );
}

function DocumentUploadModal({ projectId, projectName, preselectedCategory, categories, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState(preselectedCategory || 'contracts');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setError(t('documents.uploadModal.selectFileError'));
      return;
    }

    if (!title.trim()) {
      setError(t('documents.uploadModal.enterTitleError'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileName = `projects/${projectId}/documents/${category}/${Date.now()}_${file.name}`;
      const uploadResult = await storageService.upload(fileName, file);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || t('documents.uploadModal.uploadFailed'));
      }

      const documentData = {
        projectId,
        projectName,
        category,
        title: title.trim(),
        description: description.trim(),
        fileName: file.name,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const result = await firestoreService.createDocument('projectFiles', documentData);

      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.error || t('documents.uploadModal.saveFailed'));
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.message || t('documents.uploadModal.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">{t('documents.uploadModal.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleUpload} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-900 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.documentType')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.selectFile')} *
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                {t('documents.uploadModal.selectedFile', {
                  name: file.name,
                  size: (file.size / 1024 / 1024).toFixed(2)
                })}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.documentTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('documents.uploadModal.titlePlaceholder')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('documents.uploadModal.descriptionPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={20} />
                  {t('documents.uploadModal.uploading')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload size={20} />
                  {t('documents.uploadModal.uploadButton')}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DocumentListModal({ category, categoryName, documents, readOnly, onClose, onDelete, onView, onEdit }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (doc) => {
    if (!window.confirm(t('documents.listModal.deleteConfirm', { title: doc.title }))) {
      return;
    }

    setDeleting(doc.id);
    await onDelete(doc.id);
    setDeleting(null);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{categoryName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('documents.fileCount', { count: documents.length })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Document List */}
        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('documents.listModal.noDocuments')}
              </h3>
              <p className="text-gray-600">
                {readOnly
                  ? t('documents.listModal.noDocumentsReadOnly')
                  : t('documents.listModal.noDocumentsUpload')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(doc.uploadedAt)}
                        </span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span className="truncate">{doc.fileName}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onEdit(doc)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        title={t('common.edit')}
                      >
                        <FilePenLine size={18} />
                      </button>
                      <button
                        onClick={() => onView(doc)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                        title={t('documents.view')}
                      >
                        <Eye size={18} />
                      </button>
                      
                        <a href={doc.fileUrl}
                        download
                        className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                        title={t('common.download')}
                        >
                        <Download size={18} />
                      </a>
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                          title={t('common.delete')}
                        >
                          {deleting === doc.id ? (
                            <Loader className="animate-spin" size={18} />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentViewerModal({ document, onClose }) {
  const { t } = useTranslation();
  const isImage = document.fileType?.startsWith('image/');
  const isPDF = document.fileType === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{document.title}</h3>
            <p className="text-sm text-gray-600 truncate">{document.fileName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            
              <a href={document.fileUrl}
              download
              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
              title={t('common.download')}
            >
              <Download size={20} />
            </a>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {isImage ? (
            <img
              src={document.fileUrl}
              alt={document.title}
              className="max-w-full max-h-full mx-auto object-contain"
            />
          ) : isPDF ? (
            <iframe
              src={document.fileUrl}
              className="w-full h-full min-h-[600px] border-0"
              title={document.title}
            />
          ) : (
            <div className="text-center py-12">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('documents.viewModal.previewNotAvailable')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('documents.viewModal.downloadToView')}
              </p>
              
                <a href={document.fileUrl}
                download
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                <Download size={20} />
                {t('documents.viewModal.downloadFile')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentEditModal({ documentData, categories, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState(documentData.category);
  const [title, setTitle] = useState(documentData.title);
  const [description, setDescription] = useState(documentData.description || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newFile, setNewFile] = useState(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setNewFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let updatedData = {
        category,
        title: title.trim(),
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (newFile) {
        const filePath = `projects/${documentData.projectId}/documents/${category}/${Date.now()}_${newFile.name}`;
        const uploadResult = await storageService.upload(filePath, newFile);

        if (!uploadResult.success) {
          throw new Error(t('documents.editModal.uploadFailed'));
        }

        updatedData.fileUrl = uploadResult.url;
        updatedData.fileName = newFile.name;
        updatedData.fileSize = newFile.size;
        updatedData.fileType = newFile.type;
      }

      const result = await firestoreService.update(
        "projectFiles",
        documentData.id,
        updatedData
      );

      if (result.success) {
        onSuccess();
      } else {
        throw new Error(result.error || t('documents.editModal.updateFailed'));
      }
    } catch (err) {
      console.error("Update Error:", err);
      setError(err.message || t('documents.editModal.updateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">{t('documents.editModal.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-900 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.documentType')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.documentTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.uploadModal.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t('documents.editModal.replaceFile')}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="w-full px-4 py-3 border-2 rounded-lg"
            />
            {newFile && (
              <p className="text-sm text-gray-600 mt-2">
                {t('documents.editModal.newFile', {
                  name: newFile.name,
                  size: (newFile.size / 1024 / 1024).toFixed(2)
                })}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Save className="animate-pulse" size={20} />
                  {t('documents.editModal.saving')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save size={20} />
                  {t('documents.editModal.saveButton')}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}