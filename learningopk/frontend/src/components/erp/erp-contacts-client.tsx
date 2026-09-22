"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { createErpContact, erpKeys, getErpContacts } from "@/lib/erp-api";

const CONTACT_TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "lead", label: "Leads" },
  { value: "client", label: "Clients" },
  { value: "vendor", label: "Vendors" },
] as const;

const CONTACT_TYPES = [
  { value: "lead", label: "Lead" },
  { value: "client", label: "Client" },
  { value: "vendor", label: "Vendor" },
] as const;

const CONTACT_TYPE_BADGE: Record<string, "warning" | "success" | "info"> = {
  lead: "warning",
  client: "success",
  vendor: "info",
};

function typeBadgeVariant(contactType: string) {
  return CONTACT_TYPE_BADGE[contactType] ?? "neutral";
}

function typeLabel(contactType: string) {
  return contactType.charAt(0).toUpperCase() + contactType.slice(1);
}

const SOURCE_OPTIONS = [
  { value: "", label: "Select a source" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "campaign", label: "Campaign" },
  { value: "other", label: "Other" },
] as const;

export function ErpContactsClient() {
  const { activeSchool, hasPermission } = useErp();
  const queryClient = useQueryClient();
  const schoolId = activeSchool?.id;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [contactType, setContactType] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactType: "lead",
    email: "",
    phone: "",
    studentName: "",
    studentGrade: "",
    source: "",
    notes: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const contactsQuery = useQuery({
    queryKey: erpKeys.contacts(schoolId ?? 0, { search, contactType, page }),
    queryFn: () =>
      getErpContacts(schoolId!, {
        search: search || undefined,
        contactType: contactType || undefined,
        page,
        pageSize: 20,
      }),
    enabled: Boolean(schoolId) && hasPermission("CONTACTS_VIEW"),
    placeholderData: (prev) => prev,
  });

  const createContactMutation = useMutation({
    mutationFn: (data: Parameters<typeof createErpContact>[1]) => createErpContact(schoolId!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      setDialogOpen(false);
      setError(null);
      setForm({
        name: "",
        contactType: "lead",
        email: "",
        phone: "",
        studentName: "",
        studentGrade: "",
        source: "",
        notes: "",
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    },
  });

  if (!schoolId) return null;

  if (!hasPermission("CONTACTS_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include contact viewing for this school."
      />
    );
  }

  const contacts = contactsQuery.data?.items ?? [];
  const total = contactsQuery.data?.total ?? 0;
  const pageSize = contactsQuery.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canManage = hasPermission("CONTACTS_MANAGE");

  const handleCreate = () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    createContactMutation.mutate({
      name: form.name.trim(),
      contactType: form.contactType,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      studentName: form.studentName.trim() || undefined,
      studentGrade: form.studentGrade.trim() || undefined,
      source: form.source || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-text-secondary">
            Leads, clients, and vendors for {activeSchool.name}
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Add Contact
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {error ? (
              <p className="text-sm text-accent-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Parent or organization name"
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Type</label>
                <Select
                  value={form.contactType}
                  onChange={(e) => setForm((f) => ({ ...f, contactType: e.target.value }))}
                >
                  {CONTACT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+92 300 0000000"
              />
              <Input
                label="Student name"
                value={form.studentName}
                onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                placeholder="For parent contacts"
              />
              <Input
                label="Student grade"
                value={form.studentGrade}
                onChange={(e) => setForm((f) => ({ ...f, studentGrade: e.target.value }))}
                placeholder="e.g., Grade 9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Source</label>
              <Select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Context, requirements, follow-ups"
              rows={3}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createContactMutation.isPending}>
              Add Contact
            </Button>
          </DialogFooter>
        </Dialog>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={contactType}
          onChange={(e) => {
            setContactType(e.target.value);
            setPage(1);
          }}
          className="sm:w-48"
        >
          {CONTACT_TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {contactsQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : contactsQuery.isError ? (
        <EmptyState
          title="Failed to load contacts"
          description={
            contactsQuery.error instanceof Error ? contactsQuery.error.message : "Unknown error"
          }
        />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No contacts found"
          description={
            search || contactType
              ? "Try clearing the search or type filter."
              : "Add your first contact to start tracking leads and clients."
          }
          action={
            canManage && !search && !contactType ? (
              <Button
                onClick={() => {
                  setError(null);
                  setDialogOpen(true);
                }}
                iconLeft={<Plus className="h-4 w-4" />}
              >
                Add Contact
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Contacts
              <span className="ml-2 text-sm font-normal text-text-secondary">{total} total</span>
            </CardTitle>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Phone / Email</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-bg-subtle/50">
                    <td className="px-4 py-3 font-medium text-text-primary">{contact.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={typeBadgeVariant(contact.contactType)}>
                        {typeLabel(contact.contactType)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {contact.studentName ? (
                        <span>
                          {contact.studentName}
                          {contact.studentGrade ? (
                            <span className="text-text-muted"> · {contact.studentGrade}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        {contact.phone ? (
                          <span className="text-text-secondary">{contact.phone}</span>
                        ) : null}
                        {contact.email ? (
                          <span className="text-text-secondary">{contact.email}</span>
                        ) : null}
                        {!contact.phone && !contact.email ? (
                          <span className="text-text-muted">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {contact.source ? (
                        typeLabel(contact.source)
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || contactsQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || contactsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
