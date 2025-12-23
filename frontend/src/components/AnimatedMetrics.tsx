import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useSpring, useMotionValue, useTransform } from 'framer-motion';

const AnimatedCounter = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
    const rounded = useTransform(springValue, (latest) => Math.round(latest));

    useEffect(() => {
        if (inView) {
            motionValue.set(value);
        }
    }, [inView, value, motionValue]);

    useEffect(() => {
        return rounded.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = latest + suffix;
            }
        });
    }, [rounded, suffix]);

    return <span ref={ref} />;
};


const AnimatedMetrics: React.FC = () => {
    const stats = [
        {
            value: 70,
            suffix: "%",
            prefix: "↓",
            label: "Faster Time-to-MVP",
            sublabel: "Reduction in development cycle"
        },
        {
            value: 3,
            suffix: "x",
            prefix: "",
            label: "Pilot Conversion",
            sublabel: "Higher success rate vs avg"
        },
        {
            value: 100,
            suffix: "%",
            prefix: "",
            label: "Unified Visibility",
            sublabel: "Real-time portfolio tracking"
        }
    ];

    return (
        <section className="py-20 bg-accent-600 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-accent-400/30">
                    {stats.map((stat, index) => (
                        <div key={index} className="pt-8 md:pt-0 flex flex-col items-center justify-center">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1, type: "spring", bounce: 0.4 }}
                                className="text-5xl md:text-7xl font-bold mb-2 tracking-tight flex items-center"
                            >
                                {stat.prefix && <span className="mr-2 text-3xl opacity-80">{stat.prefix}</span>}
                                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                            </motion.div>
                            <div className="text-accent-50 text-lg font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                            <div className="text-accent-200 text-sm">{stat.sublabel}</div>

                        </div>
                    ))}
                </div>
                <div className="text-center mt-12 pt-12 border-t border-accent-500/30">
                    <p className="text-accent-100 font-medium">
                        <span className="opacity-75">Impact:</span> ↓ Waste via reusable components and automated workflows.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AnimatedMetrics;
