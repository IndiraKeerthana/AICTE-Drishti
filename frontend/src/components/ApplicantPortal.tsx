import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  FileCheck,
  Send,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Application, ApplicationDetail, CategoryInfo } from '../types';
import {
  fetchCategories,
  createApplication,
  uploadDocument,
  fetchApplicationDetail
} from '../services/api';
import { getPlainStatus, getCategoryTitle } from './DashboardOverview';

interface ApplicantPortalProps {
  applications: Application[];
  onRefreshApplications: () => Promise<void>;
  onSelectApplicationForReview?: (id: number) => void;
}

export const ApplicantPortal: React.FC<ApplicantPortalProps> = ({
  applications,
  onRefreshApplications,
}) => {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(applications[0]?.id || null);
  const [appDetail, setAppDetail] = useState<ApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New application intake state (Wizard)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('INCREASE_INTAKE');
  const [aicteId, setAicteId] = useState('1-9988776655');
  const [instName, setInstName] = useState('Sample Institute of Technology');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [programme, setProgramme] = useState('ENGINEERING_AND_TECHNOLOGY');
  const [course, setCourse] = useState('Computer Science & Engineering');
  const [declaredIntake, setDeclaredIntake] = useState<number>(120);
  const [declaredLand, setDeclaredLand] = useState<number>(8.25);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [submissionSuccessRef, setSubmissionSuccessRef] = useState<string | null>(null);

  // Replacement upload state for deficiency rectification
  const [activeRectifyCategory, setActiveRectifyCategory] = useState<string | null>(null);
  const [rectifyFile, setRectifyFile] = useState<File | null>(null);
  const [uploadingRectify, setUploadingRectify] = useState(false);
  const [rectifySuccessMsg, setRectifySuccessMsg] = useState<string | null>(null);
  const [rectifyError, setRectifyError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories()
      .then((res) => {
        setCategories(res.categories || []);
        if (res.categories && res.categories.length > 0) {
          setSelectedCategoryCode(res.categories[0].code);
        }
      })
      .catch((err) => console.error('Failed to load regulatory categories:', err));
  }, []);

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await fetchApplicationDetail(id);
      setAppDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      loadDetail(selectedAppId);
    } else if (applications.length > 0) {
      setSelectedAppId(applications[0].id);
    } else {
      setAppDetail(null);
    }
  }, [selectedAppId, applications]);

  const activeCategory = categories.find((c) => c.code === selectedCategoryCode);

  // Handle Application Submission Wizard
  const handleFinalSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApp(true);
    setSubmissionSuccessRef(null);
    try {
      const created = await createApplication({
        aicte_permanent_id: aicteId,
        institution_name: instName,
        category: selectedCategoryCode,
        academic_year: academicYear,
        declared_programme: programme,
        declared_course: course,
        declared_intake: Number(declaredIntake),
        declared_land_acres: Number(declaredLand),
      });

      setSubmissionSuccessRef(created.application_number);
      await onRefreshApplications();
      setSelectedAppId(created.id);
      setWizardStep(4); // Success step
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingApp(false);
    }
  };

  // Handle Replacement Document Upload
  const handleUploadRectification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId || !activeRectifyCategory || !rectifyFile) return;

    setUploadingRectify(true);
    setRectifySuccessMsg(null);
    setRectifyError(null);
    try {
      await uploadDocument(selectedAppId, activeRectifyCategory, rectifyFile);
      setRectifySuccessMsg(`Replacement document for ${activeRectifyCategory} uploaded successfully. Automated scrutiny re-run completed!`);
      setRectifyFile(null);
      setActiveRectifyCategory(null);
      await loadDetail(selectedAppId);
      await onRefreshApplications();
    } catch (err: any) {
      setRectifyError(err.message || 'Replacement upload failed');
    } finally {
      setUploadingRectify(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wide mb-1">
            <Building2 className="w-4 h-4" />
            <span>AICTE Approval Intake & Document Portal</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Institutional Application & Deficiency Rectification</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Submit approval requests, review statutory document checklists for your category, track scrutiny progress in plain administrative language, and rectify deficiency notices.
          </p>
        </div>

        <button
          onClick={() => {
            setIsSubmittingNew(!isSubmittingNew);
            setWizardStep(1);
            setSubmissionSuccessRef(null);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl shadow transition-colors text-xs shrink-0 flex items-center space-x-2"
        >
          {isSubmittingNew ? (
            <span>&larr; View Existing Applications</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Approval Application</span>
            </>
          )}
        </button>
      </div>

      {/* =========================================================================
          WIZARD: 7-Step Institutional Application Intake
          ========================================================================= */}
      {isSubmittingNew ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Wizard Step Indicators */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-semibold">
            <div className={`flex items-center space-x-2 ${wizardStep >= 1 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-bold">1</span>
              <span>Category Selection</span>
            </div>
            <div className="text-slate-300">&rarr;</div>
            <div className={`flex items-center space-x-2 ${wizardStep >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-bold">2</span>
              <span>Institution Declarations</span>
            </div>
            <div className="text-slate-300">&rarr;</div>
            <div className={`flex items-center space-x-2 ${wizardStep >= 3 ? 'text-blue-700' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-bold">3</span>
              <span>Required Documents & Review</span>
            </div>
            <div className="text-slate-300">&rarr;</div>
            <div className={`flex items-center space-x-2 ${wizardStep === 4 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">4</span>
              <span>Submission Reference</span>
            </div>
          </div>

          {/* Step 1: Category Selection */}
          {wizardStep === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Step 1: Select AICTE Approval Category</h3>
                <p className="text-slate-500 mt-0.5">
                  Choose the category that applies to your institutional application. Required document checklists are automatically populated from active versioned rules.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {categories.map((cat) => (
                  <div
                    key={cat.code}
                    onClick={() => setSelectedCategoryCode(cat.code)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedCategoryCode === cat.code
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-sm">{cat.title}</span>
                    <span className="text-[11px] font-mono text-blue-700 mt-1 block">Code: {cat.code}</span>
                    <div className="mt-3 text-[11px] text-slate-600">
                      <strong>Mandatory Documents:</strong> {cat.mandatory_documents?.length || 0} statutory files
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>Proceed to Institutional Declarations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Institution Declarations */}
          {wizardStep === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Step 2: Enter Application & Institution Information</h3>
                <p className="text-slate-500 mt-0.5">
                  Declare your sanctioned intake, programme, course, and campus land.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AICTE Permanent Institution ID</label>
                  <input
                    type="text"
                    required
                    value={aicteId}
                    onChange={(e) => setAicteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution Full Registered Name</label>
                  <input
                    type="text"
                    required
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Programme</label>
                  <input
                    type="text"
                    required
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Course</label>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Intake Capacity (Seats)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={declaredIntake}
                    onChange={(e) => setDeclaredIntake(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Land (Registered Acres)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0.1}
                    value={declaredLand}
                    onChange={(e) => setDeclaredLand(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  &larr; Back to Category
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>Review Document Checklist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Required Documents Checklist & Review */}
          {wizardStep === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Step 3: Statutory Document Checklist for {getCategoryTitle(selectedCategoryCode)}
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Verify the mandatory documents required for this application category. Once created, you will upload documents or replacement files directly in your tracking workspace.
                </p>
              </div>

              {activeCategory && (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-50 p-3 font-semibold text-slate-700">
                    Mandatory Statutory Documents ({activeCategory.mandatory_documents?.length || 0})
                  </div>
                  {activeCategory.mandatory_documents?.map((docCode, i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{docCode.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-slate-500 block">Required by AICTE APH Chapter Regulations</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold text-[10px]">
                        Required
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 leading-relaxed">
                <strong>Submission Notice:</strong> Clicking "Submit Application to AICTE" records your application in the central intake repository and immediately triggers the automatic preliminary scrutiny pipeline.
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  &larr; Back to Declarations
                </button>
                <button
                  type="button"
                  disabled={submittingApp}
                  onClick={handleFinalSubmitApplication}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingApp ? 'Submitting to AICTE...' : 'Submit Application to AICTE'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Submission Success */}
          {wizardStep === 4 && (
            <div className="text-center py-8 space-y-4 max-w-md mx-auto text-xs">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Application Submitted Successfully</h3>
              <p className="text-slate-600">
                Your application has been received by AICTE and assigned an official reference number:
              </p>
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-base font-bold text-blue-800">
                {submissionSuccessRef}
              </div>
              <p className="text-[11px] text-slate-500">
                Preliminary automated scrutiny has been initiated. You can now view your checklist, upload statutory documents, and track officer review.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmittingNew(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg transition-colors inline-block"
              >
                Go to Application Tracking Workspace
              </button>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
            TRACKING: Applications Table & Deficiency Rectification Workspace
            ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Applications List for this Institution */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
              Your Applications ({applications.length})
            </h3>

            {applications.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                No applications registered for your institution.
              </div>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => {
                  const plain = getPlainStatus(app.status, app.final_decision);
                  const isSelected = selectedAppId === app.id;

                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-blue-800">
                          {app.application_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${plain.badgeClass}`}>
                          {plain.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                        {getCategoryTitle(app.category)}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        <span>Intake: <strong>{app.declared_intake} seats</strong></span>
                        <span>AY {app.academic_year}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Tracking & Deficiency Rectification Workspace */}
          <div className="lg:col-span-8 space-y-5">
            {appDetail ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 text-xs">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {appDetail.application_number}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{appDetail.institution.name}</h3>
                    <p className="text-slate-500 text-[11px]">
                      Permanent ID: {appDetail.institution.aicte_permanent_id} | Category: {getCategoryTitle(appDetail.category)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold mt-0.5 ${getPlainStatus(appDetail.status, appDetail.final_decision).badgeClass}`}>
                      {getPlainStatus(appDetail.status, appDetail.final_decision).label}
                    </span>
                  </div>
                </div>

                {/* Outstanding Deficiency Notices */}
                {appDetail.alerts.some(a => a.alert_type === 'DEFICIENCY_NOTICE') && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-amber-900 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Official AICTE Deficiency Notice</span>
                    </div>
                    {appDetail.alerts.filter(a => a.alert_type === 'DEFICIENCY_NOTICE').map((a, i) => (
                      <p key={i} className="text-amber-800 leading-relaxed font-medium">
                        {a.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Document Upload / Replacement Notification */}
                {rectifySuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{rectifySuccessMsg}</span>
                  </div>
                )}

                {rectifyError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {rectifyError}
                  </div>
                )}

                {/* Statutory Document Checklist & Rectification Upload */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Statutory Document Checklist & Uploads</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {appDetail.documents.length} of {appDetail.document_checklist.length} submitted
                    </span>
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {appDetail.document_checklist.map((item, idx) => {
                      const plainStatus = getPlainStatus(item.status);
                      const isRectifying = activeRectifyCategory === item.category_code;

                      return (
                        <div key={idx} className="p-3.5 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900">{item.document_name}</span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{item.is_mandatory ? 'Mandatory' : 'Optional'}</span>
                                <span>&bull;</span>
                                <span>{item.is_submitted ? `Uploaded (${item.original_filename})` : 'Not yet uploaded'}</span>
                                {item.validity_info && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{item.validity_info}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                                item.status === 'MISSING' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.status.replace(/_/g, ' ')}
                              </span>

                              {item.stream_url && (
                                <a
                                  href={item.stream_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                                >
                                  View
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setActiveRectifyCategory(isRectifying ? null : item.category_code)}
                                className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors"
                              >
                                {item.is_submitted ? 'Upload Replacement' : 'Upload Document'}
                              </button>
                            </div>
                          </div>

                          {/* Inline File Upload Form when active */}
                          {isRectifying && (
                            <form
                              onSubmit={handleUploadRectification}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 animate-in fade-in"
                            >
                              <div className="flex items-center space-x-2 flex-1">
                                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  required
                                  onChange={(e) => setRectifyFile(e.target.files?.[0] || null)}
                                  className="text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 text-slate-600"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={uploadingRectify || !rectifyFile}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
                              >
                                {uploadingRectify ? 'Uploading & Scrutinizing...' : 'Submit File'}
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                Select an application from the left to view status and upload documents.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
