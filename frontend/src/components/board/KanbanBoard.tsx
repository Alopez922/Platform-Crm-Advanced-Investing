import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';
import { useMoveLeadStage } from '../../hooks/useQueries';
import { useAppStore } from '../../stores/appStore';
import type { Stage, Lead } from '../../api';
import toast from 'react-hot-toast';
import './KanbanBoard.css';

interface Props {
  stages: Stage[];
  companyId: string;
}

export default function KanbanBoard({ stages, companyId }: Props) {
  const [activeCard, setActiveCard] = useState<Lead | null>(null);
  const moveLeadMutation = useMoveLeadStage();
  const { openLeadDrawer } = useAppStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Mapeo rápido de leads por ID para el overlay
  const leadsMap = useMemo(() => {
    const map = new Map<string, Lead>();
    stages.forEach((stage) => {
      stage.leads?.forEach((lead) => map.set(lead.id, lead));
    });
    return map;
  }, [stages]);

  function handleDragStart(event: DragStartEvent) {
    const lead = leadsMap.get(event.active.id as string);
    if (lead) setActiveCard(lead);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const lead = leadsMap.get(leadId);
    if (!lead) return;

    // Determinar la etapa de destino
    let targetStageId: string;
    
    // Si se soltó sobre una columna directamente
    const targetStage = stages.find((s) => s.id === over.id);
    if (targetStage) {
      targetStageId = targetStage.id;
    } else {
      // Si se soltó sobre otro lead, usar la etapa de ese lead
      const targetLead = leadsMap.get(over.id as string);
      if (targetLead) {
        targetStageId = targetLead.stageId;
      } else {
        return;
      }
    }

    // No mover si es la misma etapa
    if (lead.stageId === targetStageId) return;

    // Ejecutar la mutación
    moveLeadMutation.mutate(
      { companyId, leadId, stageId: targetStageId },
      {
        onSuccess: () => {
          const fromStage = stages.find((s) => s.id === lead.stageId);
          const toStage = stages.find((s) => s.id === targetStageId);
          toast.success(`${lead.fullName} movido a ${toStage?.name || 'nueva etapa'}`);
        },
        onError: () => {
          toast.error('Error al mover el lead');
        },
      }
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={stage.leads || []}
            onCardClick={openLeadDrawer}
          />
        ))}
      </div>

      {/* Overlay del card que se está arrastrando */}
      <DragOverlay>
        {activeCard ? (
          <LeadCard lead={activeCard} isOverlay onClick={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
