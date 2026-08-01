/** @type {import('next').NextConfig} */
const nextConfig = {
  // Browser API calls go through the /api/proxy route handler, which injects the
  // bearer token server-side from httpOnly cookies. NEXT_PUBLIC_API_URL is the
  // upstream origin that proxy (and server-side fetches) target.
};

export default nextConfig;
