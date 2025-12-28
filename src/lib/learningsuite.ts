/**
 * LearningSuite API Integration
 * Documentation: https://api.learningsuite.io/api/v1/docs/
 *
 * Authentication: x-api-key Header
 * Base URL: https://api.learningsuite.io/api/v1
 */

const LEARNINGSUITE_API_BASE = "https://api.learningsuite.io/api/v1";
const LEARNINGSUITE_API_KEY = process.env.LEARNINGSUITE_API_KEY || "";

// ============================================================================
// Types
// ============================================================================

interface LearningSuiteMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface LearningSuiteCourse {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  completedLessons: number;
  totalLessons: number;
  lastActivityAt?: string;
  isCompleted: boolean;
}

interface LearningSuiteModule {
  id: string;
  title: string;
  position: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  lessonsCompleted: number;
  lessonsTotal: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MemberProgress {
  memberId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  courses: LearningSuiteCourse[];
  currentModule: number | null;
  totalProgress: number;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Make authenticated request to LearningSuite API
 * Uses x-api-key header for authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!LEARNINGSUITE_API_KEY) {
    console.warn("LEARNINGSUITE_API_KEY not configured");
    return {
      success: false,
      error: "API key not configured",
    };
  }

  try {
    const response = await fetch(`${LEARNINGSUITE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "x-api-key": LEARNINGSUITE_API_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LearningSuite API error (${response.status}):`, errorText);

      if (response.status === 404) {
        return { success: false, error: "Not found" };
      }

      return {
        success: false,
        error: `API request failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("LearningSuite API request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Member Operations
// ============================================================================

/**
 * Get member by email address
 * Endpoint: GET /members?email={email}
 */
export async function getMemberByEmail(
  email: string
): Promise<LearningSuiteMember | null> {
  const result = await apiRequest<LearningSuiteMember>(
    `/members?email=${encodeURIComponent(email)}`
  );

  if (!result.success || !result.data) {
    console.log(`Member not found in LearningSuite: ${email}`);
    return null;
  }

  return result.data;
}

/**
 * Get member by ID
 * Endpoint: GET /members/{id}
 */
export async function getMemberById(
  memberId: string
): Promise<LearningSuiteMember | null> {
  const result = await apiRequest<LearningSuiteMember>(`/members/${memberId}`);

  if (!result.success || !result.data) {
    return null;
  }

  return result.data;
}

/**
 * Get member's courses with progress
 * Endpoint: GET /members/{id}/courses
 */
export async function getMemberCourses(
  memberId: string
): Promise<LearningSuiteCourse[]> {
  const result = await apiRequest<{ data: LearningSuiteCourse[] } | LearningSuiteCourse[]>(
    `/members/${memberId}/courses`
  );

  if (!result.success || !result.data) {
    return [];
  }

  // Handle both array and { data: [...] } response formats
  const courses = Array.isArray(result.data) ? result.data : result.data.data || [];
  return courses;
}

/**
 * Get modules for a specific course and member
 * Endpoint: GET /courses/{courseId}/modules?memberId={memberId}
 */
export async function getCourseModulesForMember(
  courseId: string,
  memberId: string
): Promise<LearningSuiteModule[]> {
  const result = await apiRequest<{ data: LearningSuiteModule[] } | LearningSuiteModule[]>(
    `/courses/${courseId}/modules?memberId=${memberId}`
  );

  if (!result.success || !result.data) {
    return [];
  }

  const modules = Array.isArray(result.data) ? result.data : result.data.data || [];
  return modules;
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Calculate current module based on course progress
 * Returns the highest module number that the user has started but not completed,
 * or the last completed module + 1
 */
function calculateCurrentModule(modules: LearningSuiteModule[]): number | null {
  if (modules.length === 0) return null;

  // Sort by position
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);

  // Find the first unlocked but not completed module
  for (const module of sortedModules) {
    if (module.isUnlocked && !module.isCompleted) {
      return module.position;
    }
  }

  // If all modules are completed, return the last module position
  const lastCompleted = sortedModules.filter(m => m.isCompleted).pop();
  if (lastCompleted) {
    return lastCompleted.position;
  }

  // Default to first module
  return 1;
}

/**
 * Get comprehensive member progress by email
 * This is the main function for syncing with the CRM
 */
export async function getMemberProgressByEmail(
  email: string
): Promise<MemberProgress | null> {
  // Step 1: Get member by email
  const member = await getMemberByEmail(email);
  if (!member) {
    return null;
  }

  // Step 2: Get member's courses
  const courses = await getMemberCourses(member.id);

  // Step 3: Determine current module from the primary/first course
  let currentModule: number | null = null;

  if (courses.length > 0) {
    // Get modules for the first/primary course
    const primaryCourse = courses[0];
    const modules = await getCourseModulesForMember(primaryCourse.id, member.id);
    currentModule = calculateCurrentModule(modules);
  }

  // Calculate total progress across all courses
  const totalProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
    : 0;

  return {
    memberId: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    courses,
    currentModule,
    totalProgress,
  };
}

// ============================================================================
// Legacy Compatibility Functions
// ============================================================================

/**
 * @deprecated Use getMemberProgressByEmail instead
 * Maintained for backward compatibility
 */
export async function getUserProgressByEmail(
  email: string
): Promise<{ id: string; email: string; currentModule?: number } | null> {
  const progress = await getMemberProgressByEmail(email);
  if (!progress) return null;

  return {
    id: progress.memberId,
    email: progress.email,
    currentModule: progress.currentModule ?? undefined,
  };
}

/**
 * @deprecated Use getMemberById instead
 */
export async function getUserById(userId: string) {
  return getMemberById(userId);
}

/**
 * Get current module for a member by email
 */
export async function getCurrentModule(email: string): Promise<number | null> {
  const progress = await getMemberProgressByEmail(email);
  return progress?.currentModule ?? null;
}

/**
 * Check if member has completed a specific module
 */
export async function hasCompletedModule(
  email: string,
  moduleNumber: number
): Promise<boolean> {
  const member = await getMemberByEmail(email);
  if (!member) return false;

  const courses = await getMemberCourses(member.id);
  if (courses.length === 0) return false;

  // Check the primary course
  const primaryCourse = courses[0];
  const modules = await getCourseModulesForMember(primaryCourse.id, member.id);

  const targetModule = modules.find(m => m.position === moduleNumber);
  return targetModule?.isCompleted ?? false;
}

/**
 * Sync member with LearningSuite data
 * Main function called by cronjobs and webhooks
 */
export async function syncMemberWithLearninSuite(memberEmail: string): Promise<{
  learningSuiteUserId: string | null;
  currentModule: number | null;
  synced: boolean;
  courses?: LearningSuiteCourse[];
}> {
  const progress = await getMemberProgressByEmail(memberEmail);

  if (!progress) {
    return {
      learningSuiteUserId: null,
      currentModule: null,
      synced: false,
    };
  }

  return {
    learningSuiteUserId: progress.memberId,
    currentModule: progress.currentModule,
    synced: true,
    courses: progress.courses,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if API is configured and accessible
 */
export async function testApiConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!LEARNINGSUITE_API_KEY) {
    return { configured: false, connected: false, error: "API key not configured" };
  }

  try {
    // Try to fetch courses as a simple connectivity test
    const result = await apiRequest<unknown>("/courses");
    return {
      configured: true,
      connected: result.success,
      error: result.error,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
