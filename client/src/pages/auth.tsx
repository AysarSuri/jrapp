import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ username, password });
      setLocation("/");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Access</h1>
          <p className="text-slate-500 mt-2">Sign in to manage your ERP system</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
              
              {login.isError && (
                <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                  {login.error?.message || "Invalid credentials"}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25"
                disabled={login.isPending}
              >
                {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-slate-400 mt-6">
          &copy; 2024 ERP System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
