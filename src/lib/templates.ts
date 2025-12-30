import { prisma } from "@/lib/prisma";

/**
 * Load and render a template from the database
 */
export async function renderTemplate(
  slug: string,
  variables: Record<string, string>
): Promise<{ subject: string | null; content: string } | null> {
  const template = await prisma.messageTemplate.findUnique({
    where: { slug, isActive: true },
  });

  if (!template) {
    console.error(`Template not found or inactive: ${slug}`);
    return null;
  }

  let { subject, content } = template;

  // Replace all variables in subject and content
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    if (subject) subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  }

  return { subject, content };
}

