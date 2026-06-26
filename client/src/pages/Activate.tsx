import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2, Stethoscope } from "lucide-react";

function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function Activate() {
  const token = getTokenFromUrl();
  const [, navigate] = useLocation();
  const [activated, setActivated] = useState(false);

  const { data: tenant, isLoading, error } = trpc.tenants.validateToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const activateMutation = trpc.tenants.activate.useMutation({
    onSuccess: () => setActivated(true),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">رابط غير صحيح</h1>
          <p className="text-muted-foreground text-sm">الرابط الذي استخدمته غير صحيح. تواصل مع مزود الخدمة.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">خطأ في الرابط</h1>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <p className="text-xs text-muted-foreground">تواصل مع مزود الخدمة للحصول على رابط جديد.</p>
        </div>
      </div>
    );
  }

  if (activated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">تم تفعيل الحساب!</h1>
            <p className="text-muted-foreground text-sm">
              مرحباً بك في نظام {tenant?.clinicName}. اشتراكك سارٍ حتى{" "}
              <span className="font-medium text-foreground">
                {tenant?.expiresAt ? new Date(tenant.expiresAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </span>
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate("/")}>
            الذهاب إلى لوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full space-y-6 shadow-lg">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تفعيل الحساب</h1>
          <p className="text-muted-foreground text-sm mt-1">نظام إدارة العيادة</p>
        </div>

        {/* Tenant Info */}
        {tenant && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">اسم العيادة</span>
              <span className="font-medium text-foreground">{tenant.clinicName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الإيميل</span>
              <span className="font-medium text-foreground">{tenant.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">نوع الاشتراك</span>
              <span className="font-medium text-foreground">{tenant.planLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">صالح حتى</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {tenant.expiresAt ? new Date(tenant.expiresAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            اضغط على الزر أدناه لتفعيل حسابك والبدء في استخدام النظام.
          </p>
          <Button
            className="w-full"
            size="lg"
            onClick={() => activateMutation.mutate({ token: token! })}
            disabled={activateMutation.isPending}
          >
            {activateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري التفعيل...</>
            ) : (
              <><CheckCircle className="w-4 h-4 ml-2" /> تفعيل الحساب الآن</>
            )}
          </Button>
          {activateMutation.error && (
            <p className="text-sm text-destructive text-center">{activateMutation.error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
