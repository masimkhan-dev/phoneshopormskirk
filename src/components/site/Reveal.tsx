import type { ElementType, ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger in ms. */
  delay?: number;
};

/** Wraps content so it eases into place the first time it enters the viewport. */
export function Reveal({ children, as: Tag = "div", className = "", delay = 0 }: Props) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
