import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Rudus demo - takeoff workbench",
  description:
    "Synthetic concrete takeoff demo: deterministic quantities, traceable line items, estimator review and overrides, contractor pricing profiles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
