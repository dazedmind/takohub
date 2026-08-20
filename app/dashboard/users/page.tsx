"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pen, Plus, Trash2 } from "lucide-react";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/lib/queries";
import type { CreateUserInput, User, UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Owner (Admin)",
  IM: "Inventory Manager",
  BS: "Branch Seller",
};

const EMPTY_FORM: CreateUserInput = {
  name: "",
  email: "",
  password: "",
  role: "BS",
};

export default function UsersPage() {
  const { data, isLoading } = useUsersQuery();
  const users = data?.users || [];
  const dialog = useGlobalDialog();

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    const username = user.username || user.email;
    setForm({
      name: user.name,
      email: username,
      password: "",
      role: user.role,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      dialog.show({ title: "Verification Required", message: "Name and username are required", type: "error" });
      return;
    }
    if (!editingUser && !form.password) {
      dialog.show({ title: "Verification Required", message: "Password is required for new accounts", type: "error" });
      return;
    }

    const email = form.email.trim();

    try {
      if (editingUser) {
        await updateMutation.mutateAsync({
          userId: editingUser.id,
          data: {
            name: form.name.trim(),
            email,
            role: form.role,
            ...(form.password && { password: form.password }),
          },
        });
        dialog.show({ title: "Success", message: "User updated", type: "success" });
      } else {
        await createMutation.mutateAsync({
          ...form,
          name: form.name.trim(),
          email,
        });
        dialog.show({ title: "Success", message: "User created", type: "success" });
      }
      setDialogOpen(false);
    } catch (error) {
      dialog.show({ title: "Error", message: error instanceof Error ? error.message : "Save failed", type: "error" });
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(user.id);
      dialog.show({ title: "Success", message: "User deleted", type: "success" });
    } catch (error) {
      dialog.show({ title: "Error", message: error instanceof Error ? error.message : "Delete failed", type: "error" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            User Accounts
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage employee access, assignments, and authorization roles.
          </p>
        </div>
        <Button
          onClick={openCreate}
          variant="primary"
          size="sm"
          className="gap-2 text-sm font-semibold h-10"
        >
          <Plus size={16} />
          <span>Add User</span>
        </Button>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-zinc-500 py-8 text-center">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                    <th className="py-3 px-4 font-bold">Name</th>
                    <th className="py-3 px-4 font-bold">Username</th>
                    <th className="py-3 px-4 font-bold">Role</th>
                    <th className="py-3 px-4 font-bold">Created</th>
                    <th className="py-3 px-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map((u) => {
                    const cleanUsername = u.username || u.email;
                    const badgeClass =
                      u.role === "ADMIN"
                        ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20"
                        : u.role === "IM"
                        ? "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20"
                        : "border-[#ebd060] text-amber-600 bg-amber-50/50 dark:bg-amber-950/20";
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                          {u.name}
                        </td>
                        <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100 font-semibold">
                          {cleanUsername}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${badgeClass}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(u)}
                              className="h-8 gap-1 text-xs font-semibold"
                            >
                              <Pen size={14} />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(u)}
                              disabled={deleteMutation.isPending}
                              className="h-8 gap-1 text-red-600 hover:text-red-700 text-xs font-semibold"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingUser ? "Edit User Account" : "Add New User Account"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                  Full Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                  Username
                </label>
                <Input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. juandelacruz"
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                  Password{editingUser ? " (leave blank to retain current)" : ""}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required={!editingUser}
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                  System Role
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  <option value="BS">Branch Seller (BS)</option>
                  <option value="IM">Inventory Manager (IM)</option>
                  <option value="ADMIN">Owner / Admin</option>
                </select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
                className="h-10 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSaving}
                className="h-10 text-sm font-bold"
              >
                {isSaving ? "Saving..." : editingUser ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
