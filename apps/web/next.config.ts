const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const apiOrigin = new URL(apiUrl).origin;
const isProduction = process.env.NODE_ENV === "production";

function buildRemoteImagePatterns() {
  const patterns: Array<{
    protocol: "http" | "https";
    hostname: string;
    pathname: string;
  }> = [];

  for (const envName of ["NEXT_PUBLIC_MEDIA_BASE_URL"] as const) {
    const raw = process.env[envName]?.trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        patterns.push({
          protocol: parsed.protocol.replace(":", "") as "http" | "https",
          hostname: parsed.hostname,
          pathname: "/**",
        });
      }
    } catch {
      // Ignore invalid CDN URL at build time.
    }
  }

  try {
    const api = new URL(apiOrigin);
    if (api.protocol === "http:" || api.protocol === "https:") {
      patterns.push({
        protocol: api.protocol.replace(":", "") as "http" | "https",
        hostname: api.hostname,
        pathname: "/**",
      });
    }
  } catch {
    // Ignore invalid API URL at build time.
  }

  return patterns;
}

const checkoutSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' https://js.stripe.com${isProduction ? "" : " 'unsafe-eval' 'unsafe-inline'"}`,

      "style-src 'self' 'unsafe-inline'",

      "img-src 'self' data: https:",

      "font-src 'self' data:",

      `connect-src 'self' ${apiOrigin} https://api.stripe.com`,

      "frame-src https://js.stripe.com https://hooks.stripe.com",

      "object-src 'none'",

      "base-uri 'self'",

      "form-action 'self'",

      "frame-ancestors 'none'",

    ].join("; "),

  },

  { key: "X-Frame-Options", value: "DENY" },

  { key: "X-Content-Type-Options", value: "nosniff" },

  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  ...(isProduction

    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]

    : []),

];



/** @type {import('next').NextConfig} */

const nextConfig = {

  output: "standalone",

  reactStrictMode: true,

  images: {

    remotePatterns: buildRemoteImagePatterns(),

  },

  async headers() {

    return [

      {

        source: "/checkout",

        headers: checkoutSecurityHeaders,

      },

      {

        source: "/checkout/:path*",

        headers: checkoutSecurityHeaders,

      },

      {

        source: "/sw.js",

        headers: [

          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },

          { key: "Service-Worker-Allowed", value: "/" },

        ],

      },

    ];

  },

};



export default nextConfig;

