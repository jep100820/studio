import DashboardClient from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <DashboardClient />
    </div>
  );
}
