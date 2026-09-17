"use client";

import { ROLES, ValidationError, deniedReason, errorMessage, type Role, type TeamMember } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MailPlus, RotateCcw, Send, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

import { MemberStatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Field, Select, TextInput } from "@/components/ui/form";
import { ActionMenu, type MenuAction } from "@/components/ui/menu";
import { ErrorState, LoadingRows, Notice, PageBody, PageHeader, Panel } from "@/components/ui/page";
import { DataTable, type Column } from "@/components/ui/table";
import { notify } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatRelative, initials } from "@/lib/format";
import { queryKeys, useAdminMutation } from "@/lib/query";
import { useSession } from "@/lib/session";

/**
 * Who can sign in, and as what. Only the owner changes anything here; staff
 * see the list so they know who to ask. Accounts are never created by
 * signing up — the owner invites people by email.
 */
export function Team() {
  const { user, can } = useSession();
  const manage = can("team.manage");
  const confirm = useConfirm();
  const { data, isPending, error, refetch } = useQuery({ queryKey: queryKeys.team, queryFn: () => api.team.list() });
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<TeamMember | null>(null);

  const update = useAdminMutation(({ id, input }: { id: string; input: Parameters<typeof api.team.update>[1] }) => api.team.update(id, input), {
    failure: "Nothing was changed",
  });
  const resend = useAdminMutation((id: string) => api.team.resendInvite(id), { success: "Invitation sent again", failure: "The invitation was not sent" });

  const deactivate = async (member: TeamMember) => {
    const ok = await confirm({
      title: `Deactivate ${member.name}?`,
      body: "They are signed out and can no longer sign in. Their notes and history keep their name. Open enquiries they were handling become unassigned.",
      confirmLabel: "Deactivate",
      tone: "danger",
    });
    if (ok) update.mutate({ id: member.id, input: { status: "deactivated" } }, { onSuccess: () => notify.success(`${member.name} deactivated`) });
  };

  const reactivate = (member: TeamMember) =>
    update.mutate({ id: member.id, input: { status: "active" } }, { onSuccess: () => notify.success(`${member.name} can sign in again`) });

  const menu = (member: TeamMember): MenuAction[] => {
    const self = member.id === user.id;
    return [
      { label: "Change role", icon: <ShieldCheck />, onSelect: () => setChangingRole(member), hidden: member.status === "deactivated" },
      { label: "Send invitation again", icon: <Send />, onSelect: () => resend.mutate(member.id), hidden: member.status !== "invited" },
      { label: "Reactivate", icon: <RotateCcw />, onSelect: () => reactivate(member), hidden: member.status !== "deactivated" },
      "separator",
      {
        label: member.status === "invited" ? "Cancel invitation" : "Deactivate",
        icon: <UserMinus />,
        tone: "danger",
        onSelect: () => void deactivate(member),
        hidden: member.status === "deactivated",
        disabled: self,
        reason: self ? "You cannot deactivate yourself." : undefined,
      },
    ];
  };

  const members = [...(data ?? [])].sort((a, b) => {
    const order = { active: 0, invited: 1, deactivated: 2 } as const;
    return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
  });

  const columns: Column<TeamMember>[] = [
    {
      id: "name",
      header: "Name",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center bg-ink-100 text-xs font-medium">
            {initials(member.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {member.name}
              {member.id === user.id ? <span className="ml-2 text-xs font-normal text-ink-500">You</span> : null}
            </p>
            <p className="truncate text-xs text-ink-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    { id: "role", header: "Role", cell: (member) => <Tag>{ROLES.find((role) => role.value === member.role)?.label}</Tag> },
    { id: "status", header: "Status", cell: (member) => <MemberStatusBadge status={member.status} /> },
    {
      id: "active",
      header: "Last signed in",
      minWidth: "lg",
      cell: (member) => <span className="text-[0.8125rem] text-ink-600">{member.lastActiveAt ? formatRelative(member.lastActiveAt) : member.status === "invited" ? "Not yet accepted" : "Never"}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        eyebrow="Business"
        title="Team"
        description="Everyone who can sign in to this admin."
        actions={
          manage ? (
            <Button variant="primary" onClick={() => setInviting(true)}>
              <UserPlus aria-hidden />
              Invite someone
            </Button>
          ) : null
        }
      />

      {!manage ? <Notice className="mb-5">{deniedReason("team.manage")} Ask them to invite someone or change a role.</Notice> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} title="The team could not be loaded" />
          ) : isPending ? (
            <LoadingRows rows={3} thumb={false} label="Loading the team" />
          ) : (
            <DataTable
              caption="Team"
              rows={members}
              columns={columns}
              rowKey={(member) => member.id}
              sortable={false}
              rowClassName={(member) => (member.status === "deactivated" ? "bg-surface/60" : "")}
              actions={manage ? (member) => <ActionMenu label={`Actions for ${member.name}`} actions={menu(member)} /> : undefined}
              renderCard={(member) => (
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {member.name}
                    {member.id === user.id ? <span className="ml-2 text-xs font-normal text-ink-500">You</span> : null}
                  </p>
                  <p className="truncate text-xs text-ink-500">{member.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Tag>{ROLES.find((role) => role.value === member.role)?.label}</Tag>
                    <MemberStatusBadge status={member.status} />
                  </div>
                </div>
              )}
            />
          )}
        </div>

        <Panel title="What each role can do">
          <ul className="space-y-4">
            {ROLES.map((role) => (
              <li key={role.value}>
                <p className="text-sm font-medium">{role.label}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-600">{role.summary}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-ink-500">
            Every account signs in with its own email address. Don&rsquo;t share a login — notes and changes are recorded under the person who made them.
          </p>
        </Panel>
      </div>

      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
      {changingRole ? <RoleDialog member={changingRole} onClose={() => setChangingRole(null)} /> : null}
    </PageBody>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useAdminMutation(() => api.team.invite({ name, email, role }), {
    success: (member) => `Invitation created for ${member.name}`,
    successDetail: "They choose their own password from the invitation email.",
    onSuccess: onClose,
  });

  const submit = () => {
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = "Add their name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) local.email = "That doesn't look like an email address.";
    setErrors(local);
    if (Object.keys(local).length) return;
    mutation.mutate(undefined, { onError: (error) => error instanceof ValidationError && setErrors(error.fields) });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Invite someone"
      description="They receive an email with a link to choose a password. Nobody can sign up without one."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} busy={mutation.isPending}>
            <MailPlus aria-hidden />
            Send invitation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required error={errors.name}>
          {(c) => <TextInput {...c} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} data-autofocus />}
        </Field>
        <Field label="Email address" required error={errors.email}>
          {(c) => <TextInput {...c} type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Role" description={ROLES.find((item) => item.value === role)?.summary}>
          {(c) => (
            <Select {...c} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {mutation.error && !(mutation.error instanceof ValidationError && Object.keys(mutation.error.fields).length) ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

function RoleDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [role, setRole] = useState<Role>(member.role);
  const mutation = useAdminMutation(() => api.team.update(member.id, { role }), {
    success: "Role changed",
    successDetail: "It takes effect the next time they load a page.",
    onSuccess: onClose,
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Change ${member.name}'s role`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => mutation.mutate(undefined)} busy={mutation.isPending} disabled={role === member.role}>
            Change role
          </Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Role</legend>
        {ROLES.map((item) => (
          <label key={item.value} className={`flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors ${role === item.value ? "border-ink-950 bg-ink-50" : "border-border hover:border-ink-400"}`}>
            <input type="radio" name="role" checked={role === item.value} onChange={() => setRole(item.value)} className="mt-1 accent-ink-950" />
            <span>
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-[0.8125rem] text-ink-600">{item.summary}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {mutation.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
    </Dialog>
  );
}
