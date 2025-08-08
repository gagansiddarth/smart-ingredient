import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

import type { AnalysisResult } from "@/utils/analyze";

interface SavedScanRow {
  id: string;
  created_at: string;
  raw_text: string;
  analysis: AnalysisResult;
}

const Saved = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedScanRow[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("scans")
        .select("id, created_at, raw_text, analysis")
        .eq("user_id", session.user.id)
        .eq("saved", true)
        .order("created_at", { ascending: false });
      if (!error && data) setRows(data as unknown as SavedScanRow[]);
    };
    init();
  }, [navigate]);

  return (
    <main className="min-h-screen container py-10">
      <Seo title="Saved Scans – FoodDE" description="Your saved ingredient analyses." canonical="https://foodde.lovable.app/saved" />
      <h1 className="text-3xl font-bold mb-6">Saved Scans</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        {rows.map((scan) => (
          <Card key={scan.id} className="p-5 card-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{new Date(scan.created_at).toLocaleString()}</p>
                <p className="font-medium mt-1 line-clamp-1">{scan.raw_text}</p>
              </div>
              <div className="inline-flex items-center justify-center rounded-xl px-4 py-2 border">
                <span className="text-sm font-medium">Health</span>
                <span className="ml-2 text-xl font-semibold">{scan.analysis.health_score}</span>
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground">No saved scans yet.</p>
        )}
      </div>
    </main>
  );
};

export default Saved;
