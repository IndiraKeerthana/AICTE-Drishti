import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { CategoryInfo, DocumentDefinition } from '../types';
import { fetchCategories, fetchRules } from '../services/api';

export const RequestTypesDocumentation: React.FC = () => {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [rulesConfig, setRulesConfig] = useState<any>(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>('INCREASE_INTAKE');
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

  const handleCategoryClick = (code: string) => {
    // Clicking the currently selected category collapses it; clicking another selects it
    setSelectedCategoryCode((prev) => (prev === code ? null : code));
  };

    const activeCategory = selectedCategoryCode
      ? categories.find((c) => c.code === selectedCategoryCode) || null
      : null;

    const term = searchTerm.trim().toLowerCase();

    // Filter documents and rules within the selected category if search term is entered
    const mandatoryDocs = (activeCategory?.mandatory_documents || []).filter((item) => {
      if (!term) return true;
      const docName = typeof item === 'string' ? item : item.name || item.code;
      const clause = typeof item === 'object' ? item.official_clause || '' : '';
      const fields = typeof item === 'object' ? item.required_fields || '' : '';
      return (
        docName.toLowerCase().includes(term) ||
        clause.toLowerCase().includes(term) ||
        fields.toLowerCase().includes(term)
      );
    });

    const conditionalDocs = (activeCategory?.conditional_documents || []).filter((item) => {
      if (!term) return true;
      const docName = typeof item === 'string' ? item : item.name || item.code;
      const cond = typeof item === 'object' ? item.condition || '' : '';
      const clause = typeof item === 'object' ? item.official_clause || '' : '';
      return (
        docName.toLowerCase().includes(term) ||
        cond.toLowerCase().includes(term) ||
        clause.toLowerCase().includes(term)
      );
    });

    const optionalDocs = (activeCategory?.optional_documents || []).filter((item) => {
      if (!term) return true;
      const docName = typeof item === 'string' ? item : item.name || item.code;
      const purpose = typeof item === 'object' ? item.purpose || '' : '';
      return docName.toLowerCase().includes(term) || purpose.toLowerCase().includes(term);
    });

    const activeRules = (rulesConfig?.rules || [])
      .filter((r: any) => selectedCategoryCode && (r.category_codes || []).includes(selectedCategoryCode))
      .filter((r: any) => {
        if (!term) return true;
        return (
          (r.name || '').toLowerCase().includes(term) ||
          (r.description || '').toLowerCase().includes(term) ||
          (r.rule_code || '').toLowerCase().includes(term) ||
          (r.clause || '').toLowerCase().includes(term)
        );
      });

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

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documents, clauses, rules..."
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
                  <div className="space-y-6">
                    {/* =========================================================================
              HORIZONTAL CATEGORY ROW: Exactly three categories arranged side-by-side
              in a single horizontal row with equal widths and consistent spacing.
              ========================================================================= */}
                    <div>
                      <div className="flex items-center justify-between px-1 mb-2.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Approval Categories ({categories.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Ruleset: <strong>{rulesConfig?.ruleset_version || '2025-2026.v1'}</strong>
                        </span>
                      </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                              {categories.map((cat) => {
                                const isSelected = selectedCategoryCode === cat.code;
                                const mandCount = cat.mandatory_documents?.length || 0;

                                        return (
                                        <button
                                          key={cat.code}
                                          type="button"
                                          onClick={() => handleCategoryClick(cat.code)}
                                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${isSelected
                                              ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                                            }`}
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span
                                                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                                                  }`}
                                              >
                                                {cat.code}
                                              </span>
                        {cat.is_confirmed && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            Confirmed
                          </span>
                        )}
                      </div>

                      <h3
                        className={`font-bold text-sm leading-snug ${
                          isSelected ? 'text-blue-950' : 'text-slate-900'
                        }`}
                      >
                        {cat.title}
                      </h3>
                    </div>

                                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                              <span>
                                                <strong>{mandCount}</strong> mandatory {mandCount === 1 ? 'file' : 'files'}
                                              </span>
                                              <span
                                                className={`font-semibold text-[11px] ${isSelected ? 'text-blue-700' : 'text-slate-400'
                                                  }`}
                                              >
                                                {isSelected ? 'Active Selection' : 'Click to View'}
                                              </span>
                                            </div>
                                        </button>
                                        );
              })}
                                    </div>
                                  </div>

                                  {/* =========================================================================
              DETAILS AREA: Rendered directly BELOW the entire horizontal category row.
              ========================================================================= */}
                                  <div className="border-t border-slate-200 pt-6">
                                    {activeCategory ? (
                                      <div className="space-y-6">
                                        {/* 1. Header Specification Box */}
                                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                        {activeCategory.code}
                                                      </span>
                                                      <span className="text-xs text-slate-500">
                                                        Statutory Reference:{' '}
                                                        <strong className="text-slate-700">
                                                          {activeCategory.official_source || 'AICTE Approval Process Handbook (APH)'}
                                                        </strong>
                                                      </span>
                                                    </div>
                                                    <h3 className="text-base font-bold text-slate-900 mt-1">
                                                      {activeCategory.title}
                                                    </h3>
                                                </div>

                                                  <div className="text-xs text-slate-500 shrink-0">
                                                    Academic Year:{' '}
                                                    <strong className="text-slate-800">
                                                      {activeCategory.academic_year || '2026-2027'}
                                                    </strong>
                                                  </div>
                                                </div>

                                                {/* Request Description */}
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                                                      Request Scope
                                                    </span>
                                                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                      {activeCategory.description}
                                                    </p>
                                                </div>
                                              </div>

                                                  {/* 2. Eligibility & Statutory Pre-Conditions */}
                                                  {activeCategory.eligibility_conditions && activeCategory.eligibility_conditions.length > 0 && (
                                                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                        Eligibility & Statutory Pre-Conditions
                                                      </h4>
                                                      <div className="divide-y divide-slate-100 text-xs text-slate-700">
                                                        {activeCategory.eligibility_conditions.map((cond, idx) => (
                                                          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                                                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                                              {idx + 1}
                                                            </span>
                                                            <span className="leading-relaxed">{cond}</span>
                                                          </div>
                                                        ))}
                                                      </div>
                  </div>
                                              )}

                                                  {/* 3. Mandatory Statutory Documents Checklist */}
                                                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                      <div>
                                                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                            Mandatory Statutory Documents ({mandatoryDocs.length})
                                                          </h4>
                                                          <p className="text-[11px] text-slate-500">
                                                            Compulsory attachments required under AICTE regulations. Omission triggers automatic deficiency notice.
                                                          </p>
                                                      </div>
                                                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                                                          Compulsory
                                                        </span>
                                                    </div>

                                                        {
                                                          mandatoryDocs.length === 0 ? (
                                                            <p className="text-xs text-slate-400 py-3">No documents matching your search term.</p>
                                                          ) : (
                                                          <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs">
                                                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                                <tr>
                                                                  <th className="py-2.5 px-3">Document Name</th>
                                                                  <th className="py-2.5 px-3">Code</th>
                                                                  <th className="py-2.5 px-3">Statutory Clause</th>
                                                                  <th className="py-2.5 px-3">Expiry Validation</th>
                                                                  <th className="py-2.5 px-3">Required Information</th>
                                                                </tr>
                                                              </thead>
                                                              <tbody className="divide-y divide-slate-100">
                                                                {mandatoryDocs.map((item, idx) => {
                                                                  const doc: DocumentDefinition =
                                                                    typeof item === 'string'
                                                                      ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                                                                      : item;

                                                              return (
                                                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                                  {doc.name}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                                                  {doc.code}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600">
                                                                  {doc.official_clause || 'APH Regulation'}
                                                                </td>
                                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                                  {doc.expiry_check_required ? (
                                                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                                                      Expiry Check Required
                                                                    </span>
                                                                  ) : (
                                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                                                      Non-Expiring
                                                                    </span>
                                                                  )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs">
                                                                  {doc.required_fields || 'Standard statutory clearance verification'}
                                                                </td>
                                                              </tr>
                                                              );
                          })}
                                                            </tbody>
                                                          </table>
                    </div>
                  )}
                                                  </div>

                                                        {/* 4. Conditional Documents (if any) */}
                                                        {conditionalDocs.length > 0 && (
                                                          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                              <div>
                                                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                                    Conditional Documents ({conditionalDocs.length})
                                                                  </h4>
                                                                  <p className="text-[11px] text-slate-500">
                                                                    Applicable only when designated institutional claims or conditions apply.
                                                                  </p>
                                                              </div>
                                                              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                                                Conditional
                                                              </span>
                                                            </div>

                                                                <div className="divide-y divide-slate-100 text-xs">
                                                                  {conditionalDocs.map((item, idx) => {
                                                                    const doc: DocumentDefinition =
                                                                      typeof item === 'string'
                                                                        ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                                                                        : item;

                                                                    return (
                                                                          <div
                                                                            key={idx}
                                                                            className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                                          >
                                                                            <div>
                                                                              <span className="font-semibold text-slate-800">{doc.name}</span>
                                                                              <span className="ml-2 font-mono text-[10px] text-slate-400">
                                                                                ({doc.code})
                                                                              </span>
                                                                              {doc.condition && (
                                                                                <p className="text-[11px] text-slate-600 mt-0.5">
                                                                                  <strong>Condition:</strong> {doc.condition}
                                                                                </p>
                                                                              )}
                                                                            </div>
                                                                            {doc.official_clause && (
                                                                                <span className="text-[11px] text-slate-500 shrink-0">
                                                                                  Clause: {doc.official_clause}
                                                                                </span>
                            )}
                                                                              </div>
                                                                            );
                      })}
                                                                          </div>
                                                                        </div>
                )}

                                                                              {/* 5. Optional Documents (if any) */}
                                                                              {optionalDocs.length > 0 && (
                                                                                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                                                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                                                    <div>
                                                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                                                          Optional Supporting Documents ({optionalDocs.length})
                                                                                        </h4>
                                                                                        <p className="text-[11px] text-slate-500">
                                                                                          Supplementary documentation to assist administrative scrutiny.
                                                                                        </p>
                                                                                    </div>
                                                                                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                                                      Optional
                                                                                    </span>
                                                                                  </div>

                                                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                                                      {
                                                                                        optionalDocs.map((item, idx) => {
                                                                                          const doc: DocumentDefinition =
                                                                                            typeof item === 'string'
                                                                                              ? { code: item, name: item.replace(/_/g, ' '), is_confirmed: true }
                                                                                              : item;

                                                                                          return (
                                                                                              <div
                                                                                                key={idx}
                                                                                                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1"
                                                                                              >
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

                                                                                  {/* 6. Automated Scrutiny Rules Evaluated */}
                                                                                  {activeRules.length > 0 && (
                                                                                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                                                                                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                                                            <div>
                                                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                                                                  Automated Scrutiny Rules Evaluated ({activeRules.length})
                                                                                                </h4>
                                                                                                <p className="text-[11px] text-slate-500">
                                                                                                  Compliance checks automatically executed by AICTE-Drishti for applications in this category.
                                                                                                </p>
                                                                                            </div>
                                                                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                                                                                              Scrutiny Engine
                                                                                            </span>
                                                                                          </div>

                                                                                            <div className="divide-y divide-slate-100 text-xs">
                                                                                              {activeRules.map((rule: any, i: number) => (
                                                                                                    <div
                                                                                                      key={i}
                                                                                                      className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                                                                                                    >
                                                                                                      <div className="space-y-0.5">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                          <span className="font-bold text-slate-900">{rule.name}</span>
                                                                                                          <span
                                                                                                            className={`px-2 py-0.2 rounded text-[10px] font-bold ${rule.severity === 'CRITICAL'
                                                                                                                ? 'bg-red-50 text-red-800 border border-red-200'
                                                                                                                : rule.severity === 'HIGH'
                                                                                                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                                                                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                                                                                                              }`}
                                                                                                          >
                                                                                                            {rule.severity}
                                                                                                          </span>
                                                                                                        </div>
                                                                                                        <p className="text-slate-600 text-[11px] leading-relaxed">
                                                                                                          {rule.description}
                                                                                                        </p>
                                                                                                      </div>
                                                                                                        <div className="flex sm:flex-col sm:items-end text-[10px] text-slate-400 font-mono shrink-0 gap-1">
                                                                                                          <span>{rule.rule_code}</span>
                                                                                                          {rule.clause && <span>{rule.clause}</span>}
                                                                                                        </div>
                                                                                                      </div>
                      ))}
                                                                                                    </div>
                                                                                                  </div>
                )}
                                                                                                </div>
                                                                                              ) : (
                                                                                                <div className="p-10 bg-white rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs space-y-1">
                                                                                                  <BookOpen className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                                                                                                  <p className="font-bold text-slate-700 text-sm">No Category Selected</p>
                                                                                                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                                                                                                    Click any of the three categories above to view its statutory documentation, eligibility criteria, and mandatory checklist requirements.
                                                                                                  </p>
                                                                                                </div>
            )}
                                                                                              </div>
                                                                                            </div>
      )}
                                                                                          </div>
                                                                                          );
};
