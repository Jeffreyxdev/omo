import type { Metadata } from "next";
import { prisma } from "@udyking/db";
import UsersManager from "@/components/UsersManager";

export const metadata: Metadata = { title: "Staff" };

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          openedShifts: true,
          inventoryChecks: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Staff Accounts</h1>
        <p className="page-desc mt-1">
          Create accounts for pump attendants, supervisors and managers.
        </p>
      </div>
      <UsersManager users={users} />
    </div>
  );
}
