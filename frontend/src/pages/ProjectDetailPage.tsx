// ============================================================================
// Project Detail Page
// ============================================================================

import { useParams } from 'react-router-dom';

export default function ProjectDetailPage() {
  const { id } = useParams();
  return (
    <div className="project-detail-page">
      <h1>Project: {id}</h1>
    </div>
  );
}
