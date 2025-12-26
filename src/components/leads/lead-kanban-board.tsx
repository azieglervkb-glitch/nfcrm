"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { LeadKanbanColumn } from "./lead-kanban-column";
import { LeadKanbanCard } from "./lead-kanban-card";
import { toast } from "sonner";

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

const STATUS_OPTIONS = [
  {
    value: "NEU",
    label: "Neu",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  {
    value: "KONTAKTIERT",
    label: "Kontaktiert",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  {
    value: "QUALIFIZIERT",
    label: "Qualifiziert",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  {
    value: "KONVERTIERT",
    label: "Konvertiert",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    dotColor: "bg-purple-500",
  },
  {
    value: "VERLOREN",
    label: "Verloren",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    dotColor: "bg-gray-400",
  },
];

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string, oldStatus: string) => Promise<void>;
  searchQuery: string;
}

export function LeadKanbanBoard({
  leads,
  onLeadClick,
  onStatusChange,
  searchQuery,
}: LeadKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>([]);

  // Use optimistic leads if we have them, otherwise use props
  const displayLeads = optimisticLeads.length > 0 ? optimisticLeads : leads;

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return displayLeads;
    const query = searchQuery.toLowerCase();
    return displayLeads.filter(
      (lead) =>
        lead.vorname.toLowerCase().includes(query) ||
        lead.nachname.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query)
    );
  }, [displayLeads, searchQuery]);

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    STATUS_OPTIONS.forEach((status) => {
      grouped[status.value] = filteredLeads.filter(
        (lead) => lead.status === status.value
      );
    });
    return grouped;
  }, [filteredLeads]);

  // Get active lead for drag overlay
  const activeLead = useMemo(() => {
    if (!activeId) return null;
    return displayLeads.find((lead) => lead.id === activeId) || null;
  }, [activeId, displayLeads]);

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged
    const activeLead = displayLeads.find((lead) => lead.id === activeId);
    if (!activeLead) return;

    // Check if we're over a column
    const overColumn = STATUS_OPTIONS.find((s) => s.value === overId);

    if (overColumn && activeLead.status !== overColumn.value) {
      // Preview the move optimistically
      setOptimisticLeads(
        displayLeads.map((lead) =>
          lead.id === activeId
            ? { ...lead, status: overColumn.value }
            : lead
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      setOptimisticLeads([]);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged
    const activeLead = leads.find((lead) => lead.id === activeId);
    if (!activeLead) {
      setOptimisticLeads([]);
      return;
    }

    // Determine target status
    let targetStatus: string | null = null;

    // Check if dropped on a column
    const overColumn = STATUS_OPTIONS.find((s) => s.value === overId);
    if (overColumn) {
      targetStatus = overColumn.value;
    } else {
      // Dropped on another lead - find that lead's status
      const overLead = leads.find((lead) => lead.id === overId);
      if (overLead) {
        targetStatus = overLead.status;
      }
    }

    if (targetStatus && targetStatus !== activeLead.status) {
      try {
        await onStatusChange(activeId, targetStatus, activeLead.status);
      } catch (error) {
        toast.error("Fehler beim Aktualisieren des Status");
      }
    }

    setOptimisticLeads([]);
  }

  function handleDragCancel() {
    setActiveId(null);
    setOptimisticLeads([]);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {STATUS_OPTIONS.map((status) => (
          <LeadKanbanColumn
            key={status.value}
            status={status}
            leads={leadsByStatus[status.value] || []}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="rotate-3 scale-105">
            <LeadKanbanCard
              lead={activeLead}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
