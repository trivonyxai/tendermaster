import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Settings, LogOut } from "lucide-react";

const DEFAULTS_KEY = "tenderflow_defaults";

interface AppDefaults {
  taxRate: number;
  contingencyRate: number;
  currency: string;
  exchangeRate: number;
  wellBasket: string;
}

export function getAppDefaults(): AppDefaults {
  try {
    const stored = localStorage.getItem(DEFAULTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { taxRate: 8.5, contingencyRate: 10, currency: "USD", exchangeRate: 1, wellBasket: "SLB" };
}

export default function SettingsPage() {
  const [defaults, setDefaults] = useState<AppDefaults>(getAppDefaults());
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSave = () => {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
    toast({ title: "Settings saved", description: "Default values updated for new tenders." });
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setLocation("/login");
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h2>
        <p className="text-gray-600">Configure default tender parameters and account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Tender Values</CardTitle>
          <CardDescription>Applied when creating new tenders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Tax Rate (%)</Label>
              <Input
                type="number"
                value={defaults.taxRate}
                onChange={(e) => setDefaults({ ...defaults, taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Default Contingency (%)</Label>
              <Input
                type="number"
                value={defaults.contingencyRate}
                onChange={(e) => setDefaults({ ...defaults, contingencyRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Default Currency</Label>
              <Select value={defaults.currency} onValueChange={(v) => setDefaults({ ...defaults, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Exchange Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={defaults.exchangeRate}
                onChange={(e) => setDefaults({ ...defaults, exchangeRate: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Default Well Basket</Label>
              <Select value={defaults.wellBasket} onValueChange={(v) => setDefaults({ ...defaults, wellBasket: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLB">SLB Well Basket</SelectItem>
                  <SelectItem value="Client">Client Well Basket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} className="industry-primary">Save Defaults</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
