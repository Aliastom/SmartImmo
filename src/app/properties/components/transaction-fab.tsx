import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

import React from 'react';

export default function TransactionFab({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      size="icon"
      variant="secondary"
      className="rounded-full shadow-md bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 hover:text-blue-800 p-2"
      style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
      onClick={e => { e.stopPropagation(); onClick(e); }}
      title="Ajouter une transaction"
      aria-label="Ajouter une transaction"
    >
      <Plus size={18} />
    </Button>
  );
}
