import React from 'react';
import { ArrowRight, BookOpenCheck, CheckCircle2, HelpCircle, LifeBuoy, LockKeyhole, MonitorSmartphone } from 'lucide-react';
import { User, UserRole } from '../types';

type GuideStep = { title: string; description: string; tab?: string };

const roleGuides: Record<UserRole, GuideStep[]> = {
  GodAdmin: [
    { title: 'Review registrations', description: 'Check new firms, account health and suspension status.', tab: 'firms' },
    { title: 'Control subscriptions', description: 'Review verified payments and activate eligible subscriptions.', tab: 'subscriptions' },
    { title: 'Publish official updates', description: 'Approve or reject collected regulatory updates before release.', tab: 'platform-regulatory-updates' },
  ],
  SuperAdmin: [
    { title: 'Complete your firm profile', description: 'Add the practice identity and logo used across CAATH.', tab: 'firm-profile' },
    { title: 'Add clients once', description: 'Create each client in Client Master for reuse across work, compliance and billing.', tab: 'clients' },
    { title: 'Invite your team', description: 'Create Admin, Staff and Client access with the minimum role required.', tab: 'staff' },
    { title: 'Check your plan', description: 'See trial days, limits, renewal date and payment history.', tab: 'subscription' },
  ],
  Admin: [
    { title: 'Review the task board', description: 'Assign work, follow due dates and resolve bottlenecks.', tab: 'tasks' },
    { title: 'Maintain client records', description: 'Keep identity and compliance details accurate in Client Master.', tab: 'clients' },
    { title: 'Review approvals', description: 'Process work that requires an authorised review.', tab: 'approvals' },
  ],
  Staff: [
    { title: 'Open assigned work', description: 'Use the task board as your daily starting point.', tab: 'tasks' },
    { title: 'Work with client records', description: 'Open only the clients assigned to you and update their work.', tab: 'clients' },
    { title: 'Store documents safely', description: 'Upload records to the correct client and category.', tab: 'documents' },
  ],
  Client: [
    { title: 'Check compliance', description: 'See requests and deadlines shared by your professional.', tab: 'compliance' },
    { title: 'Share documents', description: 'Upload requested records through your protected workspace.', tab: 'documents' },
    { title: 'Send a message', description: 'Keep practice communication attached to your workspace.', tab: 'messages' },
  ],
};

interface HelpCenterProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ user, onNavigate }) => {
  const steps = roleGuides[user.role];

  return (
    <div className="caath-page h-full overflow-y-auto bg-matte-black p-4 text-slate-300 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border border-slate-800 bg-matte-black-light p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-gold/10 text-gold"><HelpCircle className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Help Centre</p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Start with the work for your role</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Short, practical guidance for your CAATH workspace. Your role only shows the areas you are authorised to use.</p>
            </div>
          </div>
        </header>

        <section>
          <h3 className="text-lg font-bold text-white">Recommended first steps</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {steps.map((step, index) => (
              <button key={step.title} type="button" onClick={() => step.tab && onNavigate(step.tab)} className="group flex min-h-32 items-start gap-4 border border-slate-800 bg-matte-black-light p-5 text-left transition hover:border-gold/40">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-gold text-sm font-black text-black">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-white">{step.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-slate-400">{step.description}</span>
                </span>
                {step.tab && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-gold" />}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoCard icon={LockKeyhole} title="Protect client data" items={[
            'Use individual accounts—never share passwords.',
            'Give each person only the role they need.',
            'Confirm client authority before using government portals.',
          ]} />
          <InfoCard icon={MonitorSmartphone} title="Work without losing drafts" items={[
            'CAATH preserves supported form drafts during reloads.',
            'Complete uploads before closing the browser.',
            'Use the same account across desktop, tablet or mobile.',
          ]} />
          <InfoCard icon={BookOpenCheck} title="Use SERA responsibly" items={[
            'SERA is a planned compliance assistant, not a final authority.',
            'Verify source notifications and professional conclusions.',
            'Do not rely on AI output without professional review.',
          ]} />
        </section>

        <section className="flex flex-col gap-4 border border-gold/25 bg-gold/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div><h3 className="font-bold text-white">Need personal assistance?</h3><p className="mt-1 text-sm text-slate-400">Use the contact page and include the affected screen, time and a screenshot without passwords.</p></div>
          </div>
          <a href="/contact" className="inline-flex min-h-11 shrink-0 items-center justify-center bg-gold px-5 text-sm font-bold text-black">Contact CAATH Support</a>
        </section>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.FC<{ className?: string }>; title: string; items: string[] }> = ({ icon: Icon, title, items }) => (
  <article className="border border-slate-800 bg-matte-black-light p-5">
    <Icon className="h-5 w-5 text-gold" />
    <h3 className="mt-3 font-bold text-white">{title}</h3>
    <ul className="mt-3 space-y-3">
      {items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-slate-400"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{item}</li>)}
    </ul>
  </article>
);
