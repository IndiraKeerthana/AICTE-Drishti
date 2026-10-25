import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import { CategoryInfo } from '../types';
import { fetchCategories, createApplication, uploadDocument } from '../services/api';
import { getCategoryTitle } from './DashboardOverview';

interface ApplicationIntakeProps {
  onApplicationCreated: (newAppId: number) => void;
  onNavigateToApplications: () => void;
}

interface AttachedFile {
  categoryCode: string;
  file: File;
  error?: string;
}

export const ApplicationIntake: React.FC<ApplicationIntakeProps> = ({
  onApplicationCreated,
  onNavigateToApplications,
}) => {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Stepper: 1: Institution Info, 2: Category & Declarations, 3: Documents Checklist & Uploads, 4: Review, 5: Confirmation
  const [step, setStep] = useState<number>(1);

  // Step 1: Institution Details
  const [institutionName, setInstitutionName] = useState('Bharati Vidyapeeth College of Engineering');
  const [aictePermanentId, setAictePermanentId] = useState('1-2814092101');
  const [address, setAddress] = useState('A-4, Paschim Vihar, Rohtak Road');
  const [district, setDistrict] = useState('West Delhi');
  const [state, setState] = useState('Delhi');

  // Step 2: Category & Application Details
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('INCREASE_INTAKE');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [programme, setProgramme] = useState('ENGINEERING_AND_TECHNOLOGY');
  const [course, setCourse] = useState('Computer Science & Engineering');
  const [declaredIntake, setDeclaredIntake] = useState<number>(120);
  const [declaredLand, setDeclaredLand] = useState<number>(8.25);

  // Step 3: Document Uploads
  const [attachedFiles, setAttachedFiles] = useState<Record<string, File>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<{
    id: number;
    application_number: string;
    tracking_id: string;
    status: string;
  } | null>(null);

  // Fetch regulatory categories on mount
  useEffect(() => {
    fetchCategories()
      .then((res) => {
        setCategories(res.categories || []);
        if (res.categories && res.categories.length > 0) {
          setSelectedCategoryCode(res.categories[0].code);
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
      .finally(() => setLoadingCategories(false));
  }, []);

  const activeCategory = categories.find((c) => c.code === selectedCategoryCode);

  // File validation and attachment handler
  const handleFileChange = (categoryCode: string, file: File | null) => {
    if (!file) {
      const nextFiles = { ...attachedFiles };
      delete nextFiles[categoryCode];
      setAttachedFiles(nextFiles);

      const nextErrors = { ...fileErrors };
      delete nextErrors[categoryCode];
      setFileErrors(nextErrors);
      return;
    }

    // Validation 1: Allowed file extensions (.pdf, .png, .jpg, .jpeg)
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setFileErrors((prev) => ({
        ...prev,
        [categoryCode]: `Invalid file format (${ext}). Only PDF, PNG, and JPG documents are accepted.`,
      }));
      return;
    }

    // Validation 2: Maximum file size (25 MB)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileErrors((prev) => ({
        ...prev,
        [categoryCode]: `File exceeds maximum permissible size of 25MB (Current: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      }));
      return;
    }

    // Clear error & store file
    setFileErrors((prev) => {
      const next = { ...prev };
      delete next[categoryCode];
      return next;
    });

    setAttachedFiles((prev) => ({
      ...prev,
      [categoryCode]: file,
    }));
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    setSubmitting(true);
    setSubmissionProgress('Registering application record in central repository...');
    try {
      // 1. Create application record
      const newApp = await createApplication({
        institution_name: institutionName.trim(),
        aicte_permanent_id: aictePermanentId.trim(),
        category: selectedCategoryCode,
        academic_year: academicYear,
        declared_programme: programme,
        declared_course: course,
        declared_intake: Number(declaredIntake),
        declared_land_acres: Number(declaredLand),
      });

      // 2. Upload attached statutory documents
      const fileEntries = Object.entries(attachedFiles);
      if (fileEntries.length > 0) {
        let uploadedCount = 0;
        for (const [catCode, file] of fileEntries) {
          uploadedCount++;
          setSubmissionProgress(`Uploading document ${uploadedCount} of ${fileEntries.length}: ${catCode}...`);
          await uploadDocument(newApp.id, catCode, file);
        }
      }

      setSubmissionProgress('Scrutiny pipeline triggered. Processing results...');
      setSubmissionResult({
        id: newApp.id,
        application_number: newApp.application_number,
        tracking_id: newApp.tracking_id || `TRK-${newApp.id}`,
        status: newApp.status || 'Scrutiny in progress',
      });
      setStep(5);
    } catch (err: any) {
      alert(`Application Intake Error: ${err.message || 'Submission failed'}`);
    } finally {
      setSubmitting(false);
      setSubmissionProgress('');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wide mb-1">
            <Building2 className="w-4 h-4" />
            <span>AICTE Application Intake</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Register Institution Approval Application
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Guided statutory intake form for entering and submitting an institution's approval request for scrutiny.
          </p>
        </div>

        {step < 5 && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Step {step} of 4:</span>
            <span className="text-blue-700 font-bold">
              {step === 1 && 'Institution Details'}
              {step === 2 && 'Category & Declarations'}
              {step === 3 && 'Document Uploads'}
              {step === 4 && 'Review & Submit'}
            </span>
          </div>
        )}
      </div>

      {/* Stepper Wizard Progress */}
      {step < 5 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-700 font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                1
              </span>
              <span className="hidden sm:inline">Institution</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-700 font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                2
              </span>
              <span className="hidden sm:inline">Category & Details</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-700 font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                3
              </span>
              <span className="hidden sm:inline">Statutory Documents</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 4 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-blue-700 font-bold' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                4
              </span>
              <span className="hidden sm:inline">Review & Submit</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 1: Institution Details
          ========================================================================= */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Institution Identification</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the full recognized name and statutory AICTE Permanent ID of the institution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Institution Full Registered Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Bharati Vidyapeeth College of Engineering"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recognised Identifier / AICTE Permanent ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={aictePermanentId}
                onChange={(e) => setAictePermanentId(e.target.value)}
                placeholder="e.g. 1-2814092101"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard format: 1-XXXXXXXXX as registered in AICTE portal
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Campus Postal Address <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Sector-4, Rohtak Road"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                District <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. West Delhi"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                State / UT <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Delhi"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={!institutionName.trim() || !aictePermanentId.trim()}
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
            >
              <span>Continue to Category & Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: Category & Application Details
          ========================================================================= */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Approval Category & Application Particulars</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the statutory approval category and declare intake capacity and land area.
            </p>
          </div>

          {/* Category Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Approval Category <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.code}
                  onClick={() => setSelectedCategoryCode(cat.code)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCategoryCode === cat.code
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">{cat.title}</div>
                  <div className="text-[10px] font-mono text-blue-700 mt-1">Code: {cat.code}</div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Mandatory docs: <strong>{cat.mandatory_documents?.length || 0}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Declared Application Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Declared Programme</label>
              <input
                type="text"
                required
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Declared Course Name</label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Sanctioned Intake Capacity (Seats) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={declaredIntake}
                onChange={(e) => setDeclaredIntake(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Registered Campus Land Area (Acres) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                min={0.1}
                value={declaredLand}
                onChange={(e) => setDeclaredLand(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!declaredIntake || !declaredLand}
              onClick={() => setStep(3)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
            >
              <span>Continue to Document Checklist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: Category-Specific Required Document Checklist & Uploads
          ========================================================================= */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Statutory Document Checklist & Uploads: {getCategoryTitle(selectedCategoryCode)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload required statutory documents. PDF, PNG, and JPG formats are accepted up to 25MB per file.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
              {Object.keys(attachedFiles).length} documents attached
            </span>
          </div>

          {activeCategory && (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {activeCategory.mandatory_documents?.map((item) => {
                const docCode = typeof item === 'string' ? item : item.code;
                const docName = typeof item === 'string' ? item.replace(/_/g, ' ') : item.name;
                const docClause = typeof item === 'string' ? 'Statutory requirement under AICTE Approval Process Handbook' : (item.official_clause || 'AICTE APH Guidelines');
                const attached = attachedFiles[docCode];
                const errorMsg = fileErrors[docCode];

                return (
                  <div key={docCode} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{docName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Required
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {docClause}
                        </span>
                      </div>

                      {/* File Selector */}
                      <div className="flex items-center space-x-2">
                        {attached ? (
                          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="max-w-[180px] truncate font-medium text-[11px]">
                              {attached.name} ({(attached.size / (1024 * 1024)).toFixed(1)} MB)
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFileChange(docCode, null)}
                              className="text-slate-400 hover:text-red-600 ml-1"
                              title="Remove attached file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1.5 border border-slate-300">
                            <Upload className="w-3.5 h-3.5 text-slate-600" />
                            <span>Select Document</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => handleFileChange(docCode, e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Validation Error Message if any */}
                    {errorMsg && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
            <strong>Note on Preliminary Scrutiny:</strong> Documents attached during intake are automatically converted, text-extracted, scanned for validity dates, and verified against statutory registers upon submission.
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 shadow-sm"
            >
              <span>Review Before Submission</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: Review Before Submission
          ========================================================================= */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Review Application Before Submission</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm the institution details, approval category, and attached documents before registering into the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Institution Summary Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Institution Summary
              </span>
              <div className="font-bold text-slate-900 text-sm">{institutionName}</div>
              <div className="font-mono text-blue-700 font-bold">AICTE ID: {aictePermanentId}</div>
              <div className="text-slate-600">{address}, {district}, {state}</div>
            </div>

            {/* Approval Request Summary Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Approval Category & Declarations
              </span>
              <div className="font-bold text-slate-900">{getCategoryTitle(selectedCategoryCode)}</div>
              <div className="text-slate-700">Programme: <strong>{programme}</strong></div>
              <div className="text-slate-700">Course: <strong>{course}</strong></div>
              <div className="text-slate-700">
                Sanctioned Intake: <strong>{declaredIntake} seats</strong> | Land: <strong>{declaredLand} acres</strong>
              </div>
            </div>
          </div>

          {/* Attached Documents Summary */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2">Attached Statutory Documents ({Object.keys(attachedFiles).length})</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
              {Object.keys(attachedFiles).length === 0 ? (
                <div className="p-3 text-slate-400 italic">No files attached. Any required documents can also be uploaded during scrutiny.</div>
              ) : (
                Object.entries(attachedFiles).map(([catCode, file]) => (
                  <div key={catCode} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{catCode.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 text-[11px] block">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      Ready to Submit
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs leading-relaxed">
            <strong>Statutory Confirmation:</strong> Clicking "Submit Application" records this institutional request in the AICTE database, generates an official reference number, and automatically starts the initial automated scrutiny pipeline.
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Documents</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitApplication}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
            </button>
          </div>

          {submitting && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-blue-700 font-semibold">
              {submissionProgress}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 5: Clear Submission Confirmation
          ========================================================================= */}
      {step === 5 && submissionResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Application Registered Successfully</h3>
            <p className="text-xs text-slate-500 mt-1">
              The approval application has been saved and entered into the scrutiny workflow.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-left text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Application Reference Number:</span>
              <span className="font-mono text-sm font-bold text-blue-700">{submissionResult.application_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Unique Tracking Identifier:</span>
              <span className="font-mono text-xs text-slate-700">{submissionResult.tracking_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Institution Name:</span>
              <span className="font-bold text-slate-800">{institutionName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Approval Category:</span>
              <span className="font-semibold text-slate-700">{getCategoryTitle(selectedCategoryCode)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500 font-semibold">Initial Scrutiny Status:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Scrutiny in progress
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onApplicationCreated(submissionResult.id)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Open Scrutiny Workspace</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToApplications}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-lg text-xs transition-colors border border-slate-300"
            >
              View in Approval Applications Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
