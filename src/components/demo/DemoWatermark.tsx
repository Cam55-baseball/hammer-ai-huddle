export function DemoWatermark() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
      <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur">
        Demo · For Show Only
      </div>
    </div>
  );
}
