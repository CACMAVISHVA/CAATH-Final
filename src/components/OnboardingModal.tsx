import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Wand2 } from 'lucide-react';
import { Modal } from './Modal';
import { User } from '../types';
import { onboardingOrchestrator, computeActivationAnalytics } from '../domains/onboarding';
import { WorkspacePreferences } from '../services/workspacePreferencesService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  user: User;
  workspacePrefs: WorkspacePreferences;
  onWorkspacePrefsChange: (prefs: WorkspacePreferences) => void;
  onNavigate: (tab: string) => void;
}

const getStepBadge = (kind: string) => {
  if (kind === 'workflow') return 'Workflow';
  if (kind === 'tour') return 'Tour';
  if (kind === 'ai_nudge') return 'AI Nudge';
  return 'Setup';
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  user,
  workspacePrefs,
  onWorkspacePrefsChange,
  onNavigate,
}) => {
  const flow = useMemo(() => onboardingOrchestrator.getFlow(user.role), [user.role]);
  const allSteps = useMemo(() => [...flow.setupSteps, ...flow.tourSteps], [flow.setupSteps, flow.tourSteps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(() => onboardingOrchestrator.loadProgress(user.id));

  useEffect(() => {
    setProgress(onboardingOrchestrator.loadProgress(user.id));
  }, [user.id, isOpen]);

  const analytics = useMemo(() => computeActivationAnalytics(flow, progress), [flow, progress]);
  const currentStep = allSteps[Math.min(stepIndex, Math.max(0, allSteps.length - 1))];

  const completeCurrentStep = () => {
    if (!currentStep) return;
    const next = onboardingOrchestrator.markStepComplete(user, currentStep.id, progress);
    setProgress(next);
  };

  const applyProvisioning = () => {
    const nextPrefs = onboardingOrchestrator.applyWorkspaceProvisioning(user.role, workspacePrefs);
    onWorkspacePrefsChange(nextPrefs);
    setProgress(onboardingOrchestrator.markStepComplete(user, 'workspace-provisioning', progress));
  };

  const handleNext = () => {
    completeCurrentStep();
    if (stepIndex < allSteps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    onComplete();
  };

  const aiHint = useMemo(() => {
    if (user.role === 'SuperAdmin') return 'Your GST workspace is ready. Generate your first compliance intelligence scan.';
    if (user.role === 'Staff') return 'Start with assigned tasks and run a GST filing context check to reduce delay risk.';
    if (user.role === 'Client') return 'Upload key compliance documents to activate your collaboration workflow.';
    if (user.role === 'Admin') return 'Route first approval chain and enable escalation notifications for SLA safety.';
    return 'Validate control tower and security posture before activating tenant operations.';
  }, [user.role]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flow.title}
      description={flow.subtitle}
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Activation Progress</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics.completionPercent}%</p>
            <p className="text-xs text-slate-400 mt-1">{analytics.completedSteps}/{analytics.totalSteps} milestones complete</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Time To Value</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics.timeToValueMinutes}m</p>
            <p className="text-xs text-slate-400 mt-1">From activation start</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workflow Activated</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics.firstWorkflowCompleted ? 'Yes' : 'Pending'}</p>
            <p className="text-xs text-slate-400 mt-1">First operational workflow completion</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-gold/30 bg-gold/5">
          <p className="text-xs uppercase tracking-[0.2em] text-gold flex items-center gap-2"><Bot className="w-4 h-4" /> AI Activation Guidance</p>
          <p className="text-sm text-slate-200 mt-2">{aiHint}</p>
        </div>

        {currentStep && (
          <div className="p-5 rounded-2xl border border-slate-800 bg-matte-black-light">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{getStepBadge(currentStep.kind)}</p>
              {progress.completedStepIds.includes(currentStep.id) && <span className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed</span>}
            </div>
            <p className="text-lg font-bold text-white mt-2">{currentStep.title}</p>
            <p className="text-sm text-slate-400 mt-1">{currentStep.description}</p>
            {currentStep.targetTab && (
              <button
                type="button"
                onClick={() => onNavigate(currentStep.targetTab as string)}
                className="mt-3 px-3 py-2 rounded-lg border border-slate-700 text-xs font-bold text-slate-200 hover:border-gold/40"
              >
                Open {currentStep.targetTab}
              </button>
            )}
          </div>
        )}

        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white flex items-center gap-2"><Wand2 className="w-4 h-4 text-gold" />Workspace Provisioning</p>
            <button
              type="button"
              onClick={applyProvisioning}
              className="px-3 py-2 rounded-lg bg-gold text-black text-xs font-bold"
            >
              Apply Role Template
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Provision dashboards, widgets, shortcuts, command presets, and notification defaults for {user.role}.</p>
          <p className="text-xs text-slate-400 mt-2">Templates: {flow.templates.join(' | ')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {allSteps.map((step, index) => (
            <div key={step.id} className={`p-3 rounded-xl border ${index === stepIndex ? 'border-gold bg-gold/10' : 'border-slate-800 bg-slate-950/50'}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</p>
              <p className="text-sm text-white font-semibold">{step.title}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0}
            className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 disabled:opacity-40"
          >
            <ArrowLeft className="inline w-4 h-4 mr-2" /> Back
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-200">
              Skip / Resume Later
            </button>
            <button type="button" onClick={handleNext} className="px-4 py-3 rounded-xl bg-gold text-black font-bold">
              {stepIndex < allSteps.length - 1 ? 'Complete & Next' : 'Finish Activation'}
              <ArrowRight className="inline w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
