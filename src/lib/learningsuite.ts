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
// Types - Updated to match actual API response format
// ============================================================================

interface LearningSuiteMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  enabled?: boolean;
  isActive?: boolean;
  createdAt: string;
  lastLogin?: string;
  lastLoginAt?: string;
}

// Raw API response for courses - supports multiple field names
interface LearningSuiteCourseRaw {
  // ID fields
  id?: string;
  courseId?: string;
  // Name fields
  name?: string;
  title?: string;
  courseName?: string;
  summary?: string;
  description?: string;
  // Progress fields
  progress?: number;
  progressForCurrentMemberAccessibleContent?: number;
  progressShownToMember?: number;
  totalProgress?: number;
  // Access info
  hasAccess?: boolean;
  accessGiven?: string;
  accessUntil?: string | null;
  // Activity
  lastVisit?: string | null;
  lastActivityAt?: string | null;
  startDate?: string;
}

// Normalized course interface for internal use
interface LearningSuiteCourse {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  completedLessons: number;
  totalLessons: number;
  currentModule?: string | number; // May be string like "Modul 3: Name" or number
  lastActivityAt?: string;
  isCompleted: boolean;
}

interface LearningSuiteModule {
  // ID fields
  id?: string;
  moduleId?: string;
  // Name fields
  name?: string;
  title?: string;
  moduleName?: string;
  // Position (may not be in API response)
  position?: number;
  order?: number;
  // Progress fields
  progress?: number;
  isUnlocked?: boolean;
  isCompleted?: boolean;
  lessonsCompleted?: number;
  lessonsTotal?: number;
  // ContentDrip (LearningSuite specific)
  contentDrip?: {
    contentDripType?: string;
    contentDripValue?: {
      visibility?: string; // "locked" or "unlocked"
    };
  };
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
 * Get user by email address
 * Endpoint: GET /users?email={email}
 */
export async function getMemberByEmail(
  email: string
): Promise<LearningSuiteMember | null> {
  console.log(`[LearningSuite] Looking up user by email: ${email}`);

  // Correct endpoint is /users not /members
  const result = await apiRequest<LearningSuiteMember | { data: LearningSuiteMember } | LearningSuiteMember[]>(
    `/users?email=${encodeURIComponent(email)}`
  );

  console.log(`[LearningSuite] /users?email= response:`, JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    const data = result.data;

    // Format: { data: { id, email, ... } }
    if ('data' in data && data.data && !Array.isArray(data.data)) {
      console.log(`[LearningSuite] Found user (nested format): ${(data.data as LearningSuiteMember).id}`);
      return data.data as LearningSuiteMember;
    }

    // Format: [{ id, email, ... }]
    if (Array.isArray(data) && data.length > 0) {
      console.log(`[LearningSuite] Found user (array format): ${data[0].id}`);
      return data[0];
    }

    // Format: { id, email, ... } directly
    if ('id' in data && 'email' in data) {
      console.log(`[LearningSuite] Found user (direct format): ${(data as LearningSuiteMember).id}`);
      return data as LearningSuiteMember;
    }
  }

  console.log(`[LearningSuite] User not found: ${email}`);
  return null;
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
 * Normalize raw course data from API to internal format
 */
function normalizeCourse(raw: LearningSuiteCourseRaw): LearningSuiteCourse {
  // Use progress field - API should return this directly now
  const progress = raw.progress ?? raw.progressShownToMember ?? raw.totalProgress ?? 0;

  return {
    id: raw.courseId ?? raw.id ?? "",
    title: raw.courseName ?? raw.title ?? raw.name ?? "Unknown Course",
    description: raw.description ?? raw.summary,
    progress: Math.round(progress),
    completedLessons: 0,
    totalLessons: 0,
    lastActivityAt: raw.lastActivityAt ?? raw.lastVisit ?? undefined,
    isCompleted: progress >= 100,
  };
}

/**
 * Get user's courses with progress
 * Endpoint: GET /users/{userId}/courses
 */
export async function getMemberCourses(
  userId: string
): Promise<LearningSuiteCourse[]> {
  console.log(`[LearningSuite] Getting courses for user: ${userId}`);

  // Correct endpoint is /users not /members
  const result = await apiRequest<{ data: LearningSuiteCourseRaw[] } | LearningSuiteCourseRaw[]>(
    `/users/${userId}/courses`
  );

  console.log(`[LearningSuite] /users/${userId}/courses response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No courses found for user`);
    return [];
  }

  // Handle both array and { data: [...] } response formats
  const rawCourses = Array.isArray(result.data) ? result.data : result.data.data || [];
  console.log(`[LearningSuite] Found ${rawCourses.length} courses`);

  // Normalize to internal format
  const courses = rawCourses.map(normalizeCourse);

  // Log normalized progress
  courses.forEach(c => console.log(`[LearningSuite] Course "${c.title}": ${c.progress}% progress`));

  return courses;
}

/**
 * Get detailed course info for a user
 * Endpoint: GET /users/{userId}/courses/{courseId}
 */
export async function getMemberCourseDetails(
  userId: string,
  courseId: string
): Promise<LearningSuiteCourse | null> {
  console.log(`[LearningSuite] Getting course details: user=${userId}, course=${courseId}`);

  // Correct endpoint is /users not /members
  const result = await apiRequest<LearningSuiteCourseRaw | { data: LearningSuiteCourseRaw }>(
    `/users/${userId}/courses/${courseId}`
  );

  console.log(`[LearningSuite] /users/${userId}/courses/${courseId} response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No course details found`);
    return null;
  }

  // Handle nested data format
  const raw = 'data' in result.data && result.data.data ? result.data.data : result.data as LearningSuiteCourseRaw;
  const course = normalizeCourse(raw);

  console.log(`[LearningSuite] Course details: progress=${course.progress}%`);
  return course;
}

/**
 * Get modules for a specific course and user
 * Tries multiple endpoint formats to find progress data
 */
export async function getCourseModulesForMember(
  courseId: string,
  userId: string
): Promise<LearningSuiteModule[]> {
  console.log(`[LearningSuite] Getting modules: course=${courseId}, user=${userId}`);

  // Try endpoint 1: /users/{userId}/courses/{courseId}/modules
  console.log(`[LearningSuite] Trying: /users/${userId}/courses/${courseId}/modules`);
  let result = await apiRequest<{ data: LearningSuiteModule[] } | LearningSuiteModule[]>(
    `/users/${userId}/courses/${courseId}/modules`
  );

  if (!result.success || !result.data) {
    // Try endpoint 2: /courses/{courseId}/modules?userId={userId}
    console.log(`[LearningSuite] Trying: /courses/${courseId}/modules?userId=${userId}`);
    result = await apiRequest<{ data: LearningSuiteModule[] } | LearningSuiteModule[]>(
      `/courses/${courseId}/modules?userId=${userId}`
    );
  }

  if (!result.success || !result.data) {
    // Try endpoint 3: /courses/{courseId}/topics (LearningSuite may use "topics" for modules)
    console.log(`[LearningSuite] Trying: /courses/${courseId}/topics?userId=${userId}`);
    result = await apiRequest<{ data: LearningSuiteModule[] } | LearningSuiteModule[]>(
      `/courses/${courseId}/topics?userId=${userId}`
    );
  }

  console.log(`[LearningSuite] Modules response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No modules found from any endpoint`);
    return [];
  }

  const modules = Array.isArray(result.data) ? result.data : result.data.data || [];
  console.log(`[LearningSuite] Found ${modules.length} modules`);

  // Log each module's progress
  modules.forEach((m, i) => {
    const name = m.name ?? m.title ?? `Module ${i + 1}`;
    console.log(`[LearningSuite] Module ${i + 1}: "${name}" - unlocked: ${m.isUnlocked}, completed: ${m.isCompleted}, progress: ${m.progress ?? 'N/A'}`);
  });

  return modules;
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Calculate current module based on module progress data
 * Returns the position of the first module that is unlocked but not completed
 */
function calculateCurrentModule(modules: LearningSuiteModule[]): number | null {
  if (modules.length === 0) {
    console.log(`[LearningSuite] No modules found`);
    return null;
  }

  // Check if we have real progress data (isUnlocked, isCompleted, or progress fields)
  const hasProgressData = modules.some(m =>
    m.progress !== undefined || m.isUnlocked !== undefined || m.isCompleted !== undefined
  );

  if (hasProgressData) {
    console.log(`[LearningSuite] Using progress data from modules`);
    // Find first module that is unlocked but not complete (progress < 100)
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      const progress = m.progress ?? 0;
      const isUnlocked = m.isUnlocked ?? true;
      const isComplete = m.isCompleted ?? (progress >= 100);

      if (isUnlocked && !isComplete) {
        const moduleNum = i + 1;
        const name = m.moduleName ?? m.name ?? m.title ?? `Module ${moduleNum}`;
        console.log(`[LearningSuite] Current module: #${moduleNum} "${name}" (${progress}%)`);
        return moduleNum;
      }
    }

    // All modules completed - return last one
    console.log(`[LearningSuite] All modules completed`);
    return modules.length;
  }

  // Check if we have contentDrip visibility info
  const hasContentDrip = modules.some(m => m.contentDrip?.contentDripValue?.visibility);
  if (hasContentDrip) {
    console.log(`[LearningSuite] Using contentDrip visibility from modules`);
    // Find last module that is not "locked" - that's likely the current one
    let lastUnlocked = 0;
    for (let i = 0; i < modules.length; i++) {
      const visibility = modules[i].contentDrip?.contentDripValue?.visibility;
      // If visibility is not "locked" or undefined (meaning accessible)
      if (visibility !== 'locked') {
        lastUnlocked = i + 1;
      }
    }
    if (lastUnlocked > 0) {
      const name = modules[lastUnlocked - 1].name ?? modules[lastUnlocked - 1].title ?? `Module ${lastUnlocked}`;
      console.log(`[LearningSuite] Current module from contentDrip: #${lastUnlocked} "${name}"`);
      return lastUnlocked;
    }
  }

  console.log(`[LearningSuite] API returned modules but NO progress data - cannot determine current module`);
  return null;
}

/**
 * Estimate current module from course progress percentage
 * Used as fallback when module-level progress is not available
 */
function estimateModuleFromProgress(progressPercent: number, totalModules: number): number | null {
  if (progressPercent <= 0 || totalModules <= 0) {
    return null;
  }

  // Calculate which module the user is likely on based on progress
  // e.g., 35% progress with 14 modules = module ~5
  const estimatedModule = Math.ceil((progressPercent / 100) * totalModules);

  // Ensure we return at least 1 and at most totalModules
  const result = Math.max(1, Math.min(estimatedModule, totalModules));
  console.log(`[LearningSuite] Estimated module from progress: ${progressPercent}% of ${totalModules} modules = module ${result}`);
  return result;
}

/**
 * Parse current module from string or number format
 * API may return "Modul 3: Kundenakquise" or just 3
 */
function parseCurrentModule(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;

  if (typeof value === 'number') return value;

  // Try to extract number from string like "Modul 3: Name" or "Modul 3"
  const match = value.match(/Modul\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);

  // Try parsing as plain number string
  const num = parseInt(value, 10);
  if (!isNaN(num)) return num;

  return null;
}

/**
 * Get comprehensive member progress by email
 * This is the main function for syncing with the CRM
 */
export async function getMemberProgressByEmail(
  email: string
): Promise<MemberProgress | null> {
  console.log(`[LearningSuite] ===== Getting progress for: ${email} =====`);

  // Step 1: Get member by email
  const member = await getMemberByEmail(email);
  if (!member) {
    console.log(`[LearningSuite] Member not found, aborting`);
    return null;
  }

  console.log(`[LearningSuite] Found member: ${member.id}`);

  // Step 2: Get member's courses
  const courses = await getMemberCourses(member.id);
  console.log(`[LearningSuite] Got ${courses.length} courses`);

  // Step 3: Determine current module from the primary course (NF Mentoring)
  let currentModule: number | null = null;

  if (courses.length > 0) {
    // Find "Das NF Mentoring" course, or fall back to first course
    const nfMentoringCourse = courses.find(c => c.title.includes("NF Mentoring")) || courses[0];
    console.log(`[LearningSuite] Primary course: "${nfMentoringCourse.title}" (${nfMentoringCourse.id})`);

    // Strategy 1: Check if currentModule is already in course data
    if (nfMentoringCourse.currentModule) {
      currentModule = parseCurrentModule(nfMentoringCourse.currentModule);
      console.log(`[LearningSuite] Got currentModule from course list: ${currentModule}`);
    }

    // Strategy 2: Try detailed course endpoint for more info
    if (currentModule === null) {
      console.log(`[LearningSuite] Trying detailed course endpoint...`);
      const courseDetails = await getMemberCourseDetails(member.id, nfMentoringCourse.id);
      if (courseDetails?.currentModule) {
        currentModule = parseCurrentModule(courseDetails.currentModule);
        console.log(`[LearningSuite] Got currentModule from course details: ${currentModule}`);
      }
    }

    // Strategy 3: Fall back to modules endpoint
    let moduleCount = 0;
    if (currentModule === null) {
      console.log(`[LearningSuite] Trying modules endpoint...`);
      const modules = await getCourseModulesForMember(nfMentoringCourse.id, member.id);
      moduleCount = modules.length;
      console.log(`[LearningSuite] Got ${moduleCount} modules`);
      currentModule = calculateCurrentModule(modules);
      console.log(`[LearningSuite] Calculated from modules: ${currentModule}`);
    }

    // Strategy 4: Estimate from course progress percentage
    if (currentModule === null && nfMentoringCourse.progress > 0 && moduleCount > 0) {
      console.log(`[LearningSuite] Trying progress estimation fallback...`);
      currentModule = estimateModuleFromProgress(nfMentoringCourse.progress, moduleCount);
      console.log(`[LearningSuite] Estimated from progress: ${currentModule}`);
    }
  }

  // Calculate total progress across all courses
  const totalProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length)
    : 0;

  console.log(`[LearningSuite] Final currentModule: ${currentModule}, totalProgress: ${totalProgress}%`);
  console.log(`[LearningSuite] ===== Progress sync complete =====`);

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
