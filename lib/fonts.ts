import { Caveat, Dancing_Script, Great_Vibes } from "next/font/google";

export const dancing = Dancing_Script({ subsets: ["latin"], weight: "600" });
export const vibes = Great_Vibes({ subsets: ["latin"], weight: "400" });
export const caveat = Caveat({ subsets: ["latin"], weight: "600" });

export const SIGNATURE_FONTS = [
  { label: "Elegant", font: vibes },
  { label: "Classic", font: dancing },
  { label: "Handwritten", font: caveat },
];
