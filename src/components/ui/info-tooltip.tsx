"use client"

import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  content: string | React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
  iconClassName?: string
}

export function InfoTooltip({
  content,
  side = "top",
  className,
  iconClassName
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center cursor-help ml-1",
              className
            )}
          >
            <Info
              className={cn(
                "h-4 w-4 text-muted-foreground hover:text-foreground transition-colors",
                iconClassName
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs text-sm font-normal"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Vordefinierte Tooltips für häufig verwendete Begriffe
export const TOOLTIP_DEFINITIONS = {
  churnRisk: "Mitglied zeigt Anzeichen von Abwanderung (z.B. mehrere Wochen keine KPIs eingetragen, sinkende Aktivität)",
  reviewFlag: "Mitglied wurde zur manuellen Überprüfung markiert. Ein Coach sollte sich das Profil ansehen.",
  upsellCandidate: "Mitglied zeigt gute Performance und könnte für ein Upgrade oder Zusatzprodukt interessant sein.",
  dangerZone: "Kritische Aktionen die nicht rückgängig gemacht werden können. Nur mit Bedacht verwenden!",
  currentModule: "Das aktuelle Modul in LearningSuite, in dem sich das Mitglied befindet (basierend auf freigeschalteten Modulen).",
  kpiTracking: "Wöchentliches Tracking von Kennzahlen wie Umsatz, Termine, Gespräche etc.",
  kpiTriggerModule: "Ab welchem LearningSuite-Modul das KPI-Tracking automatisch aktiviert wird.",
  onboardingCompleted: "Das Mitglied hat das initiale Onboarding-Formular ausgefüllt.",
  kpiSetupCompleted: "Das Mitglied hat seine KPI-Ziele und Tracking-Präferenzen eingerichtet.",
  learningSuiteSync: "Synchronisiert die Daten mit LearningSuite (aktuelles Modul, Fortschritt).",
  weeklyGoal: "Das wöchentliche Umsatzziel, das das Mitglied selbst festgelegt hat.",
  streak: "Anzahl aufeinanderfolgender Wochen, in denen das Mitglied seine KPIs eingetragen hat.",
  performanceScore: "Durchschnittliche Zielerreichung der letzten Wochen (IST vs. SOLL).",
  automationRules: "Automatische Aktionen die basierend auf Mitglieder-Verhalten ausgelöst werden.",
  quietHours: "Zeitraum in dem keine automatischen Nachrichten versendet werden (z.B. 21:00 - 08:00).",
} as const

// Komponente mit vordefiniertem Inhalt
interface DefinedTooltipProps {
  term: keyof typeof TOOLTIP_DEFINITIONS
  side?: "top" | "right" | "bottom" | "left"
  className?: string
  iconClassName?: string
}

export function DefinedTooltip({ term, ...props }: DefinedTooltipProps) {
  return <InfoTooltip content={TOOLTIP_DEFINITIONS[term]} {...props} />
}
