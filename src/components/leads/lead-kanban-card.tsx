"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, GripVertical, Clock } from "lucide-react";

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
}

const SOURCE_MAP: Record<string, string> = {
  ONEPAGE: "OnePage",
  WEBSITE: "Website",
  SOCIAL_MEDIA: "Social Media",
  EMPFEHLUNG: "Empfehlung",
  MANUELL: "Manuell",
};

interface LeadKanbanCardProps {
  lead: Lead;
  onClick: () => void;
}

export function LeadKanbanCard({ lead, onClick }: LeadKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lead.id,
    data: {
      type: "lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        p-3 cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5
        ${isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/20 rotate-2" : ""}
        bg-white border-border
      `}
      onClick={onClick}
    >
      <div className="space-y-2.5">
        {/* Header with drag handle and name */}
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 p-0.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {lead.vorname} {lead.nachname}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {SOURCE_MAP[lead.source] || lead.source}
              {lead.sourceDetail && ` · ${lead.sourceDetail}`}
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1 pl-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.telefon && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span>{lead.telefon}</span>
            </div>
          )}
        </div>

        {/* Footer with badges */}
        <div className="flex items-center justify-between gap-2 pl-6 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {lead.interessiertAn && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {lead.interessiertAn}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {daysSinceCreated === 0
                ? "Heute"
                : daysSinceCreated === 1
                ? "Gestern"
                : `${daysSinceCreated}d`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
