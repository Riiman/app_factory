import React from 'react';
import { motion } from 'framer-motion';
import { Layout, PenTool, Code2, Rocket } from 'lucide-react';

const ProcessTimeline = () => {
    const steps = [
        {
            id: "01",
            title: "Scope",
            desc: "Align problem, ICP, success metrics.",
            icon: <Layout className="w-6 h-6 text-white" />,
            color: "bg-brand-600"
        },
        {
            id: "02",
            title: "Design",
            desc: "High-fidelity prototypes & architecture.",
            icon: <PenTool className="w-6 h-6 text-white" />,
            color: "bg-accent-500"
        },
        {
            id: "03",
            title: "Build",
            desc: "Agile sprints with bi-weekly demos.",
            icon: <Code2 className="w-6 h-6 text-white" />,
            color: "bg-brand-600"
        },
        {
            id: "04",
            title: "Launch",
            desc: "Production deployment & handoff.",
            icon: <Rocket className="w-6 h-6 text-white" />,
            color: "bg-accent-500"
        }
    ];

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">How Venturestack Works</h2>
                    <p className="text-gray-600">From concept to code in weeks, not months.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-6 left-[12%] right-[12%] h-0.5 bg-gray-100 -z-10">
                        <motion.div
                            className="h-full bg-gradient-to-r from-brand-500 to-accent-500"
                            initial={{ width: "0%" }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    </div>

                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.2, duration: 0.5 }}
                            className="flex flex-col items-center text-center group"
                        >
                            <div className={`w-12 h-12 rounded-xl ${step.color} shadow-lg flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300 ring-4 ring-white`}>
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-gray-500 text-sm px-4">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProcessTimeline;
