/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Globe, 
  CheckCircle2, 
  Star,
  ChevronRight
} from 'lucide-react';
import { Logo } from './Logo';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen w-full bg-matte-black text-white selection:bg-gold selection:text-matte-black overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-matte-black/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xl font-bold gold-text-gradient tracking-tight">CAATH OS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#features" className="hover:text-gold transition-colors">Features</a>
            <a href="#solutions" className="hover:text-gold transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-gold transition-colors">Pricing</a>
            <button 
              onClick={onEnterApp}
              className="px-6 py-2.5 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/20"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Star className="w-3 h-3 fill-gold" />
            The Future of CA Practice Management
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold leading-tight mb-8"
          >
            CAATH Practice OS <br />
            <span className="gold-text-gradient italic">Assistant for High</span> <br />
            Performance.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            CAATH is the premium all-in-one OS for modern firms. 
            Automate compliance, extract data with AI, and provide a world-class experience to your clients.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={onEnterApp}
              className="group relative px-10 py-5 bg-gold text-matte-black rounded-2xl font-bold text-lg hover:bg-gold-light transition-all shadow-[0_0_40px_rgba(212,175,55,0.3)] flex items-center gap-3"
            >
              Enter CAATH
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-10 py-5 bg-matte-black-light border border-slate-800 rounded-2xl font-bold text-lg hover:border-gold/50 transition-all">
              Watch Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-6 bg-matte-black-light/30 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Engineered for Excellence</h2>
            <p className="text-slate-500">Every tool you need to scale your practice to the next level.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'AI Data Extraction', 
                desc: 'Automatically extract data from invoices and bank statements with 99.9% accuracy.', 
                icon: Cpu,
                color: 'text-gold'
              },
              { 
                title: '3-Layer Management', 
                desc: 'Seamless collaboration between SuperAdmins, Staff, and Clients in one unified portal.', 
                icon: ShieldCheck,
                color: 'text-blue-400'
              },
              { 
                title: 'Global Compliance', 
                desc: 'Real-time tracking of GST, Income Tax, and ROC filings with automated reminders.', 
                icon: Globe,
                color: 'text-emerald-400'
              }
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 bg-matte-black rounded-3xl border border-slate-800 hover:border-gold/30 transition-all group"
              >
                <div className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 group-hover:scale-110 transition-transform w-fit`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:gold-text-gradient transition-all">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 space-y-8">
            <h2 className="text-5xl font-bold leading-tight">
              Trusted by the <br />
              <span className="gold-text-gradient">Leaders of the Segment.</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              We've analyzed the top 5 Practice Management Systems and integrated their best features into one premium OS.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gold" />
                <span className="font-bold">Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gold" />
                <span className="font-bold">24/7 Priority Support</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gold" />
                <span className="font-bold">Reports & Analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gold" />
                <span className="font-bold">Custom Branding</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-gold/20 blur-[100px] rounded-full" />
            <div className="relative bg-matte-black-light border border-slate-800 p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-slate-800" />
                <div>
                  <p className="font-bold text-white">CA Vishva</p>
                  <p className="text-xs text-gold font-bold uppercase tracking-widest">Managing Partner</p>
                </div>
              </div>
              <p className="text-lg italic text-slate-300 mb-8">
                "CAATH has completely transformed how we handle our filings. The AI extraction alone saves us 20+ hours every week."
              </p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-gold text-gold" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center text-matte-black font-bold text-lg">
              CA
            </div>
            <span className="font-bold gold-text-gradient">CAATH</span>
          </div>
          <p className="text-slate-600 text-sm">© 2026 CAATH OS. All rights reserved.</p>
          <div className="flex gap-6 text-slate-500 text-sm font-bold">
            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms</a>
            <a href="#" className="hover:text-gold transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
