export function getBaseUrl() {
  if (
    typeof window !== "undefined" &&
    !window.location.origin.includes("localhost") &&
    !window.location.origin.includes("127.0.0.1")
  ) {
    return window.location.origin;
  }

  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const url of candidates) {
    if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url.replace(/\/$/, "");
    }
  }

  return "https://eaisydocs2.vercel.app";
}
