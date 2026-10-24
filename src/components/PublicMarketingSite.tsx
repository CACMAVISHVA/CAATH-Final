import React from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BrainCircuit,
  Building2,
  Check,
  Download,
  FileCheck2,
  FileLock2,
  Landmark,
  IndianRupee,
  LayoutDashboard,
  Menu,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { CookieConsentBanner } from './CookieConsentBanner';

type PublicMarketingSiteProps = {
  isSignedIn: boolean;
  onLogin: () => void;
  onOpenWorkspace: () => void;
  onChoosePlan: (plan: 'CAATH Practice OS') => void;
  onRenew: () => void;
};

const plan = {
  name: 'CAATH Practice OS' as const,
  monthly: '₹1,499',
  description: 'One complete operating system for your entire practice.',
  features: ['Unlimited clients and team members', 'Client, task and secure document management', 'GST, compliance and notice workflows', 'Billing, reports and profitability visibility', 'Audit trail and role-based controls', 'Recurring workflow automation'],
};

const capabilities = [
  { icon: Users, title: 'One client command centre', text: 'Keep client profiles, responsibilities, work status and communication context together.' },
  { icon: FileCheck2, title: 'Compliance workflows', text: 'Run GST, notices, approvals and recurring practice work through governed workflows.' },
  { icon: LayoutDashboard, title: 'Role-based operations', text: 'Give Super Admins, Admins, Staff and Clients the workspace appropriate to their responsibility.' },
  { icon: Landmark, title: 'Government portal desk', text: 'Open the correct official portal for each client while keeping OTP and CAPTCHA completion on the government site.' },
  { icon: FileLock2, title: 'Private document vault', text: 'Organise practice documents with controlled access, lifecycle actions and audit visibility.' },
  { icon: BellRing, title: 'Alerts and regulatory updates', text: 'Bring operational notifications and centrally verified regulatory publications into one place.' },
  { icon: Repeat2, title: 'Recurring work automation', text: 'Standardise recurring compliance work, deadlines, reminders and ownership across the firm.' },
  { icon: IndianRupee, title: 'Billing and profitability', text: 'Connect completed work to invoices, receivables and practice-level profitability visibility.' },
  { icon: Download, title: 'Export-ready records', text: 'Keep operational history searchable and ready for controlled reporting, review and export.' },
];

export const PublicMarketingSite: React.FC<PublicMarketingSiteProps> = ({
  isSignedIn,
  onLogin,
  onOpenWorkspace,
  onChoosePlan,
  onRenew,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const previousTitle = document.title;
    document.title = 'CAATH – Chartered Artificial Assistant for Technical Hegemony';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    if (description) {
      description.content = 'CAATH — Chartered Artificial Assistant for Technical Hegemony — brings clients, tasks, GST workflows, notices, documents, billing, approvals and practice operations into one secure workspace.';
    }
    return () => {
      document.title = previousTitle.includes('Practice Management OS') ? 'CAATH – Secure Practice OS' : previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  const moveTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white selection:bg-gold/30">
      <a href="#main-content" className="sr-only z-[110] bg-gold px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button type="button" onClick={() => moveTo('home')} className="flex items-center gap-3" aria-label="CAATH home">
            <Logo size="md" />
            <div className="text-left">
              <div className="text-lg font-black tracking-tight">CAATH</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">Technical Hegemony</div>
            </div>
          </button>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex" aria-label="Main navigation">
            <button type="button" onClick={() => moveTo('platform')} className="hover:text-gold">Platform</button>
            <button type="button" onClick={() => moveTo('sera')} className="hover:text-gold">SERA</button>
            <button type="button" onClick={() => moveTo('security')} className="hover:text-gold">Security</button>
            <button type="button" onClick={() => moveTo('pricing')} className="hover:text-gold">Pricing</button>
            <button type="button" onClick={onRenew} className="hover:text-gold">Renew</button>
            <a href="/contact" className="hover:text-gold">Contact</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button type="button" onClick={isSignedIn ? onOpenWorkspace : onLogin} className="border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:border-gold/60 hover:text-gold">
              {isSignedIn ? 'Open Workspace' : 'Login'}
            </button>
            <button type="button" onClick={() => onChoosePlan('CAATH Practice OS')} className="bg-gold px-4 py-2 text-sm font-black text-black hover:bg-gold-light">
              Start Free Trial
            </button>
          </div>

          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="p-2 text-slate-200 md:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0d1016] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4 text-left text-sm font-bold text-slate-200">
              <button type="button" onClick={() => moveTo('platform')}>Platform</button>
              <button type="button" onClick={() => moveTo('sera')}>SERA</button>
              <button type="button" onClick={() => moveTo('security')}>Security</button>
              <button type="button" onClick={() => moveTo('pricing')}>Pricing</button>
              <button type="button" onClick={onRenew}>Renew subscription</button>
              <a href="/contact">Contact</a>
              <button type="button" onClick={isSignedIn ? onOpenWorkspace : onLogin} className="border border-white/15 px-4 py-3">
                {isSignedIn ? 'Open Workspace' : 'Customer Login'}
              </button>
              <button type="button" onClick={() => onChoosePlan('CAATH Practice OS')} className="bg-gold px-4 py-3 text-black">Start 15-Day Free Trial</button>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" tabIndex={-1}>
        <section id="home" className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(200,168,90,0.16),transparent_34rem)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-gold-light">
                <Sparkles className="h-4 w-4" /> 15-day free trial · No payment required
              </div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-gold">Chartered Artificial Assistant for Technical Hegemony</p>
              <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Run your professional practice with <span className="gold-text-gradient">clarity and control.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
                CAATH connects clients, assignments, recurring compliance, GST work, notices, documents, billing, approvals and team accountability in one secure operating system for CA, CMA, CS, ITP, STP and other professional practices.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => onChoosePlan('CAATH Practice OS')} className="flex items-center justify-center gap-2 bg-gold px-6 py-3.5 font-black text-black hover:bg-gold-light">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={isSignedIn ? onOpenWorkspace : onLogin} className="border border-white/15 px-6 py-3.5 font-bold text-white hover:border-gold/60 hover:text-gold">
                  {isSignedIn ? 'Continue to Workspace' : 'Existing customer login'}
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
                {['15 days free', 'No approval wait', 'No card required', 'No automatic debit'].map((item) => (
                  <span key={item} className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-400" />{item}</span>
                ))}
              </div>
            </div>

            <div className="relative self-center border border-white/10 bg-[#11141b] p-4 shadow-2xl shadow-black/60">
              <div className="border border-white/10 bg-[#151922] p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Practice command centre</p>
                    <p className="mt-1 text-xl font-black">Today at a glance</p>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-emerald-300"><span className="h-2 w-2 bg-emerald-400" /> Live</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[['Open work', '42'], ['Due soon', '8'], ['Approvals', '11']].map(([label, value]) => (
                    <div key={label} className="border border-white/10 bg-black/20 p-4">
                      <p className="text-2xl font-black text-white">{value}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-3">
                  {[
                    ['GSTR-3B variance review', 'Review today', 'High'],
                    ['Notice response draft', 'Awaiting evidence', 'Medium'],
                    ['Client onboarding closure', 'In progress', 'Normal'],
                  ].map(([title, status, priority]) => (
                    <div key={title} className="flex items-center justify-between gap-4 border border-white/10 bg-black/20 p-4">
                      <div><p className="font-bold">{title}</p><p className="mt-1 text-xs text-slate-500">{status}</p></div>
                      <span className="text-xs font-bold text-gold">{priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="scroll-mt-20 border-b border-white/10 bg-[#0d1016] py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">One connected platform</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Everything your practice needs to move work forward.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">Replace scattered follow-ups and disconnected records with recurring workflows, clear ownership, client collaboration, billing visibility and governed actions.</p>
            </div>
            <div className="mt-12 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, text }) => (
                <article key={title} className="bg-[#0d1016] p-7">
                  <div className="flex h-11 w-11 items-center justify-center border border-gold/30 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="sera" className="scroll-mt-20 border-b border-white/10 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div className="border border-gold/25 bg-[radial-gradient(circle_at_top_left,rgba(200,168,90,0.18),transparent_65%)] p-8">
              <div className="flex h-14 w-14 items-center justify-center border border-gold/40 bg-gold/10 text-gold">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-gold">Planned CAATH intelligence</p>
              <h2 className="mt-3 text-5xl font-black gold-text-gradient">Meet SERA</h2>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-300">Self Evolving Revolutionary Assistant</p>
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight sm:text-4xl">A future AI companion for compliance and practice knowledge.</h3>
              <p className="mt-5 text-lg leading-8 text-slate-400">
                SERA is planned as CAATH’s intelligent assistant for practice-related questions, compliance guidance, regulatory notifications, judgments and case-study research—all available within the working context of your practice.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {['Ask compliance and practice questions', 'Find relevant notifications and updates', 'Explore judgments and case studies', 'Receive contextual workflow assistance'].map((item) => (
                  <div key={item} className="flex items-start gap-3 border border-white/10 bg-[#11141b] p-4 text-sm font-bold text-slate-200">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{item}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-amber-200">SERA is a planned capability. Its final scope and release will evolve from real CAATH market feedback.</p>
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-20 border-b border-white/10 py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Security by design</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">Control access without slowing down the practice.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">CAATH separates platform, firm, staff and client responsibilities and maintains auditable activity across operational workflows.</p>
            </div>
            <div className="grid gap-3">
              {[
                'Role-based workspace permissions',
                'Firm-level data isolation',
                'Private document access controls',
                'Authentication and login audit history',
                'Approval gates for governed actions',
                'Government credentials excluded from the quick-launch desk',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 border border-white/10 bg-[#11141b] p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                  <span className="font-bold text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-b border-white/10 bg-[#0d1016] py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Simple subscription pricing</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">One price. Everything your practice needs.</h2>
              <p className="mt-5 text-slate-400">Create your workspace without payment details. After your 15-day trial, continue with CAATH Practice OS for one simple monthly price. No tiers, per-user fees or automatic debit.</p>
            </div>
            <div className="mx-auto mt-12 max-w-xl">
              <article className="relative flex flex-col border border-gold bg-gold/[0.06] p-7 sm:p-9">
                <span className="absolute right-5 top-0 -translate-y-1/2 bg-gold px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">Launch price</span>
                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{plan.description}</p>
                <div className="mt-6"><span className="text-5xl font-black">{plan.monthly}</span><span className="text-slate-500"> / month</span></div>
                <p className="mt-2 text-sm text-gold">₹1,499/month + applicable GST · flat firm price · no per-user fees · cancel any time</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">The total, including applicable taxes, is shown before you confirm payment. No setup, auto-renewal or hidden fees.</p>
                <ul className="my-7 grid gap-3 sm:grid-cols-2">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm text-slate-300"><Check className="h-4 w-4 shrink-0 text-emerald-400" />{feature}</li>)}
                </ul>
                <button type="button" onClick={() => onChoosePlan(plan.name)} className="bg-gold px-5 py-3 font-black text-black hover:bg-gold-light">
                  Start your 15-day free trial
                </button>
              </article>
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border border-white/10 bg-[#11141b] p-6 sm:flex-row">
              <div><p className="font-black">Already use CAATH?</p><p className="mt-1 text-sm text-slate-400">Sign in to renew your CAATH Practice OS subscription or review billing history.</p></div>
              <button type="button" onClick={onRenew} className="whitespace-nowrap border border-gold/40 px-5 py-3 font-bold text-gold hover:bg-gold hover:text-black">Renew subscription</button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
            <Building2 className="mx-auto h-10 w-10 text-gold" />
            <h2 className="mt-5 text-4xl font-black tracking-tight">Give your practice one dependable operating system.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">Create your workspace now, explore CAATH for 15 days and choose a subscription only when you are ready to continue.</p>
            <button type="button" onClick={() => onChoosePlan('CAATH Practice OS')} className="mt-8 inline-flex items-center gap-2 bg-gold px-7 py-4 font-black text-black hover:bg-gold-light">Start 15-Day Free Trial <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#07090d]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3"><Logo size="sm" /><span>© {new Date().getFullYear()} CAATH — Chartered Artificial Assistant for Technical Hegemony.</span></div>
          <div className="flex flex-wrap gap-5">
            <button type="button" onClick={onLogin} className="hover:text-gold">Login</button>
            <button type="button" onClick={onRenew} className="hover:text-gold">Renew</button>
            <button type="button" onClick={() => moveTo('pricing')} className="hover:text-gold">Pricing</button>
            <a href="/privacy" className="hover:text-gold">Privacy</a>
            <a href="/terms" className="hover:text-gold">Terms</a>
            <a href="/refund-policy" className="hover:text-gold">Refunds</a>
            <a href="/cookie-policy" className="hover:text-gold">Cookies</a>
            <a href="/data-deletion" className="hover:text-gold">Delete my data</a>
            <a href="/contact" className="hover:text-gold">Contact</a>
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
};
