import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Shield,
    BarChart3,
    Rocket,
    CheckCircle2,
    ArrowRight,
    Users,
    Building2,
    LineChart,
    Layout
} from 'lucide-react';
import Button from './ui/Button';

type PersonaType = 'enterprise' | 'incubator';

const PersonaBentoGrid: React.FC = () => {
    const [activePersona, setActivePersona] = useState<PersonaType>('enterprise');

    const content = {
        enterprise: {
            hero: {
                title: "Ship innovation that the business can use",
                description: "Stop collecting slideware. Give your innovation team a repeatable system to scout, prototype, pilot, and scale—turning roadmaps into revenue.",
                icon: <Building2 className="w-12 h-12 text-white mb-4 opacity-90" />,
                gradient: "from-brand-600 to-brand-800"
            },
            features: {
                title: "Enterprise Grade",
                items: [
                    "SSO/SCIM & RBAC",
                    "Private Cloud Deployment",
                    "Audit Logs & Compliance",
                    "Template Hardening"
                ]
            },
            metrics: {
                value: "50-70%",
                label: "Faster Time-to-Pilot",
                sub: "vs traditional dev agencies"
            },
            cta: {
                text: "Talk to our enterprise team",
                link: "#contact"
            }
        },
        incubator: {
            hero: {
                title: "Your cohort, shipped on time",
                description: "Standardize idea→MVP→GTM with AI blueprints and reusable code. Measure outcomes, not just attendance, with a live portfolio console.",
                icon: <Rocket className="w-12 h-12 text-white mb-4 opacity-90" />,
                gradient: "from-accent-500 to-accent-700"
            },
            features: {
                title: "Program Power",
                items: [
                    "Landing Page Generators",
                    "Cohort Progress Dashboard",
                    "Investor Deal-Flow Views",
                    "Mentor Matching"
                ]
            },
            metrics: {
                value: "2-3x",
                label: "Higher Conversion",
                sub: "Proto-to-Pilot Success Rate"
            },
            cta: {
                text: "Run your next cohort",
                link: "#contact"
            }
        }
    };

    const current = content[activePersona];

    return (
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-4 max-w-6xl">

                {/* Toggle Header */}
                <div className="flex flex-col items-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 text-center">
                        Built for those who <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-500">build seriously</span>
                    </h2>

                    <div className="bg-white p-1.5 rounded-full border border-slate-200 shadow-sm inline-flex relative">
                        <div className="absolute inset-0 rounded-full" />
                        {(['enterprise', 'incubator'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setActivePersona(type)}
                                className={`relative px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 z-10 ${activePersona === type
                                        ? 'text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {activePersona === type && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className={`absolute inset-0 rounded-full ${type === 'enterprise' ? 'bg-brand-600' : 'bg-accent-500'
                                            }`}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {type === 'enterprise' ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    {type === 'enterprise' ? 'For Enterprises' : 'For Incubators'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[500px]">

                    {/* Card 1: Hero (Large Left) */}
                    <motion.div
                        key={`hero-${activePersona}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className={`md:col-span-2 md:row-span-2 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col justify-end text-white shadow-lg bg-gradient-to-br ${current.hero.gradient}`}
                    >
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="bg-white/20 w-fit p-3 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                                {current.hero.icon}
                            </div>
                            <h3 className="text-3xl md:text-5xl font-bold mb-6 leading-tight max-w-lg">
                                {current.hero.title}
                            </h3>
                            <p className="text-lg text-white/90 max-w-md leading-relaxed mb-8">
                                {current.hero.description}
                            </p>
                            <div className="flex gap-4">
                                <a href={current.cta.link}>
                                    <Button className="bg-white text-slate-900 border-none hover:bg-slate-50">
                                        {current.cta.text}
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2: Metrics (Top Right) */}
                    <motion.div
                        key={`metrics-${activePersona}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-brand-200 transition-colors"
                    >
                        <div className="absolute top-4 right-4 text-slate-200 group-hover:text-brand-100 transition-colors">
                            <LineChart className="w-16 h-16" />
                        </div>
                        <div className={`text-5xl md:text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${current.hero.gradient}`}>
                            {current.metrics.value}
                        </div>
                        <div className="text-lg font-bold text-slate-800 mb-1">{current.metrics.label}</div>
                        <div className="text-slate-500 text-sm">{current.metrics.sub}</div>
                    </motion.div>

                    {/* Card 3: Features (Bottom Right) */}
                    <motion.div
                        key={`features-${activePersona}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-center hover:border-brand-200 transition-colors"
                    >
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className={`w-5 h-5 ${activePersona === 'enterprise' ? 'text-brand-500' : 'text-accent-500'}`} />
                            {current.features.title}
                        </h4>
                        <ul className="space-y-3">
                            {current.features.items.map((item, i) => (
                                <li key={i} className="flex items-start text-slate-600 text-sm md:text-base">
                                    <CheckCircle2 className={`w-5 h-5 mr-3 shrink-0 ${activePersona === 'enterprise' ? 'text-brand-500' : 'text-accent-500'
                                        }`} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default PersonaBentoGrid;
