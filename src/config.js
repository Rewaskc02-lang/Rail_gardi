// Keep browser clients on the same API contract as the Express server.
// VITE_API_URL can override this for deployed environments.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
