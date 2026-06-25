import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { BarChart2, Download, TrendingUp, Users, Stethoscope } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#be185d"];

export default function Reports() {
  const { data: monthlyPatients, isLoading: loadingMP } = trpc.reports.monthlyPatients.useQuery();
  const { data: monthlyVisits, isLoading: loadingMV } = trpc.reports.monthlyVisits.useQuery();
  const { data: topDiagnoses } = trpc.reports.topDiagnoses.useQuery({ limit: 10 });
  const { data: patientStatus } = trpc.reports.patientStatus.useQuery();
  const { data: doctorStats } = trpc.reports.doctorStats.useQuery();

  const exportCSV = (data: any[], filename: string) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1><p className="text-sm text-muted-foreground mt-0.5">Clinic performance and statistics</p></div>
        <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => { if (monthlyVisits) exportCSV(monthlyVisits, "monthly_visits.csv"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Patients */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Monthly New Patients</CardTitle></CardHeader>
          <CardContent>
            {loadingMP ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyPatients ?? []}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            )}
            <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => monthlyPatients && exportCSV(monthlyPatients, "monthly_patients.csv")}><Download className="w-3 h-3" /> CSV</Button>
          </CardContent>
        </Card>

        {/* Monthly Visits */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> Monthly Visits</CardTitle></CardHeader>
          <CardContent>
            {loadingMV ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyVisits ?? []}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} /><Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
              </ResponsiveContainer>
            )}
            <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => monthlyVisits && exportCSV(monthlyVisits, "monthly_visits.csv")}><Download className="w-3 h-3" /> CSV</Button>
          </CardContent>
        </Card>

        {/* Top Diagnoses */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Top Diagnoses</CardTitle></CardHeader>
          <CardContent>
            {!topDiagnoses ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topDiagnoses} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart>
              </ResponsiveContainer>
            )}
            <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => topDiagnoses && exportCSV(topDiagnoses, "top_diagnoses.csv")}><Download className="w-3 h-3" /> CSV</Button>
          </CardContent>
        </Card>

        {/* Patient Status Distribution */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Patient Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {!patientStatus ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={patientStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {patientStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Doctor Statistics */}
      {doctorStats && doctorStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> Doctor Statistics</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40"><th className="text-left px-4 py-3 font-medium text-muted-foreground">Doctor</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Visits</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Appointments</th><th className="text-right px-4 py-3 font-medium text-muted-foreground">Prescriptions</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {doctorStats.map((d: any) => (
                    <tr key={d.doctorId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{d.doctorName}</td>
                      <td className="px-4 py-3 text-right">{d.visitCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">{d.appointmentCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">{d.prescriptionCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border"><Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportCSV(doctorStats, "doctor_stats.csv")}><Download className="w-3 h-3" /> Export CSV</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
