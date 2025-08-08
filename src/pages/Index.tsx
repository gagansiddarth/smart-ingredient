import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, MessageCircle, History as HistoryIcon, TriangleAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cleanIngredients } from "@/utils/cleanIngredients";
import { runOCR } from "@/utils/ocr";
import { analyzeIngredients, type AnalysisResult, scoreToHslParts } from "@/utils/analyze";
import { getRecentScans, saveScan, saveScanPermanently, type Scan } from "@/utils/storage";
import Seo from "@/components/Seo";

interface IndexProps { initialTab?: "home" | "scan" | "results" | "chat" | "history" }

const Index = ({ initialTab = "home" }: IndexProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Scan state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [apiKey, setApiKey] = useState<string>("");

  // History
  const recent = useMemo(() => getRecentScans(), [location.key]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const onDrop = (file: File) => {
    setImageFile(file);
  };

  const handleRunOCR = async () => {
    if (!imageFile) return;
    setIsOcrRunning(true);
    try {
      const text = await runOCR(imageFile);
      setOcrText(text);
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleAnalyze = async () => {
    const text = ocrText.trim();
    if (!text) return;
    const res = await analyzeIngredients(text, apiKey);
    setAnalysis(res);
    // persist to history (24h auto)
    const scan: Scan = {
      scan_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: imageFile ? "image" : "text",
      image_path: null,
      raw_text: text,
      cleaned_ingredients: cleanIngredients(text),
      analysis: res,
      saved: false,
      user_notes: null,
    };
    saveScan(scan);
    setActiveTab("results");
    navigate("/results");
  };

  const HealthScoreBadge = ({ score }: { score: number }) => {
    const hslParts = scoreToHslParts(score); // e.g., "120 75% 45%"
    return (
      <div className="inline-flex items-center justify-center rounded-xl px-4 py-2 border" style={{
        // Use semantic dynamic color via CSS variable
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        '--score-color': hslParts,
        backgroundColor: `hsl(${hslParts} / 0.12)`,
        borderColor: `hsl(${hslParts} / 0.25)`,
        color: `hsl(${hslParts})`,
      } as React.CSSProperties}>
        <span className="text-sm font-medium">Health Score</span>
        <span className="ml-2 text-xl font-semibold">{score}</span>
      </div>
    );
  };

  return (
    <main>
      {activeTab === "home" && (
        <section className="min-h-screen flex flex-col">
          <Seo title="FoodDE – AI Food Label Analyzer" description="Scan ingredients, get a health score, and flag harmful additives with FoodDE." canonical="https://foodde.lovable.app/" />
          <header className="py-6">
            <nav className="container flex items-center justify-between">
              <a href="/" className="font-semibold">FoodDE</a>
              <div className="flex items-center gap-3">
                <Button variant="premium" onClick={() => navigate('/history')}><HistoryIcon className="mr-2" />History</Button>
                <Button variant="hero" size="xl" onClick={() => { setActiveTab('scan'); navigate('/scan'); }}>
                  Start Scan
                </Button>
              </div>
            </nav>
          </header>
          <section className="flex-1 container grid md:grid-cols-2 gap-10 items-center surface-hero rounded-2xl p-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Ingredient insights in seconds</h1>
              <p className="text-muted-foreground mb-6">Upload a label or paste text. FoodDE scores healthiness, flags harmful additives, and lets you chat with AI for quick advice.</p>
              <div className="flex gap-3">
                <Button variant="hero" size="xl" onClick={() => { setActiveTab('scan'); navigate('/scan'); }}>
                  <Upload className="mr-2" /> Start Scan
                </Button>
                <Button variant="outline" size="xl" onClick={() => navigate('/history')}>
                  <HistoryIcon className="mr-2" /> View History
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <Card className="p-6 card-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recent demo score</p>
                    <h2 className="text-3xl font-semibold mt-2">Cereal Bar</h2>
                  </div>
                  <HealthScoreBadge score={68} />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge variant="secondary">Wheat flour</Badge>
                  <Badge variant="destructive"><TriangleAlert className="mr-1" /> E102</Badge>
                  <Badge>Natural flavors</Badge>
                  <Badge variant="secondary">Palm oil</Badge>
                  <Badge variant="secondary">Sugar</Badge>
                </div>
              </Card>
              <Card className="p-6 card-elevated">
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-1" />
                  <div>
                    <p className="font-medium">Ask anything</p>
                    <p className="text-sm text-muted-foreground">“Is E102 safe for kids?” “What are better alternatives?”</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </section>
      )}

      {activeTab === "scan" && (
        <section className="min-h-screen container py-10">
          <Seo title="Scan Ingredients – FoodDE" description="Upload a label or paste ingredients to analyze health impact." canonical="https://foodde.lovable.app/scan" />
          <h1 className="text-3xl font-bold mb-6">Scan Ingredients</h1>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="p-6 card-elevated">
              <p className="text-sm text-muted-foreground mb-3">Upload image</p>
              <label className="block border border-dashed rounded-xl p-8 text-center cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onDrop(e.target.files[0])} />
                <ImageIcon className="mx-auto mb-2" />
                <span className="text-sm">Drag & drop or click to upload</span>
              </label>
              <div className="mt-4 flex gap-3">
                <Button onClick={handleRunOCR} disabled={!imageFile || isOcrRunning}>
                  {isOcrRunning ? 'Running OCR…' : 'Run OCR'}
                </Button>
              </div>
            </Card>
            <Card className="p-6 card-elevated">
              <p className="text-sm text-muted-foreground mb-3">Paste or edit ingredients</p>
              <Textarea rows={12} placeholder="e.g. Wheat flour, Sugar, Palm Oil, E102, Salt, Natural flavors" value={ocrText} onChange={(e) => setOcrText(e.target.value)} />
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <Input type="password" placeholder="Optional: OpenAI API Key for AI mode" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                <Button variant="hero" onClick={handleAnalyze}>Analyze</Button>
              </div>
            </Card>
          </div>
        </section>
      )}

      {activeTab === "results" && analysis && (
        <section className="min-h-screen container py-10">
          <Seo title="Results – FoodDE" description="See health score, flags, and quick advice for your scan." canonical="https://foodde.lovable.app/results" />
          <h1 className="text-3xl font-bold mb-6">Results</h1>
          <Card className="p-6 card-elevated">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <HealthScoreBadge score={analysis.health_score} />
              <div className="text-muted-foreground">{analysis.summary}</div>
            </div>
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Ingredients</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {analysis.breakdown.map((b) => (
                  <li key={b.ingredient} className="flex items-center justify-between border rounded-lg p-3">
                    <span className="font-medium">{b.ingredient}</span>
                    <Badge variant={b.classification === 'Healthy' ? 'secondary' : b.classification === 'Moderately Harmful' ? 'default' : 'destructive'}>
                      {b.classification}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {analysis.flags.map((f) => (
                  <Badge key={f} variant="destructive"><TriangleAlert className="mr-1" /> {f}</Badge>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Button onClick={() => navigate('/chat')}>Chat about these ingredients</Button>
                <Button variant="premium" onClick={() => saveScanPermanently(analysis)}>
                  Save Scan
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      {activeTab === "history" && (
        <section className="min-h-screen container py-10">
          <Seo title="History – FoodDE" description="Review your recent and saved scans." canonical="https://foodde.lovable.app/history" />
          <h1 className="text-3xl font-bold mb-6">History (last 24h)</h1>
          <div className="grid lg:grid-cols-2 gap-6">
            {recent.map((scan) => (
              <Card key={scan.scan_id} className="p-5 card-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{new Date(scan.timestamp).toLocaleString()}</p>
                    <p className="font-medium mt-1 line-clamp-1">{scan.raw_text}</p>
                  </div>
                  <HealthScoreBadge score={scan.analysis.health_score} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scan.analysis.flags.slice(0,4).map(f => (
                    <Badge key={f} variant="destructive">{f}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === "chat" && (
        <section className="min-h-screen container py-10">
          <Seo title="AI Chat – FoodDE" description="Ask follow-ups about your latest scan." canonical="https://foodde.lovable.app/chat" />
          <h1 className="text-3xl font-bold mb-6">AI Chat</h1>
          <Card className="p-6 card-elevated">
            <p className="text-sm text-muted-foreground mb-3">Enter an OpenAI API key to enable AI answers (client-side for demo)</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Input type="password" placeholder="OpenAI API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <Button variant="premium" onClick={() => setApiKey(apiKey)}>Use Key</Button>
            </div>
            <p className="text-sm text-muted-foreground">This demo runs entirely in the browser for speed during the hackathon. For production, move keys to a backend or Supabase Edge Function.</p>
          </Card>
        </section>
      )}
    </main>
  );
};

export default Index;
