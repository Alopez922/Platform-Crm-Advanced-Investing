import { useDroppable } from '@dnd-kit/core';
import LeadCard from './LeadCard';
import type { Stage, Lead } from '../../api';
import './KanbanColumn.css';

interface Props {
  stage: Stage;
  leads: Lead[];
  onCardClick: (leadId: string) => void;
}

export default function KanbanColumn({ stage, leads, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}
    >
      {/* Header de la columna */}
      <div className="kanban-column__header">
        <div className="kanban-column__header-left">
          <div
            className="kanban-column__dot"
            style={{ background: stage.color }}
          />
          <h3 className="kanban-column__title">{stage.name}</h3>
        </div>
        <span className="kanban-column__count">{leads.length}</span>
      </div>

      {/* Lista de cards */}
      <div className="kanban-column__cards">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onCardClick(lead.id)}
          />
        ))}

        {leads.length === 0 && (
          <div className="kanban-column__empty">
            Sin leads
          </div>
        )}
      </div>
    </div>
  );
}
