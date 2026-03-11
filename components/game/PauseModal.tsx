"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store/gameStore";

export function PauseModal() {
  const isPaused = useGameStore((s) => s.isPaused);
  const isHowToPlayOpen = useGameStore((s) => s.isHowToPlayOpen);
  const resume = useGameStore((s) => s.resume);
  const reset = useGameStore((s) => s.reset);
  const router = useRouter();

  // Don't show pause modal when the HowToPlay overlay is responsible for the pause
  const show = isPaused && !isHowToPlayOpen;

  return (
    <Dialog.Root open={show}>
      <AnimatePresence>
        {show && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onInteractOutside={(e) => e.preventDefault()}
              aria-describedby={undefined}
            >
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="rounded-[20px] w-full max-w-sm pointer-events-auto overflow-hidden"
                  style={{
                    background: "var(--surface-01)",
                    border: "1px solid var(--border-default)",
                    boxShadow: "var(--glow-xl)",
                  }}
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {/* Top accent bar — purple gradient */}
                  <div
                    className="w-full h-1"
                    style={{ background: "var(--gradient-brand)" }}
                  />

                  <div className="p-8">
                    <Dialog.Title
                      className="text-2xl font-black text-center mb-2"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      Game Paused
                    </Dialog.Title>
                    <p
                      className="text-center text-sm mb-8"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Take your time. The clock is stopped.
                    </p>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={resume}
                        className="w-full py-3 rounded-[8px] text-sm font-bold text-white transition-all duration-150"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          background: "var(--gradient-brand)",
                          boxShadow: "var(--glow-lg)",
                        }}
                      >
                        ▶&nbsp;&nbsp;Resume
                      </button>
                      <button
                        onClick={() => { reset(); resume(); }}
                        className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          border: "1px solid var(--border-default)",
                          background: "transparent",
                          color: "var(--text-primary)",
                        }}
                      >
                        ↺&nbsp;&nbsp;Restart
                      </button>
                      <button
                        onClick={() => router.push("/levels")}
                        className="w-full py-3 rounded-[8px] text-sm font-bold transition-all duration-150"
                        style={{
                          fontFamily: "var(--font-mono), monospace",
                          border: "1px solid var(--border-default)",
                          background: "transparent",
                          color: "var(--text-muted)",
                        }}
                      >
                        ← Quit to Levels
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
