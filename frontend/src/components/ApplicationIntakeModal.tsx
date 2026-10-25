import React, { useState } from 'react';
import { X, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApplicationIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    aicte_permanent_id: string;
    institution_name: string;
    category: string;
    academic_year: string;
    declared_programme: string;
    declared_course: string;
    declared_intake: number;
    declared_land_acres?: number;
  }) => Promise<void>;
}

export const ApplicationIntakeModal: React.FC<ApplicationIntakeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [aicteId, setAicteId] = useState('1-9988776655');
  const [instName, setInstName] = useState('Sample Institute of Technology');
  const [category, setCategory] = useState('INCREASE_INTAKE');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [course, setCourse] = useState('Computer Science & Engineering');
  const [intake, setIntake] = useState(120);
  const [land, setLand] = useState(8.25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        aicte_permanent_id: aicteId,
        institution_name: instName,
        category,
        academic_year: academicYear,
        declared_programme: 'ENGINEERING_AND_TECHNOLOGY',
        declared_course: course,
        declared_intake: Number(intake),
        declared_land_acres: Number(land),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">New Institutional Application Intake</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">AICTE Permanent ID</label>
              <input
                type="text"
                required
                value={aicteId}
                onChange={(e) => setAicteId(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Name</label>
            <input
              type="text"
              required
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Application Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INCREASE_INTAKE">Increase in Intake</option>
                <option value="NEW_INSTITUTE">New Technical Institute</option>
                <option value="EOA_REGULAR">Extension of Approval (EoA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Programme</label>
              <input
                type="text"
                disabled
                value="Engineering & Technology (UG)"
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Course / Specialization</label>
            <input
              type="text"
              required
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Declared Intake (Seats)
              </label>
              <input
                type="number"
                required
                value={intake}
                onChange={(e) => setIntake(Number(e.target.value))}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-amber-700 mt-1 font-medium">
                Baseline approved is 60 seats. Entering 120 triggers regulatory mismatch check.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Declared Land (Acres)</label>
              <input
                type="number"
                step="0.01"
                required
                value={land}
                onChange={(e) => setLand(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Ingesting...' : 'Submit for Scrutiny'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
