"use client";

import { useEffect, useState } from "react";
import { PropertyRegime } from "@/types/property-regimes";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database";

interface PropertyRegimeCardMiniProps {
  propertyRegimeId: string | null;
}

export function PropertyRegimeCardMini({ propertyRegimeId }: PropertyRegimeCardMiniProps) {
  const [regime, setRegime] = useState<PropertyRegime | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const fetchRegime = async () => {
      if (!propertyRegimeId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("property_regimes")
        .select("*")
        .eq("id", propertyRegimeId)
        .single();
      if (!error && data) setRegime(data);
      setLoading(false);
    };
    fetchRegime();
  }, [propertyRegimeId]);

  if (loading || !propertyRegimeId) return null;
  if (!regime) return <span className="text-xs text-gray-400">Régime inconnu</span>;

  return (
    <span className="inline-block text-xs rounded px-2 py-1 bg-blue-50 text-blue-700 font-medium" title={regime.name}>
      {regime.name}
    </span>
  );
}
