/**
 * LearninSuite API Integration
 * Handles user progress tracking and module completion
 */

const LEARNINSUITE_API_BASE = "https://api.learningsuite.io/api/v1";
const LEARNINSUITE_API_KEY = process.env.LEARNINSUITE_API_KEY || "";

interface LearninSuiteUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  currentModule?: number;
  completedModules?: number[];
  progress?: {
    module: number;
    completed: boolean;
    completedAt?: string;
  }[];
}

interface LearninSuiteApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Decode base64 API key to get username:password
 */
function getApiCredentials(): { username: string; password: string } | null {
  if (!LEARNINSUITE_API_KEY) {
    console.warn("LEARNINSUITE_API_KEY not configured");
    return null;
  }

  try {
    const decoded = Buffer.from(LEARNINSUITE_API_KEY, "base64").toString("utf-8");
    const [username, password] = decoded.split(":");
    return { username, password };
  } catch (error) {
    console.error("Failed to decode LearninSuite API key:", error);
    return null;
  }
}

/**
 * Make authenticated request to LearninSuite API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<LearninSuiteApiResponse<T>> {
  const credentials = getApiCredentials();
  if (!credentials) {
    return {
      success: false,
      error: "API credentials not configured",
    };
  }

  const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");

  try {
    const response = await fetch(`${LEARNINSUITE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LearninSuite API error (${response.status}):`, errorText);
      return {
        success: false,
        error: `API request failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("LearninSuite API request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Find user by email and get their progress
 */
export async function getUserProgressByEmail(
  email: string
): Promise<LearninSuiteUser | null> {
  const result = await apiRequest<LearninSuiteUser[]>(`/users?email=${encodeURIComponent(email)}`);

  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  // Get first user (should be unique by email)
  const user = result.data[0];

  // Fetch detailed progress if needed
  const progressResult = await apiRequest<LearninSuiteUser>(
    `/users/${user.id}/progress`
  );

  if (progressResult.success && progressResult.data) {
    return progressResult.data;
  }

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<LearninSuiteUser | null> {
  const result = await apiRequest<LearninSuiteUser>(`/users/${userId}`);

  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

/**
 * Get current module for a user
 */
export async function getCurrentModule(email: string): Promise<number | null> {
  const user = await getUserProgressByEmail(email);
  return user?.currentModule ?? null;
}

/**
 * Check if user has completed a specific module
 */
export async function hasCompletedModule(
  email: string,
  moduleNumber: number
): Promise<boolean> {
  const user = await getUserProgressByEmail(email);
  if (!user) return false;

  // Check if module is in completed modules
  if (user.completedModules?.includes(moduleNumber)) {
    return true;
  }

  // Check progress array
  if (user.progress) {
    const moduleProgress = user.progress.find((p) => p.module === moduleNumber);
    return moduleProgress?.completed ?? false;
  }

  // Check if current module is higher than target (meaning they've passed it)
  if (user.currentModule && user.currentModule > moduleNumber) {
    return true;
  }

  return false;
}

/**
 * Sync member with LearninSuite data
 */
export async function syncMemberWithLearninSuite(memberEmail: string): Promise<{
  learningSuiteUserId: string | null;
  currentModule: number | null;
  synced: boolean;
}> {
  const user = await getUserProgressByEmail(memberEmail);

  if (!user) {
    return {
      learningSuiteUserId: null,
      currentModule: null,
      synced: false,
    };
  }

  return {
    learningSuiteUserId: user.id,
    currentModule: user.currentModule ?? null,
    synced: true,
  };
}

