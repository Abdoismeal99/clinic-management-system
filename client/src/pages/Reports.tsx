import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, TrendingUp, Users, Activity, Stethoscope, Printer } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#065f46"];

function exportCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) => Object.values(row).map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { data: monthlyPatients, isLoading: loadingMP } = trpc.reports.monthlyPatients.useQuery();
  const { data: monthlyVisits, isLoading: loadingMV } = trpc.reports.monthlyVisits.useQuery();
  const { data: topDiagnoses } = trpc.reports.topDiagnoses.useQuery({ limit: 10 });
  const { data: patientStatus } = trpc.reports.patientStatus.useQuery();
  const { data: doctorStats } = trpc.reports.doctorStats.useQuery();

  const isLoading = loadingMP || loadingMV;

  // Summary stats
  const totalPatients = monthlyPatients?.reduce((s: number, m: any) => s + (m.count ?? 0), 0) ?? 0;
  const totalVisits = monthlyVisits?.reduce((s: number, m: any) => s + (m.count ?? 0), 0) ?? 0;
  const topDiag = topDiagnoses?.[0]?.diagnosis ?? "—";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Clinic statistics, trends, and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Patients (12mo)", value: totalPatients, icon: <Users className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
          { label: "Total Visits (12mo)", value: totalVisits, icon: <Activity className="w-5 h-5 text-green-600" />, bg: "bg-green-50" },
          { label: "Top Diagnosis", value: topDiag, icon: <Stethoscope className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50" },
          { label: "Doctors Active", value: doctorStats?.length ?? 0, icon: <TrendingUp className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>{stat.icon}</div>
              <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-16" /> : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="h-9">
          <TabsTrigger value="patients" className="text-sm">Patients</TabsTrigger>
          <TabsTrigger value="visits" className="text-sm">Visits</TabsTrigger>
          <TabsTrigger value="diagnoses" className="text-sm">Diagnoses</TabsTrigger>
          <TabsTrigger value="doctors" className="text-sm">Doctors</TabsTrigger>
        </TabsList>

        {/* Monthly Patients */}
        <TabsContent value="patients" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Monthly New Patients</CardTitle>
                <CardDescription>Patient registrations over the last 12 months</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => exportCSV(monthlyPatients ?? [], "monthly-patients")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyPatients ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Bar dataKey="count" name="New Patients" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Patient Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Patient Status Distribution</CardTitle>
                  <CardDescription>Current patient status breakdown</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => exportCSV(patientStatus ?? [], "patient-status")}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={patientStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {(patientStatus ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient Status Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(patientStatus ?? []).map((s: any, i: number) => (
                    <div key={s.status} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm capitalize">{s.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{s.count}</Badge>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {patientStatus ? Math.round((s.count / patientStatus.reduce((a: number, b: any) => a + b.count, 0)) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {(patientStatus ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monthly Visits */}
        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Monthly Visits</CardTitle>
                <CardDescription>Visit volume over the last 12 months</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => exportCSV(monthlyVisits ?? [], "monthly-visits")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyVisits ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Visits" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Diagnoses */}
        <TabsContent value="diagnoses" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Most Common Diagnoses</CardTitle>
                <CardDescription>Top diagnoses across all visits</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => exportCSV(topDiagnoses ?? [], "top-diagnoses")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topDiagnoses ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="diagnosis" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                    <Bar dataKey="count" name="Cases" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {(topDiagnoses ?? []).map((d: any, i: number) => (
                    <div key={d.diagnosis} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm">{d.diagnosis}</span>
                      </div>
                      <Badge variant="secondary">{d.count} cases</Badge>
                    </div>
                  ))}
                  {(topDiagnoses ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No diagnoses recorded yet</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Stats */}
        <TabsContent value="doctors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Doctor Statistics</CardTitle>
                <CardDescription>Visits and patients per doctor</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => exportCSV(doctorStats ?? [], "doctor-stats")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={doctorStats ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="doctorName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="totalVisits" name="Total Visits" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPatients" name="Unique Patients" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-2 font-medium text-muted-foreground">Doctor</th><th className="text-right py-2 font-medium text-muted-foreground">Visits</th><th className="text-right py-2 font-medium text-muted-foreground">Patients</th><th className="text-right py-2 font-medium text-muted-foreground">Prescriptions</th></tr></thead>
                  <tbody>
                    {(doctorStats ?? []).map((d: any) => (
                      <tr key={d.doctorId} className="border-b border-border/50 last:border-0">
                        <td className="py-2">{d.doctorName}</td>
                        <td className="py-2 text-right">{d.totalVisits}</td>
                        <td className="py-2 text-right">{d.totalPatients}</td>
                        <td className="py-2 text-right">{d.totalPrescriptions ?? 0}</td>
                      </tr>
                    ))}
                    {(doctorStats ?? []).length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No doctor statistics available</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
