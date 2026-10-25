import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  ExternalLink,
  Layers
} from 'lucide-react';
import { CategoryInfo, DocumentDefinition } from '../types';
import { fetchCategories, fetchRules } from '../services/api';

export const RequestTypesDocumentation: React.FC = () => {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [rulesConfig, setRulesConfig] = useState<any>(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('INCREASE_INTAKE');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchRules()])
      .then(([catRes, rulesRes]) => {
        const cats = catRes.categories || [];
        setCategories(cats);
        setRulesConfig(rulesRes);
        if (cats.length > 0) {
          setSelectedCategoryCode(cats[0].code);
        }
      })
      .catch((err) => console.error('Failed to load rules reference:', err))
      .finally(() => setLoading(false));
  }, []);

  const activeCategory = categories.find((c) => c.code === selectedCategoryCode);

  // Filtered categories based on search term
  const filteredCategories = categories.filter((cat) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = cat.title.toLowerCase().includes(term);
    const codeMatch = cat.code.toLowerCase().includes(term);
    const descMatch = (cat.description || '').toLowerCase().includes(term);
    const docMatch = (cat.mandatory_documents || []).some((d: any) => {
      const name = typeof d === 'string' ? d : d.name || d.code;
      return name.toLowerCase().includes(term);
    });
    return titleMatch || codeMatch || descMatch || docMatch;
  });

  // Extract rules matching the selected category
  const activeRules = (rulesConfig?.rules || []).filter((r: any) =>
    (r.category_codes || []).includes(selectedCategoryCode)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-700 text-xs font-bold uppercase tracking-wide mb-1">
            <BookOpen className="w-4 h-4" />
            <span>AICTE Approval Norms Reference Library</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Request Types & Statutory Documentation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable regulatory handbook reference detailing institutional approval categories, eligibility conditions, mandatory checklists, and statutory rules.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search request types, documents, clauses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading regulatory reference handbook...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Request Type Selector List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Approval Categories ({filteredCategories.length})
              </span>
              <span className="text-[11px] text-slate-400">Ruleset: {rulesConfig?.ruleset_version || '2025-2026.v1'}</span>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                No matching request types found.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategoryCode === cat.code;
                  const mandCount = cat.mandatory_documents?.length || 0;
                  const condCount = cat.conditional_documents?.length || 0;

                  return (
                    <div
                      key={cat.code}
                      onClick={() => setSelectedCategoryCode(cat.code)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 leading-snug">
                          {cat.title}
                        </span>
                        {cat.is_confirmed ? (
                          <span className="shrink-0 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
                            Confirmed
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-1.5 py-0.5 rounded">
                            Awaiting Gazette
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-blue-700 mt-1">Code: {cat.code}</div>

                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                        <span>Mandatory: <strong>{mandCount}</strong> files</span>
                        <span>Conditional: <strong>{condCount}</strong></span>
                        <span>AY {cat.academic_year || '2026-2027'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Reference Specifications */}
          <div className="lg:col-span-8 space-y-6">
            {activeCategory ? (
              <div className="space-y-6">
                {/* 1. Header Specification Box */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3 border-b border-slate-100 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        Category Code: {activeCategory.code}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                        {activeCategory.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Statutory Reference: <strong>{activeCategory.official_source || 'AICTE Approval Process Handbook (APH)'}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Authoritative Status</span>
                      {activeCategory.is_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmed Against APH Norms</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Official Verification</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Effective Dates & Rule Version Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Applicable Academic Year</span>
                      <span className="font-bold text-slate-800">{activeCategory.academic_year || '2026-2027'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Versioned Rule Specification</span>
                      <span className="font-bold text-slate-800">{rulesConfig?.ruleset_version || '2025-2026.v1'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">Effective Tenure</span>
                      <span className="font-bold text-slate-800">
                        {rulesConfig?.effective_from ? `${rulesConfig.effective_from} to ${rulesConfig.effective_to}` : 'Academic Session 2024–2027'}
                      </span>
                    </div>
                  </div>

                  {/* Section A: What the Institution is Requesting */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                      What the Institution is Requesting
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/40 p-3 rounded-lg border border-blue-100">
                      {activeCategory.description}
                    </p>
                  </div>

                  {/* Section B: Eligibility & Applicability Conditions */}
                  {activeCategory.eligibility_conditions && activeCategory.eligibility_conditions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                        Eligibility & Statutory Pre-Conditions
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                        {activeCategory.eligibility_conditions.map((cond, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-slate-700 leading-relaxed">{cond}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mandatory Documents Checklist */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Mandatory Statutory Documents ({activeCategory.mandatory_documents?.length || 0})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Strict statutory requirement under AICTE Approval Process Handbook. Non-submission triggers automatic deficiency notice.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                      Compulsory for Submission
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {activeCategory.mandatory_documents?.map((item, idx) => {
                      const doc: DocumentDefinition =
                        typeof item === 'string'
                          ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                          : item;

                      return (
                        <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 text-xs">{doc.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                                <span>Code: {doc.code}</span>
                                {doc.official_clause && (
                                  <>
                                    <span>&bull;</span>
                                    <span>Clause: {doc.official_clause}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {doc.expiry_check_required ? (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  Expiry Check Required
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                  Perpetual / Non-Expiring
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                Confirmed
                              </span>
                            </div>
                          </div>

                          {doc.required_fields && (
                            <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-600 border border-slate-200">
                              <span className="font-semibold text-slate-700">Required Information Extracted: </span>
                              <span>{doc.required_fields}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Conditional Documents */}
                {activeCategory.conditional_documents && activeCategory.conditional_documents.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          Conditional Documents & Applicability ({activeCategory.conditional_documents.length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Statutory documents required only when specific institutional conditions or claims apply.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                        Conditional Requirement
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {activeCategory.conditional_documents.map((item, idx) => {
                        const doc: DocumentDefinition =
                          typeof item === 'string'
                            ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                            : item;

                        return (
                          <div key={idx} className="p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{doc.name}</span>
                              <span className="font-mono text-[10px] text-slate-400">Code: {doc.code}</span>
                            </div>
                            <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                              <strong>When it applies: </strong>
                              {doc.condition || 'Applicable when designated by the Competent Authority.'}
                            </div>
                            {doc.official_clause && (
                              <span className="text-[10px] text-slate-500 block">
                                Statutory Clause: {doc.official_clause}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Optional Supporting Documents */}
                {activeCategory.optional_documents && activeCategory.optional_documents.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          Optional Supporting Documents ({activeCategory.optional_documents.length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Permissible supplementary documentation where officially specified to assist administrative scrutiny.
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Optional
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {activeCategory.optional_documents.map((item, idx) => {
                        const doc: DocumentDefinition =
                          typeof item === 'string'
                            ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                            : item;

                        return (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-900 block">{doc.name}</span>
                            <span className="text-[11px] text-slate-600 block leading-tight">
                              {doc.purpose || 'Supplementary institutional verification asset.'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Automated Scrutiny Rules Evaluated */}
                {activeRules.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          Automated Scrutiny Rules Evaluated ({activeRules.length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Configured statutory compliance checks applied by VerifyAI when an application in this category is scrutinized.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                        Scrutiny Engine
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {activeRules.map((rule: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{rule.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              rule.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {rule.severity}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{rule.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 font-mono">
                            <span>Code: {rule.rule_code}</span>
                            <span>&bull;</span>
                            <span>Clause: {rule.clause || 'AICTE Regulations'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                Select an approval category from the left to view requirements and statutory documentation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
