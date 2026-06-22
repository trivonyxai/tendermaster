import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import GenerateTender from "@/pages/generate-tender";
import ServiceMaster from "@/pages/service-master";
import DataImport from "@/pages/data-import";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function Router() {
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
            <Route path="/data-import" component={DataImport} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
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
