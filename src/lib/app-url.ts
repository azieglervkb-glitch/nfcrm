/**
 * Utility functions for generating application URLs
 * Ensures APP_URL is always set in production and prevents demo/localhost links
 */

/**
 * Get the application base URL
 * Throws error in production if APP_URL is not set
 */
export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;

  // In production, APP_URL MUST be set
  if (process.env.NODE_ENV === "production") {
    if (!appUrl) {
      throw new Error(
        "CRITICAL: APP_URL environment variable is not set in production! " +
        "This will cause demo/localhost links to be sent to members. " +
        "Please set APP_URL in your environment variables."
      );
    }

    // Additional validation: reject demo/localhost URLs in production
    if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1") || appUrl.includes("demo")) {
      throw new Error(
        `CRITICAL: APP_URL contains demo/localhost URL in production: ${appUrl}. ` +
        "This will cause incorrect links to be sent to members. " +
        "Please set APP_URL to the correct production domain."
      );
    }
  }

  // In development, fallback to localhost
  return appUrl || "http://localhost:3000";
}

/**
 * Generate a form URL with token
 * @param formType - Type of form: "onboarding", "kpi-setup", "weekly"
 * @param token - Secure token for the form
 */
export function generateFormUrl(formType: string, token: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/form/${formType}/${token}`;
}

/**
 * Generate a dashboard URL
 */
export function generateDashboardUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/dashboard`;
}

/**
 * Generate a logo URL
 */
export function generateLogoUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/nf-logo.png`;
}

