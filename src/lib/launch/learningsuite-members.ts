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
  if (!member.enabled) return false;

  if (member.accessTo) {
    const accessToDate = new Date(member.accessTo);
    if (accessToDate < new Date()) return false;
  }

  return true;
}

/**
 * Get all members enrolled in a course
 * Endpoint: GET /courses/{courseId}/members
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

  const url = `${LEARNINGSUITE_API_BASE}/courses/${courseId}/members`;
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
      console.error(`[Launch] API error (${response.status}):`, errorText);
      return {
        success: false,
        members: [],
        error: `LearningSuite API Fehler: ${response.status} - ${errorText.slice(0, 200)}`,
      };
    }

    const data = await response.json();

    // The API might return an array directly or wrapped in a data property
    const membersArray: LSApiMember[] = Array.isArray(data)
      ? data
      : (data.members || data.data || data.users || []);

    console.log(`[Launch] Found ${membersArray.length} total members in course`);

    // Filter for active members only
    const activeMembers = membersArray.filter(isActiveMember);
    console.log(`[Launch] ${activeMembers.length} active members (enabled & valid access)`);

    // Normalize member data
    const members: LSMember[] = activeMembers
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

    console.log(`[Launch] ${members.length} valid members with email`);

    return {
      success: true,
      members,
    };
  } catch (error) {
    console.error("[Launch] API request error:", error);
    return {
      success: false,
      members: [],
      error: error instanceof Error ? error.message : "Unbekannter Fehler beim API-Aufruf",
    };
  }
}

/**
 * Get all active members (from all courses/platform)
 * Endpoint: GET /members
 * Fallback if course-specific endpoint fails
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
      error: "LEARNINGSUITE_API_KEY nicht konfiguriert",
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
        error: `LearningSuite API Fehler: ${response.status}`,
      };
    }

    const data = await response.json();
    const membersArray: LSApiMember[] = Array.isArray(data) ? data : (data.members || data.data || []);

    console.log(`[Launch] Found ${membersArray.length} total members`);

    // Filter for active members
    const activeMembers = membersArray.filter(isActiveMember);
    console.log(`[Launch] ${activeMembers.length} active members`);

    const members: LSMember[] = activeMembers
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

    return {
      success: true,
      members,
    };
  } catch (error) {
    console.error("[Launch] API request error:", error);
    return {
      success: false,
      members: [],
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

/**
 * Get all members from NF Mentoring course
 */
export async function getNFMentoringMembers(): Promise<{
  success: boolean;
  members: LSMember[];
  error?: string;
}> {
  const courseId = 'Q291cnNISW5zdGFuY2U6Y2x4OWk2dXRsM3RiaWR5aWtzeDN3N2U3bA';
  return getAllCourseMembers(courseId);
}
