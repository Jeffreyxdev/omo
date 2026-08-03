"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@udyking/shared";
import { ROLE_LABELS, formatDate } from "@udyking/shared";
import { Icon } from "@/components/icons";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  _count: { openedShifts: number; inventoryChecks: number };
};

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ATTENDANT");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create user");
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user: UserRow, newRole: Role) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not update role");
      return;
    }
    router.refresh();
  }

  async function resetPassword(user: UserRow) {
    const newPassword = prompt(`New password for ${user.name} (min 6 characters):`);
    if (!newPassword) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not reset password");
      return;
    }
    alert("Password updated.");
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete account for ${user.name}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not delete user");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <form onSubmit={createUser} className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-5">
        <div>
          <label className="label">Full name</label>
          <input className="input" placeholder="e.g. John Ade" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="staff@udyking.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="text" className="input" placeholder="min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ATTENDANT">Attendant</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            <Icon name="plus" />
            Add Staff
          </button>
        </div>
      </form>

      {error && <div className="px-5 pt-3 text-sm text-rose-600">{error}</div>}

      <div className="overflow-x-auto p-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Shifts</th>
              <th className="th">Created</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium text-slate-800">{u.name}</td>
                <td className="td">{u.email}</td>
                <td className="td">
                  <select
                    className="input w-36"
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                  >
                    <option value="ATTENDANT">Attendant</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </td>
                <td className="td">{u._count.openedShifts}</td>
                <td className="td">{formatDate(u.createdAt)}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => resetPassword(u)}>
                      Reset password
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
