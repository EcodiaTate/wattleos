interface EcodiaAttributionProps {
  className?: string;
}

export function EcodiaAttribution({ className }: EcodiaAttributionProps) {
  return (
    <a
      href="https://ecodia.au"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
    >
      <span className="text-[10px] text-neutral-400">Built by</span>
      <span className="inline-flex">
        <span className="bg-white text-black p-2 text-[10px] font-semibold leading-none transition-colors duration-150 hover:bg-black hover:text-white">
          Ecodia
        </span>
        <span className="bg-black text-white p-2 text-[10px] font-semibold leading-none transition-colors duration-150 hover:bg-white hover:text-black">
          Code
        </span>
      </span>
    </a>
  );
}
