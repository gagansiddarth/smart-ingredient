import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate("/", { replace: true });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message });
    } else {
      toast({ title: "Welcome back" });
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message });
    } else {
      toast({ title: "Check your email", description: "Confirm your address to finish signup." });
    }
  };

  return (
    <main className="min-h-screen container py-10">
      <Seo title="Sign in – FoodDE" description="Login or create an account to save scans." canonical="https://foodde.lovable.app/auth" />
      <h1 className="text-3xl font-bold mb-6">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <Card className="p-6 card-elevated max-w-lg">
        <div className="mb-4 flex gap-2">
          <Button variant={mode === "login" ? "default" : "outline"} onClick={() => setMode("login")}>Login</Button>
          <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>Sign up</Button>
        </div>
        <div className="grid gap-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "login" ? (
            <Button onClick={handleLogin} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
          ) : (
            <Button onClick={handleSignup} disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/")}>Back to home</Button>
        </div>
      </Card>
    </main>
  );
};

export default Auth;
