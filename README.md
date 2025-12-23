# NF CRM

CRM-Plattform für das NF Mentoring - Verwalte Mitglieder, tracke KPIs und automatisiere Prozesse.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL + Prisma
- **Authentication:** NextAuth.js
- **AI:** OpenAI GPT-4

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Create an admin user (via Prisma Studio or seed script)

6. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all required environment variables.

## Features

- **Member Management:** Full CRUD for mentoring members
- **KPI Tracking:** Weekly KPI submission with goals
- **AI Feedback:** Automatic personalized feedback via GPT-4
- **Automation Engine:** 16 configurable automation rules
- **Upsell Pipeline:** Sales pipeline management
- **Tasks:** Kanban-style task management
- **Communication Log:** Email and WhatsApp tracking
- **Copecart Integration:** Automatic member creation via webhooks

## License

Private - NF Mentoring
