import {
  Alex_Brush,
  Allura,
  Birthstone,
  Caveat,
  Cedarville_Cursive,
  Corinthia,
  Dancing_Script,
  Great_Vibes,
  Herr_Von_Muellerhoff,
  Homemade_Apple,
  Hurricane,
  Imperial_Script,
  Kristi,
  La_Belle_Aurore,
  Meddon,
  Monsieur_La_Doulaise,
  Mr_Dafoe,
  Mrs_Saint_Delafield,
  Ms_Madi,
  Parisienne,
  Pinyon_Script,
  Sacramento,
  Satisfy,
  Yellowtail,
} from "next/font/google";

// preload: false — the font files are only fetched on pages that actually draw signatures.

const mrsSaint = Mrs_Saint_Delafield({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const msMadi = Ms_Madi({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const herr = Herr_Von_Muellerhoff({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const monsieur = Monsieur_La_Doulaise({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const alex = Alex_Brush({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const allura = Allura({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const corinthia = Corinthia({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const imperial = Imperial_Script({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const parisienne = Parisienne({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const sacramento = Sacramento({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const dafoe = Mr_Dafoe({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const yellowtail = Yellowtail({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const satisfy = Satisfy({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const birthstone = Birthstone({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const hurricane = Hurricane({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const dancing = Dancing_Script({ subsets: ["latin"], weight: "600", preload: false, display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: "600", preload: false, display: "swap" });
const cedarville = Cedarville_Cursive({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const laBelle = La_Belle_Aurore({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const homemade = Homemade_Apple({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const kristi = Kristi({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });
const meddon = Meddon({ subsets: ["latin"], weight: "400", preload: false, display: "swap" });

export interface SignatureStyle {
  id: string;
  label: string;
  family: string;
  /** relative size correction so every style looks about the same height */
  scale: number;
}

const s = (id: string, label: string, font: { style: { fontFamily: string } }, scale = 1): SignatureStyle => ({ id, label, family: font.style.fontFamily, scale });

export const SIGNATURE_STYLES: SignatureStyle[] = [
  s("mrs-saint", "Executive", mrsSaint, 1.25),
  s("vibes", "Elegant", vibes, 1),
  s("ms-madi", "Modern", msMadi, 1.15),
  s("herr", "Signature", herr, 1.35),
  s("monsieur", "Royal", monsieur, 1.2),
  s("alex", "Brush", alex, 1),
  s("allura", "Graceful", allura, 1.05),
  s("pinyon", "Formal", pinyon, 0.9),
  s("corinthia", "Luxury", corinthia, 1.3),
  s("imperial", "Imperial", imperial, 1),
  s("parisienne", "Parisian", parisienne, 0.95),
  s("sacramento", "Fine pen", sacramento, 1.15),
  s("dafoe", "Bold hand", dafoe, 1.05),
  s("yellowtail", "Retro", yellowtail, 0.95),
  s("satisfy", "Casual", satisfy, 0.9),
  s("birthstone", "Classic", birthstone, 1.05),
  s("hurricane", "Flowing", hurricane, 1.2),
  s("dancing", "Friendly", dancing, 0.9),
  s("caveat", "Handwritten", caveat, 0.95),
  s("cedarville", "Natural", cedarville, 0.85),
  s("la-belle", "Quick", laBelle, 0.85),
  s("homemade", "Personal", homemade, 0.7),
  s("kristi", "Artistic", kristi, 1.15),
  s("meddon", "Calligraphy", meddon, 0.7),
];
