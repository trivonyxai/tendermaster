import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  List, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Upload, 
  Download,
  CheckCircle,
  Clock,
  Calculator,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardStats, Service, ActivityItem } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentServices, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  if (statsLoading || servicesLoading || activityLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your tender generation activities and service management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalServices || 0}</p>
              </div>
              <div className="w-12 h-12 bg-industry-primary/10 rounded-lg flex items-center justify-center">
                <List className="h-6 w-6 text-industry-primary" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">
                {stats?.servicesTrend === "N/A" ? "N/A" : `${stats?.servicesTrend} from last month`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tenders</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeTenders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-industry-accent/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-industry-accent" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">
                {stats?.tendersTrend === "N/A" ? "N/A" : `${stats?.tendersTrend} from last month`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalValue || "$0"}</p>
              </div>
              <div className="w-12 h-12 bg-industry-success/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-industry-success" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">
                {stats?.valueTrend === "N/A" ? "N/A" : `${stats?.valueTrend} from last month`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.completionRate || "0%"}</p>
              </div>
              <div className="w-12 h-12 bg-industry-warning/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-industry-warning" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">
                {stats?.completionTrend === "N/A" ? "N/A" : `${stats?.completionTrend} from last month`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-5 h-5 bg-industry-accent rounded flex items-center justify-center">
                <Plus className="h-3 w-3 text-white" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/generate-tender">
              <Button className="w-full justify-between industry-primary">
                <div className="flex items-center space-x-3">
                  <Plus className="h-4 w-4" />
                  <span>Generate New Tender</span>
                </div>
                <span>→</span>
              </Button>
            </Link>
            <Link href="/data-import">
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center space-x-3">
                  <Upload className="h-4 w-4" />
                  <span>Import Service Data</span>
                </div>
                <span>→</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={async () => {
                const res = await fetch("/api/tenders/export", { credentials: "include" });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "tenders-export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <div className="flex items-center space-x-3">
                <Download className="h-4 w-4" />
                <span>Export Tender Report</span>
              </div>
              <span>→</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.length > 0 ? (
              activity.slice(0, 5).map((item) => (
                <Link key={item.id} href={item.href ?? "/history"}>
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="w-8 h-8 bg-industry-success/10 rounded-full flex items-center justify-center">
                      {item.type === "status_change" ? (
                        <Clock className="h-4 w-4 text-industry-primary" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-industry-success" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.description} · {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {item.status && (
                      <Badge variant="secondary" className="text-xs capitalize">{item.status}</Badge>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No activity yet. Generate your first tender.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Services Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Services</CardTitle>
              <CardDescription>Recently added or modified services</CardDescription>
            </div>
            <Link href="/service-master">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentServices?.slice(0, 5).map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-industry-primary/10 rounded-lg flex items-center justify-center">
                    <List className="h-4 w-4 text-industry-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.segment}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{service.pricingType}</Badge>
                  <span className="text-sm font-medium text-gray-900">${service.baseRate}</span>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <List className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No services found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
