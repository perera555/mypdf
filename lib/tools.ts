import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Combine,
  Scissors,
  LayoutGrid,
  RotateCw,
  PenLine,
  Signature,
  EyeOff,
  Stamp,
  Hash,
  Crop,
  FormInput,
  ImagePlus,
  Images,
  FileText,
  Type,
  Minimize2,
  Lock,
  LockOpen,
  Info,
  ScanLine,
} from "lucide-react";

export type Category = "View & Edit" | "Organize" | "Convert" | "Optimize & Secure";

export interface Tool {
  slug: string;
  name: string;
  short: string;
  description: string;
  category: Category;
  icon: LucideIcon;
  /** Tailwind gradient classes for the icon tile */
  color: string;
}

export const CATEGORIES: Category[] = ["View & Edit", "Organize", "Convert", "Optimize & Secure"];

export const TOOLS: Tool[] = [
  {
    slug: "view",
    name: "PDF Reader",
    short: "Open, read, search and print PDFs.",
    description:
      "Read any PDF with page thumbnails, zoom, full-text search and printing — right in your browser.",
    category: "View & Edit",
    icon: BookOpen,
    color: "from-sky-500 to-blue-600",
  },
  {
    slug: "edit",
    name: "Edit PDF",
    short: "Add text, drawings, shapes, images and highlights.",
    description:
      "Annotate and edit PDFs: add text, freehand drawing, highlights, shapes, images, white-out and more.",
    category: "View & Edit",
    icon: PenLine,
    color: "from-violet-500 to-purple-600",
  },
  {
    slug: "sign",
    name: "Sign PDF",
    short: "Draw, type or upload your signature.",
    description: "Create a signature by drawing, typing or uploading an image and place it anywhere on your PDF.",
    category: "View & Edit",
    icon: Signature,
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    slug: "redact",
    name: "Redact PDF",
    short: "Permanently black out sensitive content.",
    description:
      "Draw redaction boxes over sensitive information. Redacted pages are flattened so hidden content is really removed.",
    category: "View & Edit",
    icon: EyeOff,
    color: "from-zinc-600 to-zinc-900",
  },
  {
    slug: "fill-forms",
    name: "Fill Forms",
    short: "Fill in PDF form fields and flatten.",
    description: "Fill out interactive PDF forms — text boxes, checkboxes, dropdowns and radio buttons — then save or flatten.",
    category: "View & Edit",
    icon: FormInput,
    color: "from-teal-500 to-emerald-600",
  },
  {
    slug: "merge",
    name: "Merge PDF",
    short: "Combine several PDFs into one.",
    description: "Combine multiple PDF files into a single document. Drag to set the order.",
    category: "Organize",
    icon: Combine,
    color: "from-rose-500 to-red-600",
  },
  {
    slug: "split",
    name: "Split PDF",
    short: "Extract page ranges or split every page.",
    description: "Split a PDF into separate files by page ranges, extract selected pages, or burst every page.",
    category: "Organize",
    icon: Scissors,
    color: "from-orange-500 to-amber-600",
  },
  {
    slug: "organize",
    name: "Organize Pages",
    short: "Reorder, rotate, delete and insert pages.",
    description: "Drag pages to reorder them, rotate, duplicate, delete or insert blank pages, then save.",
    category: "Organize",
    icon: LayoutGrid,
    color: "from-amber-500 to-yellow-600",
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    short: "Rotate all or selected pages.",
    description: "Rotate every page or just the pages you pick by 90°, 180° or 270°.",
    category: "Organize",
    icon: RotateCw,
    color: "from-lime-500 to-green-600",
  },
  {
    slug: "crop",
    name: "Crop PDF",
    short: "Trim page margins.",
    description: "Trim the margins of every page by an exact amount on each side.",
    category: "Organize",
    icon: Crop,
    color: "from-cyan-500 to-sky-600",
  },
  {
    slug: "page-numbers",
    name: "Page Numbers",
    short: "Number your pages.",
    description: "Add page numbers with your choice of position, format, size and starting number.",
    category: "Organize",
    icon: Hash,
    color: "from-indigo-500 to-blue-600",
  },
  {
    slug: "watermark",
    name: "Watermark",
    short: "Stamp text over your pages.",
    description: "Add a text watermark with custom size, color, opacity and angle to every page.",
    category: "Organize",
    icon: Stamp,
    color: "from-blue-500 to-indigo-600",
  },
  {
    slug: "scan",
    name: "Scan to PDF",
    short: "Scan with a camera or scanner into a PDF.",
    description:
      "Capture documents with your phone or webcam, or import images from any scanner, auto-enhance them and save as one PDF.",
    category: "Convert",
    icon: ScanLine,
    color: "from-orange-500 to-red-600",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    short: "Turn JPG and PNG images into a PDF.",
    description: "Convert JPG, PNG and WebP images into a PDF, with page size, orientation and margin options.",
    category: "Convert",
    icon: ImagePlus,
    color: "from-yellow-500 to-orange-600",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    short: "Export pages as JPG or PNG.",
    description: "Save every page of a PDF as a high-quality JPG or PNG image, downloaded as a ZIP.",
    category: "Convert",
    icon: Images,
    color: "from-emerald-500 to-teal-600",
  },
  {
    slug: "pdf-to-text",
    name: "PDF to Text",
    short: "Extract all the text from a PDF.",
    description: "Pull out all of the text in a PDF, copy it, or download it as a .txt file.",
    category: "Convert",
    icon: FileText,
    color: "from-slate-500 to-slate-700",
  },
  {
    slug: "text-to-pdf",
    name: "Create PDF",
    short: "Write text and save it as a PDF.",
    description: "Type or paste text and turn it into a clean, paginated PDF document.",
    category: "Convert",
    icon: Type,
    color: "from-pink-500 to-rose-600",
  },
  {
    slug: "compress",
    name: "Compress PDF",
    short: "Make PDFs smaller.",
    description: "Reduce file size with lossless optimisation or stronger image-based compression.",
    category: "Optimize & Secure",
    icon: Minimize2,
    color: "from-green-500 to-emerald-600",
  },
  {
    slug: "protect",
    name: "Protect PDF",
    short: "Add a password with AES-256.",
    description: "Encrypt your PDF with a password (AES-256) and control printing, copying and editing.",
    category: "Optimize & Secure",
    icon: Lock,
    color: "from-red-500 to-rose-700",
  },
  {
    slug: "unlock",
    name: "Unlock PDF",
    short: "Remove a password you know.",
    description: "Remove the password and restrictions from a PDF, using the password you already have.",
    category: "Optimize & Secure",
    icon: LockOpen,
    color: "from-purple-500 to-violet-700",
  },
  {
    slug: "metadata",
    name: "Edit Metadata",
    short: "Change title, author and keywords.",
    description: "View and edit document properties: title, author, subject, keywords, creator and producer.",
    category: "Optimize & Secure",
    icon: Info,
    color: "from-sky-500 to-cyan-600",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
