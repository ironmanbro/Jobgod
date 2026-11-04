import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// lets `next dev` use Cloudflare bindings/vars
initOpenNextCloudflareForDev();
