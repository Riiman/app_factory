import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Rocket, ArrowRight, CheckCircle2 } from 'lucide-react';

const JourneySwitcherSection = () => {
    const [mode, setMode] = useState<'enterprise' | 'incubator'>('enterprise');

    // Interactive Switcher Data
    const data = {
        enterprise: {
            color: 'bg-brand-600',
            text: 'text-brand-600',
            bgTheme: 'bg-slate-50',
            borderColor: 'border-brand-200',
            pathColor: '#2563eb', // brand-600
            icon: <Building2 className="w-6 h-6" />,
            title: 'Corporate Innovation',
            desc: 'Deploy outcome-driven pilots with bank-grade security.',
            steps: [
                { id: 'e1', week: 'Week 1-2', label: 'Intake & Security', sub: 'Deep alignment & setup' },
                { id: 'e2', week: 'Week 3-6', label: 'Prototyping Sprints', sub: 'Build 1-3 pilots simultaneously' },
                { id: 'e3', week: 'Week 7-12', label: 'Validation & Scale', sub: 'Pilot metrics & deployment' },
            ],
            // Approximate SVG Path Data (Stepped Line) - Adjusted Y to be higher (80-150)
            // Converted to 8 Bezier segments (splitting middle segment) for perfect morphing
            pathD: "M200.0,200.0 C200.0,150.0 200.0,100.0 200.0,50.0 C266.7,50.0 333.3,50.0 400.0,50.0 C400.0,100.0 400.0,150.0 400.0,200.0 C433.3,200.0 466.7,200.0 500.0,200.0 C533.3,200.0 566.7,200.0 600.0,200.0 C600.0,150.0 600.0,100.0 600.0,50.0 C666.7,50.0 733.3,50.0 800.0,50.0 C800.0,100.0 800.0,150.0 800.0,200.0"
        },
        incubator: {
            color: 'bg-accent-500',
            text: 'text-accent-500',
            bgTheme: 'bg-orange-50',
            borderColor: 'border-accent-200',
            pathColor: '#f97316', // accent-500
            icon: <Rocket className="w-6 h-6" />,
            title: 'Venture Acceleration',
            desc: 'Launch 20+ ventures with a proven build-track methodology.',
            steps: [
                { id: 'i1', week: 'T-Minus 2', label: 'Program Setup', sub: 'Mentor & calendar scaffolding' },
                { id: 'i2', week: 'Week 1-6', label: 'Build & GTM Sprints', sub: 'High-velocity execution' },
                { id: 'i3', week: 'Week 7-8', label: 'Demo Day Launch', sub: 'Traction & pitch shaping' },
            ],
            // Approximate SVG Path Data (Growth Curve) - Adjusted Y to be higher (80-200)
            // Mathematically subdivided into 8 perfect Bezier segments for smooth morphing & centered
            pathD: "M100.0,200.0 C137.5,200.0 165.6,192.5 190.6,181.2 C215.6,170.0 237.5,155.0 262.5,140.0 C287.5,125.0 315.6,110.0 353.1,98.8 C390.6,87.5 437.5,80.0 500.0,80.0 C562.5,80.0 609.4,87.5 646.9,98.8 C684.4,110.0 712.5,125.0 737.5,140.0 C762.5,155.0 784.4,170.0 809.4,181.2 C834.4,192.5 862.5,200.0 900.0,200.0"
        }
    };

    const current = data[mode];

    return (
        <section className={`py-24 relative overflow-hidden transition-colors duration-700 ${current.bgTheme}`}>
            {/* Background Isometric Grid (CSS Pattern) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
            />

            <div className="container mx-auto px-4 max-w-5xl relative z-10">

                {/* Header & Switcher */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Choose Your Path</h2>

                    <div className="inline-flex bg-white p-1.5 rounded-full shadow-lg border border-gray-100 relative">
                        {/* Sliding Background Pill */}
                        <motion.div
                            layout
                            className={`absolute top-1.5 bottom-1.5 rounded-full ${current.color}`}
                            initial={false}
                            animate={{
                                left: mode === 'enterprise' ? '6px' : '50%',
                                x: mode === 'enterprise' ? 0 : 6, // slight adjustment for gap
                                width: 'calc(50% - 12px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />

                        <button
                            onClick={() => setMode('enterprise')}
                            className={`relative px-8 py-3 rounded-full text-sm font-bold transition-colors z-10 flex items-center gap-2 ${mode === 'enterprise' ? 'text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Building2 className="w-4 h-4" /> Enterprises
                        </button>
                        <button
                            onClick={() => setMode('incubator')}
                            className={`relative px-8 py-3 rounded-full text-sm font-bold transition-colors z-10 flex items-center gap-2 ${mode === 'incubator' ? 'text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Rocket className="w-4 h-4" /> Accelerators
                        </button>
                    </div>
                </div>

                {/* Main Interactive Stage */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/50 relative overflow-hidden min-h-[500px] flex flex-col">

                    {/* Animated SVG Path Layer - Constrained Position */}
                    <div className="absolute top-0 left-0 right-0 h-[400px] flex items-center justify-center opacity-20 md:opacity-100 pointer-events-none">
                        <svg width="1000" height="400" viewBox="0 0 1000 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <motion.path
                                d={current.pathD}
                                fill="none"
                                stroke={current.pathColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                initial={false}
                                animate={{ d: current.pathD, stroke: current.pathColor }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </svg>
                    </div>

                    {/* Steps Layer */}
                    <div className="grid md:grid-cols-3 gap-8 relative z-20 mt-8">
                        <AnimatePresence mode="wait">
                            {current.steps.map((step, i) => (
                                <motion.div
                                    key={`${mode}-${i}`}
                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                    transition={{ duration: 0.4, delay: i * 0.15 }}
                                    className="relative"
                                >
                                    {/* Floating Card */}
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 group hover:border-brand-200 transition-colors h-full flex flex-col justify-between">
                                        <div>
                                            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${current.text}`}>{step.week}</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{step.label}</h3>
                                            <p className="text-gray-500 text-sm leading-relaxed">{step.sub}</p>
                                        </div>

                                        {/* Connector Dot (Visual simulation of connecting to line) */}
                                        <div className={`mt-6 mx-auto w-4 h-4 rounded-full border-2 border-white ${current.color} hidden md:block`} />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Dynamic Description & CTA */}
                    <div className="mt-auto pt-16 text-center relative z-20">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{current.title}</h3>
                            <p className="text-gray-600 mb-8 max-w-xl mx-auto">{current.desc}</p>

                            <button className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center mx-auto ${current.color} hover:opacity-90`}>
                                Start Your Journey <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </motion.div>
                    </div>

                </div>

            </div>
        </section>
    );
};

export default JourneySwitcherSection;
