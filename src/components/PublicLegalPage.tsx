import React from 'react';
import { ArrowLeft, ExternalLink, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { CookieConsentBanner } from './CookieConsentBanner';

export type PublicLegalPageKind = 'privacy' | 'terms' | 'refund-policy' | 'cookie-policy' | 'data-deletion' | 'contact';

type PublicLegalPageProps = {
  page: PublicLegalPageKind;
  onHome: () => void;
  onLogin: () => void;
};

const CONTACT_EMAIL = 'cacmavishva@gmail.com';
const EFFECTIVE_DATE = '12 October 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-white/10 py-7 last:border-b-0">
    <h2 className="text-xl font-black text-white">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">{children}</div>
  </section>
);

const List: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc space-y-2 pl-5">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

const privacy = {
  title: 'Privacy Policy',
  intro: 'This policy explains how CAATH collects, uses, protects and shares personal data when firms, staff, clients and visitors use caath.in and the CAATH practice operating system.',
  content: (
    <>
      <Section title="1. Who is responsible for your data">
        <p>CAATH is the data fiduciary for account, subscription, security, support and website information collected directly for operating the CAATH service. A subscribing CA firm remains responsible for the client and practice data it uploads and instructs CAATH to process within its workspace.</p>
        <p>Privacy and grievance contact: <a className="text-gold hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Section>
      <Section title="2. Personal data we process">
        <List items={[
          'Identity and contact information such as name, email address, mobile number, role and firm association.',
          'Firm and professional information, including firm name, entity information, tax identifiers and subscription selections.',
          'Practice data supplied by an authorised firm, including client records, assignments, notices, documents, invoices, communications and compliance information.',
          'Authentication, security and audit information such as sign-in events, device/session information, role changes and governed actions.',
          'Payment and billing metadata such as plan, amount, payment status, provider reference and invoice details. CAATH does not receive or store full card, UPI PIN, CVV or banking credentials handled by Cashfree.',
          'Technical and support information such as browser/device details, error diagnostics, feature usage and support correspondence.',
        ]} />
      </Section>
      <Section title="3. Why we process data">
        <List items={[
          'To create and secure accounts, provision firm workspaces and enforce role-based access.',
          'To provide practice-management, compliance, document, billing, collaboration and reporting functions requested by the firm.',
          'To process subscriptions, verify payments, create invoices and administer renewals, grace periods and account status.',
          'To prevent abuse, investigate incidents, maintain audit evidence, support users and comply with legal obligations.',
          'To send service, security, payment and regulatory-workflow notifications. Marketing communication will use a separate lawful choice where required.',
        ]} />
        <p>Processing is based on consent, performance of the service requested by you or your firm, and other legitimate uses permitted by applicable Indian law. You may withdraw consent where processing depends on consent, subject to data required for an active contract or legal retention.</p>
      </Section>
      <Section title="4. Service providers and disclosures">
        <p>CAATH uses carefully selected infrastructure and service providers, including Supabase for database, authentication and storage; Vercel for hosting and server functions; Cashfree for payment processing; and configured email or notification providers. They receive only the information reasonably required to perform their services.</p>
        <p>Information may also be disclosed when required by law, a valid government or judicial request, fraud prevention, incident response, or a business restructuring with appropriate safeguards. CAATH does not sell personal data.</p>
      </Section>
      <Section title="5. Government portals and credentials">
        <p>The CAATH Government Portal Desk opens verified official websites in a separate browser tab. CAATH does not collect or auto-fill government-portal passwords, OTPs or CAPTCHAs through that desk. Any information entered on an official portal is governed by that portal’s own privacy terms.</p>
      </Section>
      <Section title="6. Retention, security and location">
        <p>Data is retained while the workspace is active and for a reasonable period required for support, audit, dispute, tax, security and legal obligations. Suspension does not automatically delete workspace records. Deletion requests are evaluated against contractual and statutory retention requirements.</p>
        <p>CAATH applies role-based access, tenant isolation, private storage, audit trails, secure authentication and controlled privileged actions. No internet service can promise absolute security. If a material incident affects personal data, CAATH will take containment and notification steps required by applicable law.</p>
        <p>Service providers may process data in India or other permitted locations, subject to contractual and legal safeguards and any transfer restrictions notified under Indian law.</p>
      </Section>
      <Section title="7. Your choices and rights">
        <List items={[
          'Request a summary of personal data processed about you and the processing activities.',
          'Request correction, completion or updating of inaccurate personal data.',
          'Request erasure where retention is no longer required by contract or law.',
          'Withdraw consent where applicable and nominate another individual as permitted by law.',
          'Raise a grievance with CAATH and, where available, the competent data-protection authority.',
        ]} />
        <p>Send requests from your registered email to <a className="text-gold hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or use our <a className="text-gold hover:underline" href="/data-deletion">data-deletion request path</a>. We may verify identity and workspace authority before acting.</p>
      </Section>
      <Section title="8. Cookies, children and changes">
        <p>CAATH uses necessary browser storage and similar technologies for authentication, security and user preferences. CAATH does not presently use behavioural advertising trackers. The service is intended for professional and business use and is not directed to children.</p>
        <p>Material changes will be dated on this page and communicated through the service or registered contact details where appropriate.</p>
      </Section>
    </>
  ),
};

const terms = {
  title: 'Terms of Service',
  intro: 'These terms govern access to caath.in and the CAATH practice operating system. By registering, purchasing or using CAATH, you confirm that you are authorised to bind yourself or the subscribing organisation.',
  content: (
    <>
      <Section title="1. Service and eligibility">
        <p>CAATH is a subscription software service for Indian professional-practice operations. You must provide accurate registration information, be legally capable of entering a contract, and have authority to upload and process firm and client information.</p>
        <p>Features, limits and fees depend on the selected plan. SERA and other clearly marked future capabilities are not part of the purchased service until released and included in the applicable plan.</p>
      </Section>
      <Section title="2. Accounts and permitted use">
        <List items={[
          'Keep credentials confidential, use individual accounts and promptly report suspected compromise.',
          'Use CAATH only for lawful professional and business purposes and respect role and client boundaries.',
          'Do not attempt to bypass security, access another tenant, upload malicious code, scrape the service, resell access without approval, or use CAATH for unlawful, deceptive or abusive activity.',
          'Do not copy material portions of CAATH, systematically extract its content, decompile or reverse engineer the service except where a restriction is prohibited by applicable law, circumvent technical controls, share access outside the authorised firm, or use non-public CAATH materials to develop a competing product.',
          'Ensure that you have authority and appropriate notices or consents before uploading personal, tax, financial or client information.',
        ]} />
      </Section>
      <Section title="3. Free trial">
        <p>New workspaces receive a 15-day free trial beginning when registration is completed. No plan selection, card payment or automatic debit is required to start the trial.</p>
        <p>When the trial expires, users may continue to sign in and review the workspace shell, but operational modules remain locked until the CAATH Practice OS subscription is activated. The Subscription page remains available for payment or manual-verification steps.</p>
      </Section>
      <Section title="4. Professional responsibility">
        <p>CAATH organises information and workflows; it does not replace professional judgment, statutory verification or legal advice. Users remain responsible for filings, deadlines, computations, client approvals and reliance on regulatory material. Verify official notifications, judgments and portal status before acting.</p>
        <p>Government websites, Cashfree and other third-party services are operated independently. Their availability and terms are outside CAATH’s control.</p>
      </Section>
      <Section title="5. Subscriptions, payment and taxes">
        <p>CAATH Practice OS is offered at ₹1,499 per month plus applicable GST. Before you confirm a payment, CAATH presents the total payable amount, including applicable taxes. There are no setup fees, per-user fees or automatic debit charges. Cashfree processes supported online payments. A verified successful online payment may activate a subscription automatically when risk checks pass; manual payment or flagged transactions require God Admin verification.</p>
        <p>CAATH does not currently charge automatic renewals unless a customer separately authorises and enables that facility. Renewal reminders do not guarantee uninterrupted access.</p>
      </Section>
      <Section title="6. Customer data and confidentiality">
        <p>The subscribing firm retains its rights in the data it provides. The firm grants CAATH a limited right to host, process, secure, back up and transmit that data only to provide, protect and support the service. Each party must protect confidential information and disclose it only where authorised or legally required.</p>
      </Section>
      <Section title="7. Availability and changes">
        <p>CAATH aims to provide a reliable service but maintenance, security events, provider failures and circumstances beyond reasonable control may cause interruption. Features may be improved, replaced or withdrawn where necessary, with reasonable notice when a material paid function is affected.</p>
      </Section>
      <Section title="8. Suspension and termination">
        <p>Normal commercial suspension provides a 30-day grace period to resolve the issue and export available records. Immediate suspension may apply for suspected fraud, account compromise, unlawful use or serious security risk. Suspension does not itself delete stored data.</p>
        <p>You may stop using CAATH and request closure. Outstanding fees, legal retention, audit evidence and obligations intended to survive termination remain applicable.</p>
      </Section>
      <Section title="9. Intellectual property">
        <p>CAATH software, branding, interface, documentation and original templates are protected by applicable intellectual-property law. The limited trial or subscription right is non-exclusive, non-transferable and revocable under these terms. Customer content remains subject to the customer-data clause above.</p>
        <p>Feedback may be used to improve CAATH, but the participant retains ownership of its pre-existing materials and customer data.</p>
      </Section>
      <Section title="10. Warranties and liability">
        <p>To the maximum extent permitted by law, CAATH is provided on an “as available” basis without a guarantee that every function will be uninterrupted or error-free. CAATH is not liable for indirect, incidental, special or consequential loss, loss arising from incorrect professional decisions, or failure of an independent government or payment portal.</p>
        <p>CAATH’s aggregate contractual liability for a claim is limited to fees paid for the affected service during the three months preceding the event, except where a different limitation is required by law. Nothing excludes rights or liabilities that cannot legally be excluded.</p>
      </Section>
      <Section title="11. Governing law and contact">
        <p>These terms are governed by the laws of India. Courts having jurisdiction over the CAATH operator’s registered office in Tamil Nadu will have jurisdiction, subject to mandatory consumer rights and any agreed dispute process.</p>
        <p>Questions may be sent to <a className="text-gold hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Section>
    </>
  ),
};

const refund = {
  title: 'Cancellation & Refund Policy',
  intro: 'This policy explains how CAATH subscription cancellations, duplicate payments and refund requests are handled. It should be read with the Terms of Service and the plan details shown at checkout.',
  content: (
    <>
      <Section title="1. Cancelling a subscription">
        <p>You may request cancellation by emailing <a className="text-gold hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the registered Super Admin address. Unless a refund is approved under this policy, the workspace remains available until the end of the paid period and will not renew.</p>
      </Section>
      <Section title="2. When a refund may be approved">
        <List items={[
          'A duplicate charge for the same CAATH subscription.',
          'A payment recorded as successful where CAATH did not activate or provide the purchased service and cannot remedy the issue within a reasonable period.',
          'An incorrect amount charged due to a verified CAATH or payment-processing error.',
          'A cancellation request made before workspace activation, provided no paid service has been consumed.',
          'Any refund required under applicable law or expressly agreed in writing by CAATH.',
        ]} />
      </Section>
      <Section title="3. Non-refundable situations">
        <p>After activation, subscription fees are generally non-refundable for change of mind, unused time, reduced usage, failure to use available features, or suspension caused by a breach of the Terms. CAATH may offer a credit or partial refund as a discretionary commercial resolution without creating a continuing obligation.</p>
      </Section>
      <Section title="4. Request and verification process">
        <p>Submit the registered firm name, payment date, amount, Cashfree/order reference, reason and relevant evidence. Do not email card numbers, CVV, UPI PIN, OTP or banking passwords. Requests should be made within seven calendar days of the payment or discovery of a duplicate/incorrect charge.</p>
        <p>CAATH will acknowledge the request within two business days and normally decide it within seven business days after receiving complete information.</p>
      </Section>
      <Section title="5. Refund method and timing">
        <p>Approved online-payment refunds are initiated to the original payment method through the applicable payment gateway. Bank and payment-network processing may take approximately 5–10 business days after initiation. CAATH cannot control the final credit timing of a bank or payment network.</p>
        <p>Manual-payment refunds, where approved, will be returned through a traceable method after account verification. Taxes and invoices will be adjusted as required by applicable law.</p>
      </Section>
      <Section title="6. Failed and pending payments">
        <p>If money is debited but CAATH does not show a successful payment, first allow the bank/payment gateway’s normal reconciliation period. Do not make repeated payments unless the earlier transaction is confirmed failed. Contact CAATH with the provider reference if the status remains unresolved.</p>
      </Section>
    </>
  ),
};

const cookiePolicy = {
  title: 'Cookie & Browser Storage Policy',
  intro: 'This policy explains the limited browser storage CAATH uses and how you can control it.',
  content: (
    <>
      <Section title="1. What we use">
        <p>CAATH uses strictly necessary cookies, local storage and similar browser storage to keep an authenticated session secure, preserve a limited set of workspace and form preferences, and support a payment journey that you initiate. We do not use advertising cookies, cross-site behavioural tracking or third-party analytics trackers.</p>
      </Section>
      <Section title="2. Categories">
        <List items={[
          'Essential authentication and security storage provided through Supabase so that signed-in users can access the correct workspace.',
          'Preference and draft storage, such as a short-lived registration draft, used only to prevent accidental loss of an entry in progress.',
          'Payment-flow storage used when you choose to open Cashfree’s hosted checkout. Payment credentials are collected by Cashfree, not CAATH.',
        ]} />
      </Section>
      <Section title="3. Your control">
        <p>You can clear CAATH cookies and browser storage in your browser settings. Clearing essential storage will sign you out and may remove unsaved local preferences or drafts. We show a neutral notice because the service only uses necessary storage; there are no optional advertising or analytics categories to opt into.</p>
      </Section>
      <Section title="4. Third parties">
        <p>Supabase supports authentication and data services, Vercel hosts the application, and Cashfree operates the hosted checkout when selected. Their own browser technologies are governed by their respective policies. See the Privacy Policy for a fuller provider list.</p>
      </Section>
    </>
  ),
};

const dataDeletion = {
  title: 'Request Data Deletion',
  intro: 'Use this route to request erasure of personal data that CAATH controls, subject to account authority, active-service needs and legal retention duties.',
  content: (
    <>
      <Section title="1. Make a request">
        <p>Send a request from the email address registered with CAATH. Include your full name, firm name, workspace code if known, and whether you are requesting deletion of your individual profile, a workspace, or a specific record. Do not include passwords, OTPs, card details, CVV or UPI PIN.</p>
        <a className="inline-flex border border-gold/50 px-4 py-2 font-bold text-gold hover:bg-gold hover:text-black" href={`mailto:${CONTACT_EMAIL}?subject=DATA%20DELETION%20REQUEST%20%E2%80%94%20CAATH`}>Email a data-deletion request</a>
      </Section>
      <Section title="2. Verification and scope">
        <p>We verify identity and workspace authority before acting. A firm Super Admin can request workspace-level deletion. Individual users can request correction, removal or closure of their own account. We may ask for only the information necessary to verify the request.</p>
      </Section>
      <Section title="3. What may be retained">
        <p>Some information may need to be retained for active subscriptions, invoices, tax, fraud prevention, security logs, dispute handling, backups or other legal obligations. If deletion cannot be completed in full, we will explain the retained category and reason.</p>
      </Section>
      <Section title="4. Timing and outcome">
        <p>CAATH will acknowledge a complete request within two business days and provide an outcome or status update after verification. Deletion can remove access and may be irreversible; export any records your firm needs before a workspace-level deletion is completed.</p>
      </Section>
    </>
  ),
};

const contact = {
  title: 'Contact & Grievance Support',
  intro: 'Contact CAATH for account activation, subscriptions, payments, privacy requests, security concerns and product support.',
  content: (
    <>
      <Section title="Primary contact">
        <div className="flex items-start gap-3 border border-gold/25 bg-gold/[0.06] p-5">
          <Mail className="mt-1 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="font-bold text-white">CAATH Support and Grievance Desk</p>
            <a className="mt-1 inline-block text-gold hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <p className="mt-2 text-slate-400">Tamil Nadu, India · Monday–Friday, 10:00 AM–6:00 PM IST</p>
          </div>
        </div>
        <p>We normally acknowledge support and grievance emails within two business days. Complex privacy, payment or security matters may require identity and workspace-authority verification.</p>
        <p className="text-amber-100">Before paid subscriptions are broadly marketed, CAATH must publish its verified legal operator name, registered business address, GSTIN (where applicable) and designated grievance officer details here and at checkout. Those details have not been invented in this policy.</p>
      </Section>
      <Section title="What to include">
        <List items={[
          'Your registered name, firm name and CAATH workspace code, if available.',
          'A concise description of the issue and the date/time it occurred.',
          'For payments: the Cashfree/order reference and amount, but never card details, CVV, UPI PIN or OTP.',
          'For security incidents: affected account, observed behaviour and a safe screenshot without exposed passwords or client documents.',
        ]} />
      </Section>
      <Section title="Urgent security reports">
        <p>Use the subject line <strong className="text-white">URGENT SECURITY — CAATH</strong>. Sign out of the affected account, do not share credentials, and preserve relevant evidence. CAATH may temporarily restrict access while investigating.</p>
      </Section>
      <Section title="Privacy and data requests">
        <p>Use the subject line <strong className="text-white">PRIVACY REQUEST — CAATH</strong> for access, correction, erasure, consent withdrawal or grievance requests. Requests should come from the registered email address.</p>
      </Section>
      <Section title="Payment-provider support">
        <p>CAATH is responsible for its subscription and refund decisions. Cashfree independently processes payment credentials and banking-network transactions. For a transaction-tracking issue, you may also use Cashfree’s customer support resources.</p>
        <a className="inline-flex items-center gap-2 text-gold hover:underline" href="https://www.cashfree.com/support/" target="_blank" rel="noreferrer">Cashfree support <ExternalLink className="h-4 w-4" /></a>
      </Section>
    </>
  ),
};

const pages = { privacy, terms, 'refund-policy': refund, 'cookie-policy': cookiePolicy, 'data-deletion': dataDeletion, contact };

export const PublicLegalPage: React.FC<PublicLegalPageProps> = ({ page, onHome, onLogin }) => {
  const content = pages[page];

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${content.title} | CAATH`;
  }, [content.title]);

  return (
    <div className="min-h-screen bg-[#090b10] text-white selection:bg-gold/30">
      <a href="#main-content" className="sr-only z-[110] bg-gold px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="border-b border-white/10 bg-[#090b10]">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <button type="button" onClick={onHome} className="flex items-center gap-3 text-left" aria-label="CAATH home">
            <Logo size="md" />
            <div><div className="font-black">CAATH</div><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">Technical Hegemony</div></div>
          </button>
          <button type="button" onClick={onLogin} className="border border-white/15 px-4 py-2 text-sm font-bold hover:border-gold/60 hover:text-gold">Customer Login</button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
        <button type="button" onClick={onHome} className="inline-flex items-center gap-2 text-sm font-bold text-gold hover:underline"><ArrowLeft className="h-4 w-4" /> Back to CAATH</button>
        <div className="mt-8 border border-white/10 bg-[#11141b] p-6 sm:p-10">
          <div className="flex h-11 w-11 items-center justify-center border border-gold/30 bg-gold/10 text-gold"><ShieldCheck className="h-5 w-5" /></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-gold">CAATH public policy</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">{content.intro}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Effective and last updated: {EFFECTIVE_DATE}</p>
          <div className="mt-7 border-t border-white/10">{content.content}</div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#07090d]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} CAATH. All rights reserved.</span>
          <div className="flex flex-wrap gap-4">
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
