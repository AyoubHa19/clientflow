import { DEMO_HOURS } from "@/server/demo/service";
import { LeaveDemoButton } from "./leave-demo-button";

/**
 * Says the person is in a demo, with a way to make a real account. It sits
 * in the shell's top row (ShellStatus) and takes a line of its own, last.
 */
export function DemoNotice() {
  return (
    <div className="order-last flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-2.5 text-sm text-brand">
      <p className="min-w-0 flex-1 basis-64">
        <span className="font-semibold">You&apos;re in a demo</span> with sample data, just for you.
        Change anything you like: it&apos;s deleted {DEMO_HOURS} hours after it started.
      </p>
      <LeaveDemoButton />
    </div>
  );
}
