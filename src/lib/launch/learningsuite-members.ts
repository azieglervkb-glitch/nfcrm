/**
 * LearningSuite API - Course Members
 * Fetches all active members from a course for the Launch import
 */

import { LSMember } from './types';

const LEARNINGSUITE_API_BASE = "https://api.learningsuite.io/api/v1";
const LEARNINGSUITE_API_KEY = process.env.LEARNINGSUITE_API_KEY || "";

interface LSApiMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  enabled: boolean;
  accessFrom?: string;
  accessTo?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Check if a member is considered "active"
 * - enabled: true
 * - accessTo is null OR in the future
 */
function isActiveMember(member: LSApiMember): boolean {
  // If enabled field doesn't exist, assume active
  if (member.enabled === false) return false;

  if (member.accessTo) {
    const accessToDate = new Date(member.accessTo);
    if (accessToDate < new Date()) return false;
  }

  return true;
}

/**
 * Normalize member data from API response
 */
function normalizeMembers(membersArray: LSApiMember[]): LSMember[] {
  return membersArray
    .filter(isActiveMember)
    .map((m) => ({
      id: String(m.id || ''),
      email: String(m.email || '').toLowerCase().trim(),
      firstName: String(m.firstName || '').trim(),
      lastName: String(m.lastName || '').trim(),
      fullName: String(m.fullName || `${m.firstName || ''} ${m.lastName || ''}`).trim(),
      phone: m.phone,
      createdAt: m.createdAt,
    }))
    .filter((m) => m.email && m.email.includes('@'));
}

/**
 * Get all active members (from all courses/platform)
 * Endpoint: GET /members
 * This is the PRIMARY endpoint - works reliably
 */
export async function getAllMembers(): Promise<{
  success: boolean;
  members: LSMember[];
  error?: string;
}> {
  if (!LEARNINGSUITE_API_KEY) {
    return {
      success: false,
      members: [],
      error: "LEARNINGSUITE_API_KEY nicht konfiguriert. Bitte in .env setzen.",
    };
  }

  const url = `${LEARNINGSUITE_API_BASE}/members`;
  console.log(`[Launch] Fetching all members from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": LEARNINGSUITE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Launch] API error (${response.status}):`, errorText);
      return {
        success: false,
        members: [],
        error: `LearningSuite API Fehler: ${response.status} - ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();

    // API might return array directly or wrapped
    const membersArray: LSApiMember[] = Array.isArray(data)
      ? data
      : (data.members || data.data || data.users || []);

    console.log(`[Launch] Found ${membersArray.length} total members from API`);

    const members = normalizeMembers(membersArray);
    console.log(`[Launch] ${members.length} active members with valid email`);

    return {
      success: true,
      members,
    };
  } catch (error) {
    console.error("[Launch] API request error:", error);
    return {
      success: false,
      members: [],
      error: error instanceof Error ? error.message : "Netzwerkfehler beim API-Aufruf",
    };
  }
}

/**
 * Get all members enrolled in a specific course
 * Endpoint: GET /courses/{courseId}/members
 *
 * NOTE: The courseId might need to be a different format than the GraphQL GID.
 * If this fails, use getAllMembers() as fallback.
 */
export async function getAllCourseMembers(courseId: string): Promise<{
  success: boolean;
  members: LSMember[];
  error?: string;
}> {
  if (!LEARNINGSUITE_API_KEY) {
    return {
      success: false,
      members: [],
      error: "LEARNINGSUITE_API_KEY nicht konfiguriert",
    };
  }

  const url = `${LEARNINGSUITE_API_BASE}/courses/${encodeURIComponent(courseId)}/members`;
  console.log(`[Launch] Fetching course members from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": LEARNINGSUITE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Launch] Course API error (${response.status}):`, errorText);

      // If course endpoint fails, try fallback to /members
      console.log(`[Launch] Course endpoint failed, trying /members fallback...`);
      return getAllMembers();
    }

    const data = await response.json();
    const membersArray: LSApiMember[] = Array.isArray(data)
      ? data
      : (data.members || data.data || data.users || []);

    console.log(`[Launch] Found ${membersArray.length} total members in course`);

    const members = normalizeMembers(membersArray);
    console.log(`[Launch] ${members.length} active members with valid email`);

    return {
      success: true,
      members,
    };
  } catch (error) {
    console.error("[Launch] API request error:", error);

    // Network error - try fallback
    console.log(`[Launch] Network error, trying /members fallback...`);
    return getAllMembers();
  }
}

/**
 * Get all members - with automatic fallback
 * Tries course-specific first, falls back to all members
 */
export async function getMembersWithFallback(courseId?: string): Promise<{
  success: boolean;
  members: LSMember[];
  error?: string;
  usedFallback?: boolean;
}> {
  // If no courseId provided, use /members directly
  if (!courseId) {
    const result = await getAllMembers();
    return { ...result, usedFallback: false };
  }

  // Try course-specific first
  console.log(`[Launch] Trying course-specific endpoint for: ${courseId}`);
  const courseResult = await getAllCourseMembers(courseId);

  // If it worked, return it
  if (courseResult.success && courseResult.members.length > 0) {
    return { ...courseResult, usedFallback: false };
  }

  // Fallback to /members
  console.log(`[Launch] Falling back to /members endpoint`);
  const allResult = await getAllMembers();
  return { ...allResult, usedFallback: true };
}

/**
 * Get all members from NF Mentoring course
 * Uses /members endpoint directly (more reliable)
 */
export async function getNFMentoringMembers(): Promise<{
  success: boolean;
  members: LSMember[];
  error?: string;
}> {
  // Use /members directly since course endpoint has issues with GID format
  return getAllMembers();
}
