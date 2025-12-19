import React, { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import {
  Zap,
  Shield,
  BarChart3,
  Rocket,
  Code2,
  Layout,
  Database,
  Globe,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Users
} from 'lucide-react';

const HomePage: FC = () => {
  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "VentureStackAI — Idea to MVP & Pilots for Enterprises and Cohorts";
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const EnterpriseTabContent = (
    <div className="animate-fade-in space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-brand-900 mb-4">Ship innovation that the business can use</h3>
        <p className="text-lg text-gray-600">
          Stop collecting slideware. VentureStackAI gives your innovation team a repeatable system to scout opportunities, prototype with AI, pilot with business units, and scale on secure cloud—so the roadmap turns into revenue.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-xl font-bold text-brand-800 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-accent-500" /> Value Props
          </h4>
          <ul className="space-y-3">
            {[
              "From problem to pilot in weeks: AI blueprints + reusable modules.",
              "Enterprise-grade: SSO/SCIM, RBAC, audit logs, private cloud.",
              "On-ramp to scale: Templates for production hardening & handover.",
              "Measurable outcomes: Live dashboard for cost, cycle time, ROI."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-gray-600">
                <CheckCircle2 className="w-5 h-5 mr-3 text-brand-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-xl font-bold text-brand-800 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-accent-500" /> Featured Use Cases
          </h4>
          <ul className="space-y-3 text-gray-600">
            <li><strong>Manufacturing:</strong> Quality Copilot, predictive maintenance.</li>
            <li><strong>BFSI:</strong> Credit underwriting, KYC automation.</li>
            <li><strong>Retail/CPG:</strong> Demand forecasting, store ops Copilot.</li>
            <li><strong>Shared Services:</strong> GenAI knowledge assistant, doc automation.</li>
          </ul>
        </div>
      </div>

      <div className="bg-brand-50 p-6 rounded-xl border border-brand-100 text-center">
        <p className="text-brand-800 font-semibold mb-4">
          “Time-to-pilot ↓ 50–70% • Prototype→Pilot conversion ↑ • Portfolio visibility for CXOs”
        </p>
        <Link to="/contact">
          <Button variant="primary" className="bg-brand-700 hover:bg-brand-800">
            Talk to our enterprise team
          </Button>
        </Link>
      </div>
    </div>
  );

  const IncubatorTabContent = (
    <div className="animate-fade-in space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-brand-900 mb-4">Your cohort, shipped</h3>
        <p className="text-lg text-gray-600">
          VentureStackAI is the operating system for programs that measure outcomes, not attendance. Standardize idea→MVP→GTM with AI blueprints, reusable code, and a live portfolio console.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-xl font-bold text-brand-800 mb-4 flex items-center">
            <Rocket className="w-5 h-5 mr-2 text-accent-500" /> Value Props
          </h4>
          <ul className="space-y-3">
            {[
              "MVPs in weeks: Next.js/Supabase templates with auth & payments.",
              "GTM on day one: Landing generator, CRM sync, automations.",
              "Portfolio console: Real-time progress, risks, quality gates.",
              "Repeatable excellence: Cohort playbooks, QA checklists."
            ].map((item, i) => (
              <li key={i} className="flex items-start text-gray-600">
                <CheckCircle2 className="w-5 h-5 mr-3 text-brand-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-xl font-bold text-brand-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-accent-500" /> Program Outcomes
          </h4>
          <p className="mb-2 text-sm text-gray-500">Per 20-team cohort:</p>
          <ul className="space-y-3 text-gray-600 font-medium">
            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> ≥18 MVPs shipped</li>
            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> ≥12 teams with first users/LOIs</li>
            <li className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span> ≥6 investor-ready</li>
          </ul>
        </div>
      </div>

      <div className="bg-accent-50 p-6 rounded-xl border border-accent-100 text-center">
        <p className="text-accent-900 font-semibold mb-4">
          Standardize your program success with real shipping power.
        </p>
        <Link to="/contact">
          <Button variant="primary" className="bg-accent-600 hover:bg-accent-700 text-white">
            Run your next cohort on VentureStackAI
          </Button>
        </Link>
      </div>
    </div>
  );

  const faqs = [
    {
      question: "Is it low/no-code or code?",
      answer: "Both: AI blueprints + code templates. Teams can extend in JS/TS, Python, or your enterprise stack."
    },
    {
      question: "Can we host on our cloud?",
      answer: "Yes. Private cloud on AWS/Azure with SSO/SCIM, RBAC, audit logs, and data residency."
    },
    {
      question: "What stacks do you support?",
      answer: "Next.js/React, Supabase/AWS, Python/Node, Fabric/Power BI, HubSpot/Zoho, n8n/Make."
    },
    {
      question: "How do you measure success?",
      answer: "Time-to-MVP/pilot, adoption & activation, prototype→pilot conversion, funnel metrics, and business KPIs."
    },
    {
      question: "Do you help after launch?",
      answer: "Yes—traction experiments, partner pilots, investor/exec packs, and scale handover."
    }
  ];

  return (
    <div className="font-sans text-slate-800">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-900 pt-20 pb-32 lg:pt-32 lg:pb-48 text-center text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-900/90"></div>

        <div className="relative container mx-auto px-4 z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            VentureStackAI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-accent-400 text-4xl md:text-6xl block mt-2">
              Build real products, not just plans
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-brand-100 mb-10 leading-relaxed">
            The platform that turns ideas into working MVPs and first users—fast. For corporate innovation teams and cohort programs.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/contact">
              <Button className="w-full sm:w-auto px-8 py-4 text-lg bg-accent-600 hover:bg-accent-500 text-white font-bold shadow-lg transition-transform hover:scale-105">
                Book a demo
              </Button>
            </Link>
            <Link to="/overview">
              <Button variant="secondary" className="w-full sm:w-auto px-8 py-4 text-lg bg-transparent border border-white text-white hover:bg-white/10">
                Download the overview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value SwitcherTabs */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <Tabs
            tabs={[
              { id: 'enterprise', label: 'For Enterprises', content: EnterpriseTabContent },
              { id: 'incubators', label: 'For Incubators & Accelerators', content: IncubatorTabContent },
            ]}
          />
        </div>
      </section>

      {/* How VentureStackAI Works */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How VentureStackAI Works</h2>
            <p className="mt-4 text-gray-600">From idea to traction in 4 steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="absolute hidden lg:block top-12 left-0 w-full h-0.5 bg-gray-200 -z-10"></div>

            {[
              {
                step: "01",
                title: "Scope",
                desc: "Align problem, ICP, success metrics.",
                icon: <Layout className="w-6 h-6" />
              },
              {
                step: "02",
                title: "Blueprint",
                desc: "AI-generated PRD, schema, API map, UI skeleton.",
                icon: <Code2 className="w-6 h-6" />
              },
              {
                step: "03",
                title: "Build",
                desc: "Reusable modules for auth, data, files, payments.",
                icon: <Database className="w-6 h-6" />
              },
              {
                step: "04",
                title: "GTM & Traction",
                desc: "Site, CRM, outbound, dashboards.",
                icon: <Globe className="w-6 h-6" />
              }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4 border-4 border-white relative z-10">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Quality Gates: Blueprint ✓ • MVP DoD ✓ • GTM Ready ✓ • Launch ✓
            </span>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="py-24 bg-brand-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Platform Capabilities</h2>
            <p className="mt-4 text-brand-200">Everything you need to build and scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: "AI Blueprinting", desc: "Prompt → PRD, schema, API map, UI drafts." },
              { title: "Build Stack", desc: "Next.js/Tailwind • Supabase/AWS • serverless APIs." },
              { title: "Data & Analytics", desc: "GA4, PostHog, Sentry; Fabric/Power BI optional." },
              { title: "GTM Kit", desc: "Landing generator, CRM sync, WhatsApp/email automations." },
              { title: "Security & Gov", desc: "SSO/SAML, RBAC, audit logs, VPC/VNet isolation." },
              { title: "Portfolio Console", desc: "Velocity, burn, adoption, funnel, risk flags." }
            ].map((cap, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-colors">
                <h3 className="text-xl font-bold text-accent-400 mb-2">{cap.title}</h3>
                <p className="text-brand-100">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results / Metrics Band */}
      <section className="py-16 bg-accent-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-accent-500">
            {[
              { val: "50–70%", label: "Faster time-to-MVP" },
              { val: "2–3×", label: "Higher pilot conversion" },
              { val: "100%", label: "Unified visibility" },
              { val: "↓ Waste", label: "Via reusable components" }
            ].map((stat, i) => (
              <div key={i} className="pt-8 md:pt-0">
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.val}</div>
                <div className="text-accent-100 text-sm font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Implementation & Timelines (Simplified Unified View for now as scaffold) */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Implementation & Timelines</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              <div className="p-8">
                <h3 className="text-xl font-bold text-brand-900 mb-4 flex items-center justify-center"><Building2 className="w-5 h-5 mr-2" /> Enterprises</h3>
                <ul className="text-left space-y-4 text-sm text-gray-600 mb-8">
                  <li className="flex"><span className="font-bold min-w-[80px]">2 weeks:</span> Intake, metrics, secure setup</li>
                  <li className="flex"><span className="font-bold min-w-[80px]">Wks 3–6:</span> Prototyping sprints (1-3 pilots)</li>
                  <li className="flex"><span className="font-bold min-w-[80px]">Wks 7–12:</span> Pilot validation & scale path</li>
                </ul>
                <Link to="/contact"><Button variant="secondary" size="sm" className="w-full">Start a 90-day pilot</Button></Link>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-brand-900 mb-4 flex items-center justify-center"><Rocket className="w-5 h-5 mr-2" /> Accelerators</h3>
                <ul className="text-left space-y-4 text-sm text-gray-600 mb-8">
                  <li className="flex"><span className="font-bold min-w-[80px]">T-2 wks:</span> Setup, mentor calendar</li>
                  <li className="flex"><span className="font-bold min-w-[80px]">Wks 1–6:</span> Build + GTM sprints</li>
                  <li className="flex"><span className="font-bold min-w-[80px]">Wks 7–8:</span> Traction shaping + Demo Day</li>
                </ul>
                <Link to="/contact"><Button variant="secondary" size="sm" className="w-full">Launch a 20-startup cohort</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans & Packaging */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Plans & Packaging</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "SaaS", desc: "Per tenant (enterprise) / per cohort or seat" },
              { title: "Managed", desc: "Add PMO, mentors, weekly clinics, playbooks" },
              { title: "Enterprise", desc: "SSO/SCIM, private cloud, white-label" },
              { title: "Outcome Add-ons", desc: "Success bonus per MVP/pilot milestones" }
            ].map((plan, i) => (
              <div key={i} className="border border-gray-200 p-6 rounded-lg text-center hover:border-brand-300 transition-colors">
                <h3 className="text-lg font-bold text-brand-800 mb-2">{plan.title}</h3>
                <p className="text-sm text-gray-500">{plan.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <blockquote className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-gray-700 italic mb-4">“Built our first production-grade Copilot in 6 weeks.”</p>
              <cite className="not-italic text-sm font-bold text-brand-900">— VP Innovation, Manufacturing</cite>
            </blockquote>
            <blockquote className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <p className="text-gray-700 italic mb-4">“Our Demo Day finally had products users could touch.”</p>
              <cite className="not-italic text-sm font-bold text-brand-900">— Accelerator Director</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">FAQ</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 text-left focus:outline-none transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 animate-fade-in">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Footer CTA */}
      <section id="contact" className="py-24 bg-brand-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg border border-gray-200">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to build real products—fast?</h2>
              <p className="text-gray-600">Book a demo to see how VentureStackAI can transform your innovation pipeline.</p>
            </div>

            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="john@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="Company Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
                    <option>Immediately</option>
                    <option>1-3 months</option>
                    <option>3+ months</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Use Case</label>
                <select className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
                  <option>Corporate Innovation</option>
                  <option>Incubator / Accelerator</option>
                  <option>Venture Studio</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="Tell us about your goals..."></textarea>
              </div>

              <Button className="w-full py-4 text-lg font-bold shadow-md bg-brand-600 hover:bg-brand-700 text-white">
                Book a demo
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer CTA Band */}
      <section className="py-16 bg-brand-900 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Stop planning innovation. Start shipping it.</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/contact">
              <Button className="px-8 py-4 text-lg bg-accent-600 hover:bg-accent-500 text-white font-bold shadow-lg">
                Book a demo
              </Button>
            </Link>
            <Link to="/overview">
              <Button variant="secondary" className="px-8 py-4 text-lg bg-transparent border border-white text-white hover:bg-white/10">
                Download overview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Addition */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h4 className="text-xl font-bold text-brand-900 mb-1">VentureStackAI</h4>
            <p className="text-sm text-gray-500">
              A product of <span className="font-semibold text-gray-900">Turning Ideas Ventures</span>.
            </p>
            <p className="text-xs text-gray-400 mt-2">Incubation • Advisory • Investment</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Startups</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Scale</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Co-create</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">About us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
