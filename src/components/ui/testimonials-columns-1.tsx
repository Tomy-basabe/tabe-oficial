import React from "react";
import { motion } from "framer-motion";

export interface TestimonialItem {
  text: string;
  image: string;
  name: string;
  role: string;
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialItem[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div
                  className="p-7 rounded-3xl border-2 border-black/15 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-foreground shadow-[4px_4px_0_0_#000] dark:shadow-none max-w-xs w-full transition-transform hover:-translate-y-1"
                  key={i}
                >
                  <p className="text-sm font-medium leading-relaxed">{text}</p>
                  <div className="flex items-center gap-3 mt-5 pt-3 border-t border-border">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-black/20 dark:border-zinc-700"
                    />
                    <div className="flex flex-col">
                      <div className="font-black text-sm tracking-tight leading-5">{name}</div>
                      <div className="text-xs font-semibold text-muted-foreground leading-4">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};
