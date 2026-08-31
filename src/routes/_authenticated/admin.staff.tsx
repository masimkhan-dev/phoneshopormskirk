import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { EmptyState, PageHeader, Section, StatusBadge, TableShell, Td, Th } from "@/components/admin/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/useAdminSession";
import { callRpc } from "@/lib/admin/db";
import { ukDate } from "@/lib/admin/money";
import { staffQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  component: Staff,
});

const ROLES = ["OWNER", "ADMIN", "STAFF", "TECHNICIAN"] as const;

function Staff() {
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const { data = [], isLoading } = useQuery(staffQuery);
  const roles = session?.roles ?? [];
  const canManage = roles.includes("OWNER") || roles.includes("ADMIN");

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      callRpc("set_user_role", { p: { user_id: userId, role } }),
    onSuccess: () => {
      toast.success("Role updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff and access"
        description="Anyone who signs up needs a role here before they can work at the counter."
      />

      <Section>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data.length ? (
          <TableShell>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th>Role</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-surface">
                  <Td className="font-bold">{p.full_name ?? "—"}</Td>
                  <Td className="text-muted-foreground">{p.email ?? "—"}</Td>
                  <Td className="text-muted-foreground">{ukDate(p.created_at)}</Td>
                  <Td>
                    <StatusBadge tone={p.active ? "green" : "neutral"}>
                      {p.active ? "Active" : "Disabled"}
                    </StatusBadge>
                  </Td>
                  <Td>
                    {canManage ? (
                      <Select
                        value={p.role}
                        onValueChange={(role) => setRole.mutate({ userId: p.id, role })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r.charAt(0) + r.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge tone="red">{p.role.toLowerCase()}</StatusBadge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No staff accounts yet." />
        )}
      </Section>
    </div>
  );
}
