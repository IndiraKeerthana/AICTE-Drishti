import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Eye, Hash, ShieldCheck } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentUploadAreaProps {
  applicationId: number;
  documents: DocumentItem[];
  onUploadSuccess: () => void;
  onUpload: (applicationId: number, category: string, file: File) => Promise<any>;
}

export const DocumentUploadArea: React.FC<DocumentUploadAreaProps> = ({
  applicationId,
  documents,
  onUploadSuccess,
  onUpload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('LAND_TITLE_DEED');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const categories = [
    { code: 'LAND_TITLE_DEED', label: 'Land Ownership Title Deed (Registered)' },
    { code: 'BUILDING_PLAN', label: 'Approved Master Building Plan & Schedule' },
    { code: 'FIRE_SAFETY_NOC', label: 'Fire & Life Safety Certificate (NOC)' },
    { code: 'AFFILIATION_LETTER', label: 'University Affiliation Letter' },
    { code: 'FACULTY_ROSTER', label: 'Sanctioned Faculty Roster & Registers' },
    { code: 'BALANCE_SHEET', label: 'Audited Financial Balance Sheet' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await onUpload(applicationId, selectedCategory, file);
      setUploadSuccess(`Document '${file.name}' successfully parsed and hashed with SHA-256.`);
      setFile(null);
      onUploadSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Upload Supporting Document</h3>
            <p className="text-xs text-slate-500">
              PDF and high-resolution images are parsed with PyMuPDF and screened for duplicate hashes.
            </p>
          </div>
          <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-200">
            Vault Isolation Active
          </span>
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select File (PDF, PNG, JPG — Max 25 MB)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-lg py-1 px-2 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Files are hashed with SHA-256 immediately upon ingestion to catch duplicate uploads.</span>
            </div>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Extracting & Hashing...' : 'Ingest & Verify'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">
            Ingested Documents in Vault ({documents.length})
          </h4>
          <span className="text-[11px] text-slate-400">Stored outside public web root</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No documents uploaded yet for this application. Select a file above to begin IDP extraction.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{doc.original_filename}</span>
                      <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-mono">
                        {doc.document_category}
                      </span>
                      <span className="badge-verified text-[10px]">
                        {doc.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>{doc.page_count} Page{doc.page_count > 1 ? 's' : ''}</span>
                      <span className="font-mono flex items-center gap-1 text-slate-500" title={`SHA-256: ${doc.sha256_hash}`}>
                        <Hash className="w-3 h-3 text-slate-400" />
                        {doc.sha256_hash.substring(0, 16)}...
                      </span>
                    </div>

                    {doc.extracted_text_preview && (
                      <p className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200/60 font-mono">
                        "{doc.extracted_text_preview}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <a
                    href={`/api/documents/${doc.id}/stream`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View File</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
