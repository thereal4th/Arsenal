import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The MongoDB driver and bcrypt rely on Node built-ins and dynamic requires,
  // so they must stay external to the server bundle.
  serverExternalPackages: ["mongodb", "bcryptjs"],
};

export default nextConfig;
