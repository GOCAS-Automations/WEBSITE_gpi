import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imágenes subidas desde /admin al bucket público `site-images`.
    // El hostname del proyecto Supabase es <ref>.supabase.co.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
