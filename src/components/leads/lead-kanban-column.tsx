"use client";

import { useDroppable } from "@dnd-kit/core";
import { LeadKanbanCard } from "./lead-kanban-card";

interface Lead {
  id: string;
  email: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  whatsappNummer: string | null;
  status: string;
  source: string;
  sourceDetail: string | null;
  interessiertAn: string | null;
  notizen: string | null;
  createdAt: string;
  assignedToId: string | null;
  assignedTo: { id: string; vorname: string; nachname: string } | null;
}

interface StatusOption {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

interface LeadKanbanColumnProps {
  status: StatusOption;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function LeadKanbanColumn({
  status,
  leads,
  onLeadClick,
}: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.value,
    data: {
      type: "column",
      status: status.value,
    },
  });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column Header */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-b-2
          ${status.bgColor} ${status.borderColor}
        `}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${status.dotColor}`} />
        <h3 className={`font-semibold text-sm ${status.color}`}>
          {status.label}
        </h3>
        <span
          className={`
            ml-auto text-xs font-medium px-2 py-0.5 rounded-full
            ${status.bgColor} ${status.color} border ${status.borderColor}
          `}
        >
          {leads.length}
        </span>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-2 space-y-2 overflow-y-auto min-h-[300px] max-h-[calc(100vh-340px)]
          bg-muted/30 rounded-b-lg border border-t-0 transition-all duration-200
          ${isOver ? "bg-primary/5 border-primary/30 shadow-inner" : "border-border"}
        `}
      >
        {leads.length === 0 ? (
          <div
            className={`
              flex items-center justify-center h-24 border-2 border-dashed rounded-lg
              text-muted-foreground text-sm transition-colors
              ${isOver ? "border-primary/40 bg-primary/5" : "border-muted"}
            `}
          >
            {isOver ? "Hier ablegen" : "Keine Leads"}
          </div>
        ) : (
          leads.map((lead) => (
            <LeadKanbanCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}
