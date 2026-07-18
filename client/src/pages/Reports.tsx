import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, TrendingUp, Users, Activity, Stethoscope, Printer, Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { useT } from "@/contexts/SettingsContext";
import { Streamdown } from 'streamdown';

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
  const { t } = useT();
  const { data: monthlyPatients, isLoading: loadingMP } = trpc.reports.monthlyPatients.useQuery();
  const { data: monthlyVisits, isLoading: loadingMV } = trpc.reports.monthlyVisits.useQuery();
  const { data: topDiagnoses } = trpc.reports.topDiagnoses.useQuery({ limit: 10 });
  const { data: patientStatus } = trpc.reports.patientStatus.useQuery();
  const { data: doctorStats } = trpc.reports.doctorStats.useQuery();

  const isLoading = loadingMP || loadingMV;
  const [aiReport, setAiReport] = useState<{ report: string; generatedAt: string; dataSnapshot: any } | null>(null);
  const aiMutation = trpc.reports.aiAnalysis.useMutation({
    onSuccess: (data) => setAiReport(data),
    onError: (e) => { import('sonner').then(({ toast }) => toast.error('AI analysis failed: ' + e.message)); },
  });

  // Summary stats
  const totalPatients = monthlyPatients?.reduce((s: number, m: any) => s + (m.count ?? 0), 0) ?? 0;
  const totalVisits = monthlyVisits?.reduce((s: number, m: any) => s + (m.count ?? 0), 0) ?? 0;
  const topDiag = topDiagnoses?.[0]?.diagnosis ?? "—";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("reports", "title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إحصائيات العيادة والاتجاهات ومؤشرات الأداء</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> {t("common", "print")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المرضى (12 شهر)", value: totalPatients, icon: <Users className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
          { label: "إجمالي الزيارات (12 شهر)", value: totalVisits, icon: <Activity className="w-5 h-5 text-green-600" />, bg: "bg-green-50" },
          { label: "أكثر تشخيص", value: topDiag, icon: <Stethoscope className="w-5 h-5 text-purple-600" />, bg: "bg-purple-50" },
          { label: "الأطباء النشطون", value: doctorStats?.length ?? 0, icon: <TrendingUp className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>{stat.icon}</div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-16" /> : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="h-9">
          <TabsTrigger value="patients" className="text-sm">{t("reports", "patients")}</TabsTrigger>
          <TabsTrigger value="visits" className="text-sm">{t("reports", "visits")}</TabsTrigger>
          <TabsTrigger value="diagnoses" className="text-sm">{t("reports", "diagnosisStats")}</TabsTrigger>
          <TabsTrigger value="doctors" className="text-sm">{t("reports", "doctorStats")}</TabsTrigger>
          <TabsTrigger value="ai" className="text-sm gap-1.5"><Sparkles className="w-3.5 h-3.5" />{t("reports", "aiAnalysis")}</TabsTrigger>
        </TabsList>

        {/* Monthly Patients */}
        <TabsContent value="patients" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">المرضى الجدد شهرياً</CardTitle>
                <CardDescription>تسجيلات المرضى خلال الـ 12 شهر الماضية</CardDescription>
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
                    <Bar dataKey="count" name="مرضى جدد" fill="#2563eb" radius={[4, 4, 0, 0]} />
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
                  <CardTitle className="text-base">توزيع حالات المرضى</CardTitle>
                  <CardDescription>تفصيل الحالات الحالية للمرضى</CardDescription>
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
                <CardTitle className="text-base">جدول حالات المرضى</CardTitle>
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
                  {(patientStatus ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>}
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
                <CardTitle className="text-base">الزيارات الشهرية</CardTitle>
                <CardDescription>حجم الزيارات خلال الـ 12 شهر الماضية</CardDescription>
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
                    <Line type="monotone" dataKey="count" name="زيارات" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="completed" name="مكتملة" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
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
                <CardTitle className="text-base">أكثر التشخيصات شيوعاً</CardTitle>
                <CardDescription>أبرز التشخيصات عبر جميع الزيارات</CardDescription>
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
                    <Bar dataKey="count" name="حالات" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {(topDiagnoses ?? []).map((d: any, i: number) => (
                    <div key={d.diagnosis} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm">{d.diagnosis}</span>
                      </div>
                      <Badge variant="secondary">{d.count} حالة</Badge>
                    </div>
                  ))}
                  {(topDiagnoses ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد تشخيصات مسجلة بعد</p>}
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
                <CardTitle className="text-base">إحصائيات الأطباء</CardTitle>
                <CardDescription>الزيارات والمرضى لكل طبيب</CardDescription>
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
                  <Bar dataKey="totalVisits" name="إجمالي الزيارات" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPatients" name="مرضى فريدون" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-2 font-medium text-muted-foreground">الطبيب</th><th className="text-right py-2 font-medium text-muted-foreground">الزيارات</th><th className="text-right py-2 font-medium text-muted-foreground">المرضى</th><th className="text-right py-2 font-medium text-muted-foreground">الوصفات</th></tr></thead>
                  <tbody>
                    {(doctorStats ?? []).map((d: any) => (
                      <tr key={d.doctorId} className="border-b border-border/50 last:border-0">
                        <td className="py-2">{d.doctorName}</td>
                        <td className="py-2 text-right">{d.totalVisits}</td>
                        <td className="py-2 text-right">{d.totalPatients}</td>
                        <td className="py-2 text-right">{d.totalPrescriptions ?? 0}</td>
                      </tr>
                    ))}
                    {(doctorStats ?? []).length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">لا توجد إحصائيات أطباء متاحة</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai" className="mt-4">
          <div className="space-y-4">
            {/* Intro Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">تقرير الذكاء الاصطناعي الطبي</CardTitle>
                    <CardDescription className="text-xs mt-0.5">مدعوم بالذكاء الاصطناعي — يحلل بيانات العيادة كاملة لتوليد رؤى طبية قابلة للتنفيذ</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "أنماط الأمراض", icon: <Stethoscope className="w-4 h-4 text-blue-500" />, desc: "أبرز التشخيصات والاتجاهات" },
                    { label: "تقييم المخاطر", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, desc: "تنبيهات المرضى الحرجين" },
                    { label: "رؤى تشغيلية", icon: <Activity className="w-4 h-4 text-green-500" />, desc: "عبء العمل والكفاءة" },
                    { label: "توصيات", icon: <CheckCircle2 className="w-4 h-4 text-purple-500" />, desc: "خطوات قابلة للتنفيذ" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2 p-3 rounded-lg bg-background border">
                      {item.icon}
                      <div>
                        <p className="text-xs font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => aiMutation.mutate()}
                    disabled={aiMutation.isPending}
                    className="gap-2"
                  >
                    {aiMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />جاري تحليل بيانات العيادة...</>
                    ) : aiReport ? (
                      <><RefreshCw className="w-4 h-4" />إعادة إنشاء التقرير</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />إنشاء تقرير ذكي</>
                    )}
                  </Button>
                  {aiReport && (
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: {new Date(aiReport.generatedAt).toLocaleString('ar-EG')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {aiMutation.isPending && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-semibold">جاري تحليل بيانات العيادة...</p>
                      <p className="text-sm text-muted-foreground mt-1">الذكاء الاصطناعي يراجع سجلات المرضى والتشخيصات وأنماط الزيارات والمؤشرات التشغيلية.</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Report Result */}
            {aiReport && !aiMutation.isPending && (
              <>
                {/* Data Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "إجمالي المرضى", value: aiReport.dataSnapshot.totalPatients },
                    { label: "إجمالي الزيارات", value: aiReport.dataSnapshot.totalVisits },
                    { label: "حرجون", value: aiReport.dataSnapshot.criticalCount, alert: aiReport.dataSnapshot.criticalCount > 0 },
                    { label: "متابعة", value: aiReport.dataSnapshot.followUpCount },
                    { label: "أكثر تشخيص", value: aiReport.dataSnapshot.topDiagnosis },
                    { label: "حالات التشخيص الأعلى", value: aiReport.dataSnapshot.topDiagnosisCount },
                  ].map((item) => (
                    <Card key={item.label} className={(item as any).alert ? "border-red-200 bg-red-50" : ""}>
                      <CardContent className="p-3 text-center">
                        <p className={`text-xl font-bold ${(item as any).alert ? "text-red-600" : "text-primary"}`}>{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Report Content */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        تقرير الذكاء الاصطناعي الطبي
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 h-8"
                        onClick={() => {
                          const blob = new Blob([aiReport.report], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `ai-clinic-report-${new Date().toISOString().split('T')[0]}.txt`; a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="w-3.5 h-3.5" /> تصدير
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Streamdown>{aiReport.report}</Streamdown>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Empty state */}
            {!aiReport && !aiMutation.isPending && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">No AI report generated yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Click "Generate AI Report" above to analyze your clinic data</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
