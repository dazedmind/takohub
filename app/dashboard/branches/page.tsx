"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  useBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from "@/lib/queries";
import type { Branch, CreateBranchInput } from "@/lib/types";

const EMPTY_FORM: CreateBranchInput = {
  branchName: "",
  address: "",
};

export default function BranchesPage() {
  const { data, isLoading } = useBranchesQuery();
  const branches = data?.branches || [];
  const dialog = useGlobalDialog();

  const createMutation = useCreateBranchMutation();
  const updateMutation = useUpdateBranchMutation();
  const deleteMutation = useDeleteBranchMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_FORM);

  const openCreate = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      branchName: branch.branchName ?? "",
      address: branch.address ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchName.trim()) {
      dialog.show({ title: "Verification Required", message: "Branch name is required", type: "error" });
      return;
    }

    try {
      if (editingBranch) {
        await updateMutation.mutateAsync({
          branchId: editingBranch.branchId,
          data: form,
        });
        dialog.show({ title: "Success", message: "Branch updated", type: "success" });
      } else {
        await createMutation.mutateAsync(form);
        dialog.show({ title: "Success", message: "Branch created", type: "success" });
      }
      setDialogOpen(false);
    } catch (error) {
      dialog.show({ title: "Error", message: error instanceof Error ? error.message : "Save failed", type: "error" });
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Delete branch "${branch.branchName}"?`)) return;

    try {
      await deleteMutation.mutateAsync(branch.branchId);
      dialog.show({ title: "Success", message: "Branch deleted", type: "success" });
    } catch (error) {
      dialog.show({ title: "Error", message: error instanceof Error ? error.message : "Delete failed", type: "error" });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Branch Management
          </h1>
          <p className="text-xs text-zinc-500">
            Configure physical branch locations.
          </p>
        </div>
        <Button
          onClick={openCreate}
          variant="primary"
          size="sm"
          className="gap-1.5"
        >
          <Plus size={14} />
          <span>Add Branch</span>
        </Button>
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading branches...</p>
          ) : branches.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No branches found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                    {/* <th className="py-3 px-4 font-bold">ID</th> */}
                    <th className="py-3 px-4 font-bold">Branch Name</th>
                    <th className="py-3 px-4 font-bold">Address / Location</th>
                    <th className="py-3 px-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {branches.map((branch) => (
                    <tr
                      key={branch.branchId}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* <td className="py-3 px-4 font-mono text-zinc-500 font-bold">#{branch.branchId}</td> */}
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {branch.branchName}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-medium">{branch.address || "—"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(branch)}
                            className="h-8 gap-1.5 text-xs font-semibold"
                          >
                            <Pen size={14} />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(branch)}
                            disabled={deleteMutation.isPending}
                            className="h-8 gap-1.5 text-red-600 hover:text-red-700 text-xs font-semibold"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <DialogTitle>
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3 text-sm">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Branch Name</label>
                <Input
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="e.g. Branch 4 - North Station"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Address / Location</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Ground Floor, Building A"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
