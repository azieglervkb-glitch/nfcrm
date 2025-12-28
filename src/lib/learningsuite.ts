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

// Raw API response for courses
interface LearningSuiteCourseRaw {
  id: string;
  sid?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  // Progress fields - API may use different names
  progress?: number;
  progressForCurrentMemberAccessibleContent?: number;
  progressShownToMember?: number;
  totalProgress?: number;
  // Module info - may be directly on course
  currentModule?: string | number;
  completedLessons?: number;
  totalLessons?: number;
  // Activity
  lastVisit?: string | null;
  lastActivityAt?: string | null;
  totalLearningTimeSeconds?: number;
  startDate?: string;
  hasAccess?: boolean;
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
  id: string;
  title?: string;
  name?: string;
  position: number;
  order?: number;
  isUnlocked?: boolean;
  isCompleted?: boolean;
  lessonsCompleted?: number;
  lessonsTotal?: number;
  progress?: number;
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
 * Tries multiple endpoint formats as LearningSuite API may vary
 */
export async function getMemberByEmail(
  email: string
): Promise<LearningSuiteMember | null> {
  console.log(`[LearningSuite] Looking up member by email: ${email}`);

  // Try 1: Direct email query parameter
  let result = await apiRequest<LearningSuiteMember | { data: LearningSuiteMember } | { data: LearningSuiteMember[] } | LearningSuiteMember[]>(
    `/members?email=${encodeURIComponent(email)}`
  );

  console.log(`[LearningSuite] /members?email= response:`, JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    // Handle various response formats
    const data = result.data;

    // Format: { data: { id, email, ... } }
    if ('data' in data && data.data && !Array.isArray(data.data)) {
      console.log(`[LearningSuite] Found member (nested object format)`);
      return data.data as LearningSuiteMember;
    }

    // Format: { data: [{ id, email, ... }] }
    if ('data' in data && Array.isArray(data.data) && data.data.length > 0) {
      console.log(`[LearningSuite] Found member (nested array format)`);
      return data.data[0] as LearningSuiteMember;
    }

    // Format: [{ id, email, ... }]
    if (Array.isArray(data) && data.length > 0) {
      console.log(`[LearningSuite] Found member (array format)`);
      return data[0] as LearningSuiteMember;
    }

    // Format: { id, email, ... } directly
    if ('id' in data && 'email' in data) {
      console.log(`[LearningSuite] Found member (direct object format)`);
      return data as LearningSuiteMember;
    }
  }

  // Try 2: Get all members and filter by email
  console.log(`[LearningSuite] Trying to list all members and filter by email...`);
  const listResult = await apiRequest<{ data: LearningSuiteMember[] } | LearningSuiteMember[]>(`/members`);
  console.log(`[LearningSuite] /members response success: ${listResult.success}, has data: ${!!listResult.data}`);

  if (listResult.success && listResult.data) {
    const members = Array.isArray(listResult.data)
      ? listResult.data
      : (listResult.data as { data: LearningSuiteMember[] }).data || [];

    console.log(`[LearningSuite] Total members in list: ${members.length}`);

    const member = members.find(m => m.email?.toLowerCase() === email.toLowerCase());
    if (member) {
      console.log(`[LearningSuite] Found member by filtering: ${member.id}`);
      return member;
    }
  }

  console.log(`[LearningSuite] Member not found in LearningSuite: ${email}`);
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
  // Use progress field first, then fallbacks
  const progress = raw.progress ?? raw.progressShownToMember ?? raw.totalProgress ?? raw.progressForCurrentMemberAccessibleContent ?? 0;

  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? "Unknown Course",
    description: raw.description ?? raw.summary,
    progress: Math.round(progress),
    completedLessons: raw.completedLessons ?? 0,
    totalLessons: raw.totalLessons ?? 0,
    currentModule: raw.currentModule,
    lastActivityAt: raw.lastActivityAt ?? raw.lastVisit ?? undefined,
    isCompleted: progress >= 100,
  };
}

/**
 * Get member's courses with progress
 * Endpoint: GET /members/{id}/courses
 */
export async function getMemberCourses(
  memberId: string
): Promise<LearningSuiteCourse[]> {
  console.log(`[LearningSuite] Getting courses for member: ${memberId}`);

  const result = await apiRequest<{ data: LearningSuiteCourseRaw[] } | LearningSuiteCourseRaw[]>(
    `/members/${memberId}/courses`
  );

  console.log(`[LearningSuite] /members/${memberId}/courses response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No courses found for member`);
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
 * Get detailed course info for a member
 * Endpoint: GET /members/{memberId}/courses/{courseId}
 * This may return more detailed progress info including currentModule
 */
export async function getMemberCourseDetails(
  memberId: string,
  courseId: string
): Promise<LearningSuiteCourse | null> {
  console.log(`[LearningSuite] Getting course details: member=${memberId}, course=${courseId}`);

  const result = await apiRequest<LearningSuiteCourseRaw | { data: LearningSuiteCourseRaw }>(
    `/members/${memberId}/courses/${courseId}`
  );

  console.log(`[LearningSuite] /members/${memberId}/courses/${courseId} response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No course details found`);
    return null;
  }

  // Handle nested data format
  const raw = 'data' in result.data && result.data.data ? result.data.data : result.data as LearningSuiteCourseRaw;
  const course = normalizeCourse(raw);

  console.log(`[LearningSuite] Course details: progress=${course.progress}%, currentModule=${course.currentModule}`);
  return course;
}

/**
 * Get modules for a specific course and member
 * Endpoint: GET /courses/{courseId}/modules?memberId={memberId}
 */
export async function getCourseModulesForMember(
  courseId: string,
  memberId: string
): Promise<LearningSuiteModule[]> {
  console.log(`[LearningSuite] Getting modules for course: ${courseId}, member: ${memberId}`);

  const result = await apiRequest<{ data: LearningSuiteModule[] } | LearningSuiteModule[]>(
    `/courses/${courseId}/modules?memberId=${memberId}`
  );

  console.log(`[LearningSuite] /courses/${courseId}/modules response:`, JSON.stringify(result, null, 2));

  if (!result.success || !result.data) {
    console.log(`[LearningSuite] No modules found for course`);
    return [];
  }

  const modules = Array.isArray(result.data) ? result.data : result.data.data || [];
  console.log(`[LearningSuite] Found ${modules.length} modules`);

  // Log each module's progress
  modules.forEach((m, i) => {
    const pos = m.position ?? m.order ?? i + 1;
    const name = m.title ?? m.name ?? `Module ${pos}`;
    console.log(`[LearningSuite] Module ${pos}: "${name}" - unlocked: ${m.isUnlocked}, completed: ${m.isCompleted}, progress: ${m.progress ?? 'N/A'}`);
  });

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
  if (modules.length === 0) {
    console.log(`[LearningSuite] No modules found - cannot determine progress`);
    return null;
  }

  // Normalize position - API might use 'position' or 'order' or just index
  const normalizedModules = modules.map((m, index) => ({
    ...m,
    position: m.position ?? m.order ?? index + 1,
    isUnlocked: m.isUnlocked ?? true, // Default to unlocked if not specified
    isCompleted: m.isCompleted ?? (m.progress !== undefined && m.progress >= 100),
  }));

  // Sort by position
  const sortedModules = [...normalizedModules].sort((a, b) => a.position - b.position);

  console.log(`[LearningSuite] Sorted modules: ${sortedModules.map(m => `${m.position}:${m.isCompleted ? 'done' : m.isUnlocked ? 'open' : 'locked'}`).join(', ')}`);

  // Find the first unlocked but not completed module (current working module)
  for (const module of sortedModules) {
    if (module.isUnlocked && !module.isCompleted) {
      console.log(`[LearningSuite] Found current module: ${module.position} (unlocked, not completed)`);
      return module.position;
    }
  }

  // If all modules are completed, return the last module position
  const lastCompleted = sortedModules.filter(m => m.isCompleted).pop();
  if (lastCompleted) {
    console.log(`[LearningSuite] All modules completed, returning last: ${lastCompleted.position}`);
    return lastCompleted.position;
  }

  // If we have modules but none are completed or in progress, user is at module 1
  const firstModule = sortedModules[0];
  if (firstModule) {
    console.log(`[LearningSuite] No progress detected, user is at first module: ${firstModule.position}`);
    return firstModule.position;
  }

  console.log(`[LearningSuite] Could not determine module progress`);
  return null;
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
    if (currentModule === null) {
      console.log(`[LearningSuite] Trying modules endpoint...`);
      const modules = await getCourseModulesForMember(nfMentoringCourse.id, member.id);
      console.log(`[LearningSuite] Got ${modules.length} modules`);
      currentModule = calculateCurrentModule(modules);
      console.log(`[LearningSuite] Calculated from modules: ${currentModule}`);
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
