import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Activity, TrendingUp, Clock, AlertCircle, ChevronRight, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/types";
import { useT } from "@/contexts/SettingsContext";

function StatCard({ title, value, icon: Icon, color, subtitle }: {
  title: string; value: number | string; icon: any; color: string; subtitle?: string;
}) {
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useT();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const chartData = (() => {
    if (!stats) return [];
    const months: Record<string, { month: string; patients: number; visits: number }> = {};
    stats.monthlyPatients.forEach((m) => {
      months[m.month] = { month: m.month, patients: m.count, visits: 0 };
    });
    stats.monthlyVisits.forEach((m) => {
      if (months[m.month]) months[m.month].visits = m.count;
      else months[m.month] = { month: m.month, patients: 0, visits: m.count };
    });
    return Object.values(months).map((m) => ({
      ...m,
      month: format(new Date(m.month + "-01"), "MMM yy"),
    })).slice(-6);
  })();

  const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
    patient_created: { ar: "تم إضافة مريض", en: "Patient added" },
    patient_updated: { ar: "تم تحديث بيانات مريض", en: "Patient updated" },
    patient_deleted: { ar: "تم أرشفة مريض", en: "Patient archived" },
    patient_restored: { ar: "تم استعادة مريض", en: "Patient restored" },
    visit_created: { ar: "تم إضافة زيارة", en: "Visit added" },
    visit_updated: { ar: "تم تحديث زيارة", en: "Visit updated" },
    prescription_created: { ar: "تم إنشاء وصفة طبية", en: "Prescription created" },
    file_uploaded: { ar: "تم رفع ملف", en: "File uploaded" },
    appointment_created: { ar: "تم جدولة موعد", en: "Appointment scheduled" },
    appointment_updated: { ar: "تم تحديث موعد", en: "Appointment updated" },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard", "title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("dashboard", "welcome")}، {user?.name ?? t("visits", "doctor")} · {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={t("dashboard", "totalPatients")} value={stats?.patientCount ?? 0} icon={Users} color="bg-blue-50 text-blue-600" />
          <StatCard title={t("dashboard", "todayAppointments")} value={stats?.todayAppts ?? 0} icon={Calendar} color="bg-green-50 text-green-600" />
          <StatCard title={t("dashboard", "followUpReminders")} value={stats?.followUps?.length ?? 0} icon={AlertCircle} color="bg-amber-50 text-amber-600" />
          <StatCard title={t("dashboard", "recentVisits")} value={stats?.recentVisits?.length ?? 0} icon={Stethoscope} color="bg-purple-50 text-purple-600" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient & Visit Growth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> {t("dashboard", "monthlyStats")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="patients" stroke="#3B82F6" strokeWidth={2} fill="url(#colorPatients)" name={t("dashboard", "newPatientsMonth")} />
                  <Area type="monotone" dataKey="visits" stroke="#10B981" strokeWidth={2} fill="url(#colorVisits)" name={t("dashboard", "visitsMonth")} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Reminders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> {t("dashboard", "followUpReminders")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)
            ) : stats?.followUps?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
لا توجد متابعات قادمة
              </div>
            ) : (
              stats?.followUps?.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">مريض #{v.patientId}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.followUpDate ? formatDistanceToNow(new Date(v.followUpDate), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> {t("dashboard", "recentPatients")}
            </CardTitle>
            <Link href="/patients">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                {t("dashboard", "viewAll")} <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 mb-2" />)
            ) : stats?.recentPatients?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا يوجد مرضى بعد
              </div>
            ) : (
              <div className="space-y-1">
                {stats?.recentPatients?.map((p) => (
                  <Link key={p.id} href={`/patients/${p.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">{p.fullName.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.fullName}</p>
                          <p className="text-xs text-muted-foreground">{p.patientId} · {p.phone}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${STATUS_CLASSES[p.status as keyof typeof STATUS_CLASSES] ?? ""}`}>
                        {STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> {t("dashboard", "latestActivity")}
            </CardTitle>
            <Link href="/activity">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                {t("dashboard", "viewAll")} <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 mb-2" />)
            ) : stats?.activities?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا يوجد نشاط بعد
              </div>
            ) : (
              <div className="space-y-1">
                {stats?.activities?.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{(ACTION_LABELS[a.action] as any)?.[t("common", "lang")] ?? ACTION_LABELS[a.action]?.ar ?? a.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
