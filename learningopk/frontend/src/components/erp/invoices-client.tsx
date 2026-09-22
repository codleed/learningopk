"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  getErpInvoice,
  getErpInvoices,
  getErpPayments,
  getFinanceStats,
  recordErpPayment,
  setErpInvoiceStatus,
  type ErpInvoice,
} from "@/lib/erp-api";

const INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
];

const STATUS_BADGE_VARIANTS: Record<string, BadgeProps["variant"]> = {
  draft: "neutral",
  sent: "info",
  viewed: "default",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  void: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

const PAGE_SIZE = 20;

function formatMoney(value: string | number): string {
  return `Rs ${Number(value).toLocaleString()}`;
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status] ?? "neutral"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-2xl font-bold text-accent-primary">{value}</div>
        <div className="text-sm text-text-secondary">{label}</div>
      </CardBody>
    </Card>
  );
}

function PaymentMethodLabel({ method }: { method: string }) {
  return <span>{PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method}</span>;
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  schoolId,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
  invoice: ErpInvoice;
}) {
  const queryClient = useQueryClient();
  const outstanding = Math.max(Number(invoice.total) - Number(invoice.amountPaid), 0);
  const [amount, setAmount] = useState(() => (outstanding > 0 ? String(outstanding) : ""));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  const recordMutation = useMutation({
    mutationFn: () =>
      recordErpPayment(schoolId, invoice.id, {
        amount: Number(amount),
        method,
        reference: reference.trim() === "" ? undefined : reference.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["erp"] });
      onOpenChange(false);
    },
  });

  const parsedAmount = Number(amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="rounded-lg border border-border bg-bg-subtle p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Total</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-text-secondary">Paid</span>
            <span>{formatMoney(invoice.amountPaid)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-medium">
            <span className="text-text-secondary">Outstanding</span>
            <span className="text-accent-primary">{formatMoney(outstanding)}</span>
          </div>
        </div>
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount received"
        />
        <div className="space-y-1.5">
          <label htmlFor="payment-method" className="block text-sm font-medium text-text-primary">
            Method
          </label>
          <Select id="payment-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Reference (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Bank reference / cheque number"
        />
        {recordMutation.isError ? (
          <p className="text-sm text-accent-danger">
            {recordMutation.error instanceof Error
              ? recordMutation.error.message
              : "Failed to record payment"}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          loading={recordMutation.isPending}
          disabled={!Number.isFinite(parsedAmount) || parsedAmount <= 0}
          onClick={() => recordMutation.mutate()}
        >
          Record Payment
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function InvoiceDetailDialog({
  schoolId,
  invoiceId,
  onOpenChange,
  canManageStatus,
  canRecordPayment,
}: {
  schoolId: number;
  invoiceId: number | null;
  onOpenChange: (open: boolean) => void;
  canManageStatus: boolean;
  canRecordPayment: boolean;
}) {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ["erp", "invoice", schoolId, invoiceId],
    queryFn: () => getErpInvoice(schoolId, invoiceId!),
    enabled: invoiceId !== null,
  });

  const invoice = invoiceQuery.data?.invoice;

  const paymentsQuery = useQuery({
    queryKey: ["erp", "payments", schoolId, { invoiceId }],
    queryFn: () => getErpPayments(schoolId, { invoiceId: invoiceId!, pageSize: 50 }),
    enabled: invoiceId !== null && invoiceQuery.isSuccess,
  });

  const sendMutation = useMutation({
    mutationFn: (target: ErpInvoice) => setErpInvoiceStatus(schoolId, target.id, "sent"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["erp"] });
    },
  });

  return (
    <Dialog open={invoiceId !== null} onOpenChange={onOpenChange} size="lg">
      {invoiceQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : invoiceQuery.isError ? (
        <EmptyState
          title="Failed to load invoice"
          description={
            invoiceQuery.error instanceof Error ? invoiceQuery.error.message : "Unknown error"
          }
        />
      ) : invoice ? (
        <>
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
              <StatusBadge status={invoice.status} />
            </div>
          </DialogHeader>
          <DialogBody className="space-y-6">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-text-secondary">Student: </span>
                <span>{invoice.studentName ?? "Unassigned"}</span>
              </div>
              <div>
                <span className="text-text-secondary">Issue date: </span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="text-text-secondary">Due date: </span>
                <span>{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</span>
              </div>
              <div>
                <span className="text-text-secondary">Amount paid: </span>
                <span className="text-accent-success">{formatMoney(invoice.amountPaid)}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Items</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle text-left text-xs uppercase tracking-wide text-text-secondary">
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).map((item, index) => (
                      <tr key={item.id ?? index} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                    {(invoice.items ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-text-secondary">
                          No line items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Subtotal</span>
                  <span>{formatMoney(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Discount</span>
                  <span>-{formatMoney(invoice.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tax</span>
                  <span>{formatMoney(invoice.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(invoice.total)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Payments</h3>
              {paymentsQuery.isPending ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : paymentsQuery.isError ? (
                <p className="text-sm text-text-secondary">
                  Payments are not visible with your current role.
                </p>
              ) : (paymentsQuery.data?.items ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-bg-subtle text-left text-xs uppercase tracking-wide text-text-secondary">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentsQuery.data?.items ?? []).map((payment) => (
                        <tr key={payment.id} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">{formatDate(payment.paidAt)}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(payment.amount)}</td>
                          <td className="px-3 py-2">
                            <PaymentMethodLabel method={payment.method} />
                          </td>
                          <td className="px-3 py-2">{payment.reference ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {sendMutation.isError ? (
              <p className="text-sm text-accent-danger">
                {sendMutation.error instanceof Error
                  ? sendMutation.error.message
                  : "Failed to update invoice status"}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {canManageStatus && invoice.status === "draft" ? (
              <Button
                variant="secondary"
                loading={sendMutation.isPending}
                onClick={() => sendMutation.mutate(invoice)}
              >
                Send Invoice
              </Button>
            ) : null}
            {canRecordPayment && invoice.status !== "void" ? (
              <Button onClick={() => setPaymentOpen(true)}>Record Payment</Button>
            ) : null}
          </DialogFooter>
        </>
      ) : null}
      {canRecordPayment && invoice && invoice.status !== "void" ? (
        <RecordPaymentDialog
          key={`payment-${invoice.id}-${invoice.amountPaid}`}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          schoolId={schoolId}
          invoice={invoice}
        />
      ) : null}
    </Dialog>
  );
}

export function InvoicesClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const canManageStatus = hasPermission("INVOICES_MANAGE");
  const canRecordPayment = hasPermission("PAYMENTS_MANAGE");

  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const statsQuery = useQuery({
    queryKey: ["erp", "stats", schoolId, "finance"],
    queryFn: () => getFinanceStats(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("INVOICES_VIEW"),
  });

  const invoicesQuery = useQuery({
    queryKey: ["erp", "invoices", schoolId, { status, search, page }],
    queryFn: () =>
      getErpInvoices(schoolId!, {
        status: status === "" ? undefined : status,
        search: search === "" ? undefined : search,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(schoolId) && hasPermission("INVOICES_VIEW"),
  });

  if (!schoolId) return null;

  if (!hasPermission("INVOICES_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include invoice viewing for this school."
      />
    );
  }

  const stats = statsQuery.data;
  const invoiceItems = invoicesQuery.data?.items ?? [];
  const total = invoicesQuery.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-text-secondary">Student billing and payment recording</p>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Outstanding" value={`Rs ${stats.outstanding.toLocaleString()}`} />
          <StatCard label="Collected" value={`Rs ${stats.collected.toLocaleString()}`} />
          <Card>
            <CardBody>
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-sm text-text-secondary">
                Invoices{status !== "" ? ` (${STATUS_LABELS[status] ?? status})` : ""}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label
            htmlFor="invoice-status-filter"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            Status
          </label>
          <Select
            id="invoice-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-56 flex-1 sm:max-w-xs">
          <Input
            label="Search by number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="INV-2025-0001"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {invoicesQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : invoicesQuery.isError ? (
        <EmptyState
          title="Failed to load invoices"
          description={
            invoicesQuery.error instanceof Error ? invoicesQuery.error.message : "Unknown error"
          }
        />
      ) : invoiceItems.length === 0 ? (
        <EmptyState
          title="No invoices"
          description={
            search !== "" || status !== ""
              ? "No invoices match the current filters."
              : "Invoices appear here once fee billing has been generated."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-left text-xs uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                  className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-bg-subtle"
                >
                  <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{invoice.studentName ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(invoice.issueDate)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(invoice.total)}</td>
                  <td className="px-4 py-3 text-right text-accent-success">
                    {formatMoney(invoice.amountPaid)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && !invoicesQuery.isPending && !invoicesQuery.isError ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {page} of {totalPages} · {total} invoices
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              iconLeft={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <InvoiceDetailDialog
        schoolId={schoolId}
        invoiceId={selectedInvoiceId}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceId(null);
        }}
        canManageStatus={canManageStatus}
        canRecordPayment={canRecordPayment}
      />
    </div>
  );
}
