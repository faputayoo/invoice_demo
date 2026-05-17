import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs", "pdf-parse", "tesseract.js"],
};

export default nextConfig;
