import React from 'react';

const CONSENT_KEY = 'caath:cookie-notice:v1';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, 'necessary-only');
    } catch {
      // The notice remains informational when browser storage is unavailable.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-label="Cookie and browser storage notice"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl border border-gold/35 bg-[#11141b] p-4 shadow-2xl sm:flex sm:items-center sm:gap-5 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">Necessary browser storage only</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">CAATH uses necessary storage for sign-in security, workspace preferences and payment flow. We do not use advertising or behavioural-tracking cookies.</p>
        <a href="/cookie-policy" className="mt-2 inline-block text-sm font-bold text-gold hover:underline">Read the Cookie Policy</a>
      </div>
      <button type="button" onClick={acknowledge} className="mt-4 w-full shrink-0 border border-gold/60 px-4 py-2.5 text-sm font-bold text-gold hover:bg-gold hover:text-black sm:mt-0 sm:w-auto">
        I understand
      </button>
    </section>
  );
};
