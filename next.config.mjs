/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Without DATABASE_URL (local dev) tests are read from content/tests at
    // request time, which file tracing can't see.
    outputFileTracingIncludes: {
      "/**": ["./content/tests/*.json"],
    },
  },
};

export default nextConfig;
