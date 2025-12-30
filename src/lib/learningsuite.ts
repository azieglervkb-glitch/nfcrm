/**
 * LearningSuite API Integration
 * API Version: 1.15.3
 * Documentation: https://api.learningsuite.io/api/v1/docs/
 *
 * Authentication: x-api-key Header
 * Base URL: https://api.learningsuite.io/api/v1
 *
 * WICHTIG: Die API liefert KEINEN Fortschritt pro Modul!
 * - totalProgress auf Kurs-Level (via CourseInfoForUser)
 * - visibility (locked/unlocked) pro Modul (via contentDrip)
 * - Aktuelles Modul = letztes freigeschaltetes Modul
 */

const LEARNINGSUITE_API_BASE = "https://api.learningsuite.io/api/v1";
const LEARNINGSUITE_API_KEY = process.env.LEARNINGSUITE_API_KEY || "";

// ============================================================================
// Types - Based on LearningSuite API v1.15.3
// ============================================================================

interface LearningSuiteMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  enabled?: boolean;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string;
  lastLoginAt?: string;
}

// CourseInfoForUser from /members/{memberId}/course-info/{courseId}
interface CourseInfoForUser {
  id: string;
  sid?: string;
  name: string;
  summary?: string;
  // Progress fields
  progressForCurrentMemberAccessibleContent?: number;
  progressShownToMember?: number;
  totalProgress?: number;
  // Activity
  lastVisit?: string | null;
  totalLearningTimeFormatted?: string;
  totalLearningTimeSeconds?: number;
  startDate?: string;
  hasAccess?: boolean;
}

// UserCourseProgressInfo from /members/{memberId}/courses
interface UserCourseProgressInfo {
  id?: string;
  courseId?: string;
  name?: string;
  title?: string;
  // Progress fields
  progressForCurrentMemberAccessibleContent?: number;
  progressShownToMember?: number;
  totalProgress?: number;
  // Activity
  lastVisit?: string | null;
  totalLearningTimeFormatted?: string;
  totalLearningTimeSeconds?: number;
}

// Normalized course interface for internal use
interface LearningSuiteCourse {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100 (totalProgress from API)
  progressShownToMember: number;
  lastActivityAt?: string;
  isCompleted: boolean;
  hasAccess?: boolean;
}

// Module from /courses/{courseId}/modules/{memberId}
interface LearningSuiteModule {
  id: string;
  sid?: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  indented?: boolean;
  sectionsDoneOneByOne?: boolean;
  authors?: unknown[];
  externalOrigin?: unknown;
  // ContentDrip - this is how we determine visibility
  contentDrip?: {
    contentDripType?: string; // "ON_DEMAND", "AFTER_PREVIOUS", "IMMEDIATELY"
    contentDripValue?: {
      visibility?: string; // "locked" | "unlocked" | "visible"
      description?: string;
      reasonIsMandatory?: boolean;
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
  currentModuleName: string | null;
  totalProgress: number;
  unlockedModules: number;
  totalModules: number;
  createdAt?: string; // When the member was created in LearningSuite
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
    console.warn("[LearningSuite] LEARNINGSUITE_API_KEY not configured");
    return {
      success: false,
      error: "API key not configured",
    };
  }

  const url = `${LEARNINGSUITE_API_BASE}${endpoint}`;
  console.log(`[LearningSuite] API Request: ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "x-api-key": LEARNINGSUITE_API_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LearningSuite] API error (${response.status}):`, errorText);

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
    console.error("[LearningSuite] API request error:", error);
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
 * Endpoint: GET /members/by-email?email={email}
 */
export async function getMemberByEmail(
  email: string
): Promise<LearningSuiteMember | null> {
  console.log(`[LearningSuite] Looking up member by email: ${email}`);

  const result = await apiRequest<LearningSuiteMember>(
    `/members/by-email?email=${encodeURIComponent(email)}`
  );

  if (result.success && result.data) {
    console.log(`[LearningSuite] Found member: ${result.data.id}`);
    return result.data;
  }

  console.log(`[LearningSuite] Member not found for email: ${email}`);
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

// ============================================================================
// Course Operations
// ============================================================================

/**
 * Get all courses for a member with progress information
 * Endpoint: GET /members/{memberId}/courses
 */
export async function getMemberCourses(
  memberId: string
): Promise<LearningSuiteCourse[]> {
  console.log(`[LearningSuite] Getting courses for member: ${memberId}`);

  const result = await apiRequest<UserCourseProgressInfo[]>(
    `/members/${memberId}/courses`
  );

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No courses found for member`);
    return [];
  }

  const courses = result.data;
  console.log(`[LearningSuite] Found ${courses.length} courses`);

  // Normalize to internal format
  return courses.map((c) => {
    const progress = c.totalProgress ?? c.progressShownToMember ?? 0;
    const course: LearningSuiteCourse = {
      id: c.courseId ?? c.id ?? "",
      title: c.name ?? c.title ?? "Unknown Course",
      progress: Math.round(progress),
      progressShownToMember: c.progressShownToMember ?? 0,
      lastActivityAt: c.lastVisit ?? undefined,
      isCompleted: progress >= 100,
    };
    console.log(`[LearningSuite] Course "${course.title}": ${course.progress}% progress`);
    return course;
  });
}

/**
 * Get detailed course info for a member
 * Endpoint: GET /members/{memberId}/course-info/{courseId}
 * Returns CourseInfoForUser with detailed progress
 */
export async function getMemberCourseInfo(
  memberId: string,
  courseId: string
): Promise<CourseInfoForUser | null> {
  console.log(`[LearningSuite] Getting course info: member=${memberId}, course=${courseId}`);

  const result = await apiRequest<CourseInfoForUser>(
    `/members/${memberId}/course-info/${courseId}`
  );

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No course info found`);
    return null;
  }

  const info = result.data;
  console.log(`[LearningSuite] Course info: totalProgress=${info.totalProgress}%, hasAccess=${info.hasAccess}`);
  return info;
}

// ============================================================================
// Module Operations
// ============================================================================

/**
 * Get modules for a course with visibility for a specific member
 * Endpoint: GET /courses/{courseId}/modules/{memberId}
 *
 * WICHTIG: memberId ist ein PATH-Parameter, kein Query-Parameter!
 * Dieser Endpoint liefert Module MIT visibility (locked/unlocked) für den User
 */
export async function getCourseModulesForMember(
  courseId: string,
  memberId: string
): Promise<LearningSuiteModule[]> {
  console.log(`[LearningSuite] Getting modules: course=${courseId}, member=${memberId}`);

  // CORRECT: memberId as PATH parameter
  const result = await apiRequest<LearningSuiteModule[]>(
    `/courses/${courseId}/modules/${memberId}`
  );

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No modules found`);
    return [];
  }

  const modules = result.data;
  console.log(`[LearningSuite] Found ${modules.length} modules`);

  // Log each module's visibility
  modules.forEach((m, i) => {
    const visibility = m.contentDrip?.contentDripValue?.visibility ?? "unknown";
    const dripType = m.contentDrip?.contentDripType ?? "unknown";
    console.log(`[LearningSuite] Module ${i + 1}: "${m.name}" - visibility: ${visibility}, type: ${dripType}`);
  });

  return modules;
}

/**
 * Determine current module based on visibility
 * Current module = last unlocked module (the one the user is working on)
 */
function determineCurrentModule(modules: LearningSuiteModule[]): {
  moduleNumber: number | null;
  moduleName: string | null;
  unlockedCount: number;
} {
  if (modules.length === 0) {
    return { moduleNumber: null, moduleName: null, unlockedCount: 0 };
  }

  // Find all unlocked modules
  const unlockedModules: { index: number; name: string }[] = [];

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    const visibility = m.contentDrip?.contentDripValue?.visibility;

    // Module is unlocked if:
    // - visibility is "unlocked" or "visible"
    // - visibility is undefined/null (no restriction)
    // - contentDripType is "IMMEDIATELY"
    const isUnlocked =
      visibility === "unlocked" ||
      visibility === "visible" ||
      visibility === undefined ||
      visibility === null ||
      m.contentDrip?.contentDripType === "IMMEDIATELY";

    if (isUnlocked) {
      unlockedModules.push({ index: i + 1, name: m.name });
    }
  }

  console.log(`[LearningSuite] Unlocked modules: ${unlockedModules.length}/${modules.length}`);

  if (unlockedModules.length === 0) {
    // No unlocked modules - user hasn't started yet, assume module 1
    console.log(`[LearningSuite] No unlocked modules found, defaulting to module 1`);
    return {
      moduleNumber: 1,
      moduleName: modules[0]?.name ?? null,
      unlockedCount: 0,
    };
  }

  // Current module = last unlocked module
  const current = unlockedModules[unlockedModules.length - 1];
  console.log(`[LearningSuite] Current module: #${current.index} "${current.name}"`);

  return {
    moduleNumber: current.index,
    moduleName: current.name,
    unlockedCount: unlockedModules.length,
  };
}

// ============================================================================
// Main Progress Function
// ============================================================================

/**
 * Get comprehensive member progress by email
 * This is the main function for syncing with the CRM
 *
 * Workflow:
 * 1. E-Mail → Member-ID (via /members/by-email)
 * 2. Member → Courses with progress (via /members/{id}/courses)
 * 3. Course → Detailed info (via /members/{id}/course-info/{courseId})
 * 4. Course + Member → Modules with visibility (via /courses/{id}/modules/{memberId})
 * 5. Determine current module from visibility
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

  console.log(`[LearningSuite] Found member: ${member.id} (${member.firstName} ${member.lastName})`);

  // Step 2: Get member's courses with progress
  const courses = await getMemberCourses(member.id);
  console.log(`[LearningSuite] Got ${courses.length} courses`);

  if (courses.length === 0) {
    console.log(`[LearningSuite] No courses found, returning null progress`);
    return {
      memberId: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      courses: [],
      currentModule: null,
      currentModuleName: null,
      totalProgress: 0,
      unlockedModules: 0,
      totalModules: 0,
    };
  }

  // Step 3: Find the primary course (NF Mentoring)
  const primaryCourse = courses.find((c) => c.title.includes("NF Mentoring")) || courses[0];
  console.log(`[LearningSuite] Primary course: "${primaryCourse.title}" (${primaryCourse.id})`);

  // Step 4: Get detailed course info (optional, for more progress details)
  const courseInfo = await getMemberCourseInfo(member.id, primaryCourse.id);
  if (courseInfo) {
    primaryCourse.progress = courseInfo.totalProgress ?? primaryCourse.progress;
    primaryCourse.hasAccess = courseInfo.hasAccess;
    console.log(`[LearningSuite] Updated course progress: ${primaryCourse.progress}%`);
  }

  // Step 5: Get modules with visibility for this member
  const modules = await getCourseModulesForMember(primaryCourse.id, member.id);
  console.log(`[LearningSuite] Got ${modules.length} modules`);

  // Step 6: Determine current module from visibility
  const { moduleNumber, moduleName, unlockedCount } = determineCurrentModule(modules);

  const result: MemberProgress = {
    memberId: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    courses,
    currentModule: moduleNumber,
    currentModuleName: moduleName,
    totalProgress: primaryCourse.progress,
    unlockedModules: unlockedCount,
    totalModules: modules.length,
    createdAt: member.createdAt, // When member was created in LearningSuite
  };

  console.log(`[LearningSuite] ===== Result =====`);
  console.log(`[LearningSuite] Current Module: ${moduleNumber} "${moduleName}"`);
  console.log(`[LearningSuite] Progress: ${primaryCourse.progress}%`);
  console.log(`[LearningSuite] Unlocked: ${unlockedCount}/${modules.length} modules`);
  console.log(`[LearningSuite] ====================`);

  return result;
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
 * Sync member with LearningSuite data
 * Main function called by cronjobs and webhooks
 */
export async function syncMemberWithLearninSuite(memberEmail: string): Promise<{
  learningSuiteUserId: string | null;
  currentModule: number | null;
  synced: boolean;
  courses?: LearningSuiteCourse[];
  totalProgress?: number;
  createdAt?: string; // When member was created in LearningSuite
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
    totalProgress: progress.totalProgress,
    createdAt: progress.createdAt,
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
