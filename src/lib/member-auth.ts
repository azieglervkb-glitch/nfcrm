import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "member-portal-secret-key"
);

export interface MemberSession {
  memberId: string;
  email: string;
  firstName: string;
}

export async function getMemberSession(): Promise<MemberSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("member_token");

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token.value, JWT_SECRET);

    return {
      memberId: payload.memberId as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
    };
  } catch (error) {
    console.error("Failed to get member session:", error);
    return null;
  }
}
