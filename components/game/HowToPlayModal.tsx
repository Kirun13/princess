"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

const RULES = [
  "Place exactly one queen per row",
  "Place exactly one queen per column",
  "One queen per color region",
  "No queens touching (incl. diagonals)",
];

const CONTROLS: [string, string][] = [
  ["Click", "Toggle mark (empty ↔ ×)"],
  ["Double-click", "Place queen (♛)"],
  ["Drag", "Paint / erase marks"],
  ["Right-click", "Remove queen or mark"],
  ["Space", "Toggle mark on focused cell"],
  ["Space + ↑↓←→", "Paint marks while navigating"],
  ["Enter", "Place queen on focused cell"],
  ["R", "Reset board"],
  ["P", "Pause / resume"],
  ["Esc", "Back to levels"],
];

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
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
              onInteractOutside={onClose}
              onEscapeKeyDown={(e) => e.preventDefault()}
              aria-describedby={undefined}
            >
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="rounded-[20px] w-full max-w-md pointer-events-auto overflow-hidden"
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
                  <div className="w-full h-1" style={{ background: "var(--gradient-brand)" }} />

                  <div className="p-6">
                    <Dialog.Title
                      className="text-xl font-black text-center mb-5"
                      style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-primary)" }}
                    >
                      How to Play
                    </Dialog.Title>

                    {/* Rules */}
                    <p
                      className="text-[10px] uppercase tracking-[3px] mb-2"
                      style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                    >
                      Rules
                    </p>
                    <ul className="space-y-1.5 mb-4">
                      {RULES.map((rule) => (
                        <li
                          key={rule}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
                        >
                          <span style={{ color: "var(--brand-light)" }} className="shrink-0 mt-px">♛</span>
                          {rule}
                        </li>
                      ))}
                    </ul>

                    <div className="h-px mb-4" style={{ background: "var(--border-subtle)" }} />

                    {/* Controls */}
                    <p
                      className="text-[10px] uppercase tracking-[3px] mb-2"
                      style={{ fontFamily: "var(--font-mono), monospace", color: "var(--text-muted)" }}
                    >
                      Controls
                    </p>
                    <ul className="space-y-1.5 mb-5">
                      {CONTROLS.map(([key, desc]) => (
                        <li key={key} className="flex items-center justify-between gap-3">
                          <kbd
                            className="px-2 py-0.5 rounded text-[11px] shrink-0"
                            style={{
                              background: "var(--surface-02)",
                              color: "var(--text-primary)",
                              border: "1px solid var(--border-default)",
                              fontFamily: "var(--font-mono), monospace",
                            }}
                          >
                            {key}
                          </kbd>
                          <span
                            className="text-xs text-right"
                            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}
                          >
                            {desc}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={onClose}
                      className="w-full py-3 rounded-[8px] text-sm font-bold text-white"
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        background: "var(--gradient-brand)",
                        boxShadow: "var(--glow-sm)",
                      }}
                    >
                      Got it!
                    </button>
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
