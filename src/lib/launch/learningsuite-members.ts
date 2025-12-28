/**
 * LearningSuite API - Course Members
 * Fetches all members from a course for the Launch import
 */

import { LSMember } from './types';

const LEARNINGSUITE_API_BASE = "https://api.learningsuite.io/api/v1";
const LEARNINGSUITE_API_KEY = process.env.LEARNINGSUITE_API_KEY || "";

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
      error: "LEARNINGSUITE_API_KEY not configured",
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
        error: `API request failed: ${response.status}`,
      };
    }

    const data = await response.json();

    // The API might return an array directly or wrapped in a data property
    const membersArray = Array.isArray(data) ? data : (data.members || data.data || []);

    console.log(`[Launch] Found ${membersArray.length} members in course`);

    // Normalize member data
    const members: LSMember[] = membersArray.map((m: Record<string, unknown>) => ({
      id: String(m.id || ''),
      email: String(m.email || '').toLowerCase().trim(),
      firstName: String(m.firstName || m.first_name || '').trim(),
      lastName: String(m.lastName || m.last_name || '').trim(),
      fullName: String(m.fullName || m.full_name || `${m.firstName || ''} ${m.lastName || ''}`).trim(),
      createdAt: m.createdAt as string | undefined,
    })).filter((m: LSMember) => m.email && m.email.includes('@'));

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
      error: error instanceof Error ? error.message : "Unknown error",
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
