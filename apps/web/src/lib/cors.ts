export const allowedOrigins = [
  "saveit://*",
  "saveit://",
  "http://localhost:8081",
  "http://localhost:8081/*",
  "http://localhost:3000",
  "http://localhost:3000/*",
];

export const updateHeaders = (headers: Headers, request: Request) => {
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  const origin = request.headers.get("Origin") || "";
  if (
    allowedOrigins.some((pattern) => {
      if (pattern.endsWith("*")) {
        return origin.startsWith(pattern.slice(0, -1));
      }
      return pattern === origin;
    })
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
};
