import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort erforderlich"),
});

// User
export const createUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
  vorname: z.string().min(1, "Vorname erforderlich"),
  nachname: z.string().min(1, "Nachname erforderlich"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "COACH"]).default("COACH"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").optional(),
  vorname: z.string().min(1).optional(),
  nachname: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "COACH"]).optional(),
  isActive: z.boolean().optional(),
});

// Member
export const createMemberSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  vorname: z.string().min(1, "Vorname erforderlich"),
  nachname: z.string().min(1, "Nachname erforderlich"),
  telefon: z.string().optional().nullable(),
  whatsappNummer: z.string().optional().nullable(),
  unternehmen: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  produkte: z.array(z.enum(["VPMC", "NFM", "PREMIUM"])).default([]),
  status: z.enum(["AKTIV", "PAUSIERT", "GEKUENDIGT", "INAKTIV"]).default("AKTIV"),
  // Goals
  hauptzielEinSatz: z.string().optional().nullable(),
  zielMonatsumsatz: z.number().optional().nullable(),
  aktuellerMonatsumsatz: z.number().optional().nullable(),
  // KPI Settings
  kpiTrackingActive: z.boolean().default(false),
  trackKontakte: z.boolean().default(false),
  trackTermine: z.boolean().default(false),
  trackEinheiten: z.boolean().default(false),
  trackEmpfehlungen: z.boolean().default(false),
  trackEntscheider: z.boolean().default(false),
  trackAbschluesse: z.boolean().default(false),
  // Soll-Werte
  umsatzSollWoche: z.number().optional().nullable(),
  umsatzSollMonat: z.number().optional().nullable(),
  kontakteSoll: z.number().optional().nullable(),
  termineVereinbartSoll: z.number().optional().nullable(),
  termineAbschlussSoll: z.number().optional().nullable(),
  einheitenSoll: z.number().optional().nullable(),
  empfehlungenSoll: z.number().optional().nullable(),
  // Flags
  churnRisk: z.boolean().default(false),
  upsellCandidate: z.boolean().default(false),
});

export const updateMemberSchema = z.object({
  vorname: z.string().min(1).optional(),
  nachname: z.string().min(1).optional(),
  telefon: z.string().optional(),
  whatsappNummer: z.string().optional(),
  status: z.enum(["AKTIV", "PAUSIERT", "GEKUENDIGT", "INAKTIV"]).optional(),
  produkte: z.array(z.enum(["VPMC", "NFM", "PREMIUM"])).optional(),

  // Flags
  reviewFlag: z.boolean().optional(),
  churnRisk: z.boolean().optional(),
  upsellCandidate: z.boolean().optional(),
  dangerZone: z.boolean().optional(),
});

// Onboarding Form (Form 1)
export const onboardingFormSchema = z.object({
  vorname: z.string().min(1, "Vorname erforderlich"),
  nachname: z.string().min(1, "Nachname erforderlich"),
  telefon: z.string().min(1, "Telefonnummer erforderlich"),
  aktuellerMonatsumsatz: z.number().min(0, "Ungültiger Wert"),
  wasNervtAmMeisten: z.string().min(1, "Bitte ausfüllen"),
  groessetesProblem: z.string().min(1, "Bitte ausfüllen"),
  zielMonatsumsatz: z.number().min(0, "Ungültiger Wert"),
  groessteZielWarum: z.string().min(1, "Bitte ausfüllen"),
  wieAufmerksam: z.string().min(1, "Bitte auswählen"),
});

// KPI Setup Form (Form 2)
export const kpiSetupFormSchema = z.object({
  umsatzSollMonat: z.number().min(0, "Ungültiger Wert"),
  trackKontakte: z.boolean().default(false),
  trackTermine: z.boolean().default(false),
  trackEinheiten: z.boolean().default(false),
  trackEmpfehlungen: z.boolean().default(false),
  trackEntscheider: z.boolean().default(false),
  trackAbschluesse: z.boolean().default(false),

  kontakteSoll: z.number().min(0).optional(),
  entscheiderSoll: z.number().min(0).optional(),
  termineVereinbartSoll: z.number().min(0).optional(),
  termineStattgefundenSoll: z.number().min(0).optional(),
  termineAbschlussSoll: z.number().min(0).optional(),
  einheitenSoll: z.number().min(0).optional(),
  empfehlungenSoll: z.number().min(0).optional(),

  hauptzielEinSatz: z.string().min(1, "Bitte ausfüllen"),
  wasNervtAmMeisten: z.string().optional(),
});

// Weekly KPI Form (Form 3)
export const weeklyKpiFormSchema = z.object({
  umsatzIst: z.number().min(0, "Ungültiger Wert"),
  kontakteIst: z.number().min(0).optional(),
  entscheiderIst: z.number().min(0).optional(),
  termineVereinbartIst: z.number().min(0).optional(),
  termineStattgefundenIst: z.number().min(0).optional(),
  termineErstIst: z.number().min(0).optional(),
  termineFolgeIst: z.number().min(0).optional(),
  termineAbschlussIst: z.number().min(0).optional(),
  termineNoshowIst: z.number().min(0).optional(),
  einheitenIst: z.number().min(0).optional(),
  empfehlungenIst: z.number().min(0).optional(),

  feelingScore: z.number().min(1).max(10),
  heldentat: z.string().optional(),
  blockiert: z.string().optional(),
  herausforderung: z.string().optional(),
});

// Task
export const createTaskSchema = z.object({
  title: z.string().min(1, "Titel erforderlich"),
  description: z.string().optional(),
  memberId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

// Note
export const createNoteSchema = z.object({
  content: z.string().min(1, "Inhalt erforderlich"),
  isPinned: z.boolean().default(false),
});

// Upsell Pipeline
export const updateUpsellSchema = z.object({
  status: z.enum([
    "IDENTIFIED",
    "KONTAKTIERT",
    "SETTING_GESPRAECH",
    "BERATUNG",
    "ABGESCHLOSSEN",
    "VERLOREN",
  ]).optional(),
  kontaktiertAm: z.string().datetime().optional(),
  settingCallDate: z.string().datetime().optional(),
  beratungDate: z.string().datetime().optional(),
  abschlussDate: z.string().datetime().optional(),
  produkt: z.string().optional(),
  wert: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Message Template
export const messageTemplateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  channel: z.enum(["EMAIL", "WHATSAPP", "INTERNAL"]),
  subject: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;
export type KpiSetupFormInput = z.infer<typeof kpiSetupFormSchema>;
export type WeeklyKpiFormInput = z.infer<typeof weeklyKpiFormSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateUpsellInput = z.infer<typeof updateUpsellSchema>;
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;
