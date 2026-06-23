import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import type { Tender, TenderStatus, TenderWithServices } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-industry-primary/10 text-industry-primary",
  approved: "bg-industry-success/10 text-industry-success",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_TABS = ["all", "draft", "sent", "approved", "rejected"] as const;

export default function TenderHistory() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("all");
  const [statusAction, setStatusAction] = useState<{ tender: Tender; status: TenderStatus } | null>(null);
  const [viewTenderId, setViewTenderId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenders = [], isLoading } = useQuery<Tender[]>({
    queryKey: ["/api/tenders"],
  });

  const { data: tenderDetail } = useQuery<TenderWithServices>({
    queryKey: ["/api/tenders", viewTenderId],
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${viewTenderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tender");
      return res.json();
    },
    enabled: viewTenderId !== null,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TenderStatus }) => {
      return apiRequest("PATCH", `/api/tenders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      setStatusAction(null);
      toast({ title: "Status updated", description: "Tender status has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/tenders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({ title: "Tender deleted" });
    },
  });

  const filteredTenders =
    statusFilter === "all" ? tenders : tenders.filter((t) => (t.status ?? "draft") === statusFilter);

  const formatMoney = (amount: string | null) =>
    `$${parseFloat(amount ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const columns = [
    {
      header: "Project",
      accessor: "projectName" as keyof Tender,
      render: (t: Tender) => (
        <div>
          <p className="font-medium text-gray-900">{t.projectName}</p>
          <p className="text-xs text-gray-500">{t.clientName}</p>
        </div>
      ),
    },
    {
      header: "Well Type",
      accessor: "wellType" as keyof Tender,
      render: (t: Tender) => <span className="text-sm">{t.wellType || "—"}</span>,
    },
    {
      header: "Total",
      accessor: "totalAmount" as keyof Tender,
      render: (t: Tender) => <span className="font-semibold">{formatMoney(t.totalAmount)}</span>,
    },
    {
      header: "Status",
      accessor: "status" as keyof Tender,
      render: (t: Tender) => (
        <Badge className={statusColors[t.status ?? "draft"]}>{t.status ?? "draft"}</Badge>
      ),
    },
    {
      header: "Created",
      accessor: "createdAt" as keyof Tender,
      render: (t: Tender) => (
        <span className="text-sm text-gray-500">
          {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "id" as keyof Tender,
      render: (t: Tender) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" title="View details" onClick={() => setViewTenderId(t.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {t.status === "draft" && (
            <Button variant="ghost" size="sm" onClick={() => setStatusAction({ tender: t, status: "sent" })}>
              <Send className="h-4 w-4" />
            </Button>
          )}
          {t.status === "sent" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStatusAction({ tender: t, status: "approved" })}>
                <CheckCircle className="h-4 w-4 text-industry-success" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStatusAction({ tender: t, status: "rejected" })}>
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Delete this tender?")) deleteMutation.mutate(t.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-industry-error" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-6 animate-pulse h-96 bg-gray-200 rounded-xl m-6" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Tender History</h2>
          <p className="text-gray-600">Manage tender lifecycle and track submission status</p>
        </div>
        <Link href="/generate-tender">
          <Button className="industry-primary">
            <Eye className="h-4 w-4 mr-2" />
            New Tender
          </Button>
        </Link>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} ({s === "all" ? tenders.length : tenders.filter((t) => (t.status ?? "draft") === s).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "all" ? "All Tenders" : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Tenders`} ({filteredTenders.length})
          </CardTitle>
          <CardDescription>Draft ? Sent ? Approved/Rejected workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable data={filteredTenders} columns={columns} searchable pagination />
        </CardContent>
      </Card>

      <Dialog open={viewTenderId !== null} onOpenChange={(open) => !open && setViewTenderId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tenderDetail?.projectName ?? "Tender Details"}</DialogTitle>
          </DialogHeader>
          {tenderDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{tenderDetail.clientName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className={statusColors[tenderDetail.status ?? "draft"]}>{tenderDetail.status}</Badge>
                </div>
                <div>
                  <p className="text-gray-500">Well Type</p>
                  <p>{tenderDetail.wellType || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-semibold">{formatMoney(tenderDetail.totalAmount)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Line Items ({tenderDetail.services.length})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Service</th>
                        <th className="px-3 py-2 text-left">Well Class</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit</th>
                        <th className="px-3 py-2 text-right">Markup</th>
                        <th className="px-3 py-2 text-right">Discount</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenderDetail.services.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium">{item.service.name}</div>
                            <div className="text-xs text-gray-500">{item.service.segment}</div>
                          </td>
                          <td className="px-3 py-2">{item.wellClass || "—"}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right">{item.appliedMarkup ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{item.appliedWellDiscount ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatMoney(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusAction !== null} onOpenChange={(open) => !open && setStatusAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status change</AlertDialogTitle>
            <AlertDialogDescription>
              Change &quot;{statusAction?.tender.projectName}&quot; to <strong>{statusAction?.status}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (statusAction) {
                  statusMutation.mutate({ id: statusAction.tender.id, status: statusAction.status });
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
