import React from "react";

export function Tooltip({ 
  children, 
  content, 
  placement = "top",
  className = ""
}: { 
  children: React.ReactNode; 
  content?: string;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  if (!content) return <>{children}</>;

  const placementClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2 -translate-y-1 group-hover:-translate-y-0.5",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2 translate-y-1 group-hover:translate-y-0.5",
    left: "right-full mr-2 top-1/2 -translate-y-1/2 -translate-x-1 group-hover:-translate-x-0.5",
    right: "left-full ml-2 top-1/2 -translate-y-1/2 translate-x-1 group-hover:translate-x-0.5",
  };

  const arrowClasses = {
    top: "left-1/2 -bottom-[8px] -translate-x-1/2 border-[4px] border-transparent border-t-zinc-900 dark:border-t-white",
    bottom: "left-1/2 -top-[8px] -translate-x-1/2 border-[4px] border-transparent border-b-zinc-900 dark:border-b-white",
    left: "top-1/2 -right-[8px] -translate-y-1/2 border-[4px] border-transparent border-l-zinc-900 dark:border-l-white",
    right: "top-1/2 -left-[8px] -translate-y-1/2 border-[4px] border-transparent border-r-zinc-900 dark:border-r-white",
  };

  return (
    <div className={`group relative inline-flex items-center justify-center ${className}`}>
      {children}
      <div className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-200 delay-300 pointer-events-none z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[11px] font-bold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap max-w-[200px] text-center truncate ${placementClasses[placement]}`}>
        {content}
        <div className={`absolute ${arrowClasses[placement]}`}></div>
      </div>
    </div>
  );
}
