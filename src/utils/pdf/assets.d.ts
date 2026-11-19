// Font files bundled for the PDFs, imported as URLs (Vite serves / fingerprints them).
declare module "*.ttf?url" {
  const src: string;
  export default src;
}
