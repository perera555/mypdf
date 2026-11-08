# MyPDF — free PDF tools for everyone

**Live app: https://mypdf-nine.vercel.app**

A free, open-source PDF toolkit that runs entirely in your browser. Files are never uploaded, and nothing is stored on a server.
Install it as an app on Windows, Mac, Linux, Android, iPhone and iPad with the **Install app** button.

## Tools

| View & Edit | Organize | Convert | Optimize & Secure |
| --- | --- | --- | --- |
| PDF Reader (search, zoom, print) | Merge PDF | Scan to PDF (camera / scanner images) | Compress PDF |
| Edit PDF (text, draw, highlight, shapes, images, white-out, notes, stamps) | Split PDF | Images to PDF | Protect PDF (AES-256) |
| Sign PDF (signature, initials, date, ✓/✗) | Organize pages | PDF to Images | Unlock PDF |
| Create Signature | Rotate PDF | PDF to Text | Edit metadata |
| Seal Creator | Crop PDF | Create PDF from text | |
| Redact PDF (permanent) | Page numbers | | |
| Fill Forms | Watermark | | |

There's also **My Files**, which keeps PDFs on your device so you can open, edit, print, download, rename or delete them. Every result can be downloaded, printed, saved to My Files or opened in the Reader.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Tech

Next.js 16 (App Router), React 19, Tailwind CSS 4, [pdf.js](https://github.com/mozilla/pdf.js) for rendering, and [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib) for editing and encryption.
Every push to `main` deploys to Vercel automatically.
