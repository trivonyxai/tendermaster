import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import GenerateTender from "@/pages/generate-tender";
import ServiceMaster from "@/pages/service-master";
import PricingSchedulePage from "@/pages/pricing-schedule";
import WellTimesPage from "@/pages/well-times";
import DataImport from "@/pages/data-import";
import TenderHistory from "@/pages/tender-history";
import SettingsPage from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data, isLoading, isError } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (isError || data?.authenticated === false) && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, isError, data, location, setLocation]);

  if (location === "/login") return <>{children}</>;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industry-primary" />
      </div>
    );
  }
  if (isError || !data?.authenticated) return null;
  return <>{children}</>;
}

function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/generate-tender" component={GenerateTender} />
            <Route path="/service-master" component={ServiceMaster} />
            <Route path="/pricing" component={PricingSchedulePage} />
            <Route path="/well-times" component={WellTimesPage} />
            <Route path="/history" component={TenderHistory} />
            <Route path="/data-import" component={DataImport} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/login") {
    return <Login />;
  }

  return (
    <AuthGuard>
      <AppLayout />
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
