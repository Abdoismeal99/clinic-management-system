import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Loader2, Stethoscope } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function Activate() {
  const token = getTokenFromUrl();
  const [, navigate] = useLocation();
  const [activated, setActivated] = useState(false);
  const [activatedClinicName, setActivatedClinicName] = useState<string>("");
  const [activatedExpiresAt, setActivatedExpiresAt] = useState<Date | null>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuth();
  const utils = trpc.useUtils();

  const { data: tenant, isLoading, error } = trpc.tenants.validateToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  // For already-logged-in users: link them to the tenant directly
  const linkCurrentUserMutation = trpc.tenants.linkCurrentUser.useMutation({
    onSuccess: async (data) => {
      setActivatedClinicName(data.clinicName);
      setActivatedExpiresAt(data.expiresAt ?? null);
      setActivated(true);
      // Refresh auth state so the user's tenantId is updated in the session
      await utils.auth.me.invalidate();
      await refresh();
    },
  });

  // If user is NOT authenticated, redirect to Google login with the activation URL as state
  // so after login, the OAuth callback will auto-link them to the tenant
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
    }
  }, [isAuthenticated, authLoading, token]);

  // If user is already authenticated, call linkCurrentUser to link them to the tenant
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      tenant &&
      !activated &&
      !linkCurrentUserMutation.isPending &&
      !linkCurrentUserMutation.isSuccess &&
      !linkCurrentUserMutation.isError
    ) {
      linkCurrentUserMutation.mutate({ token: token! });
    }
  }, [tenant, isAuthenticated, authLoading, activated]);

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

  // Loading state while checking auth or token
  if (authLoading || isLoading || (!isAuthenticated && token)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري التحقق...</p>
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
              مرحباً بك في نظام {activatedClinicName || tenant?.clinicName}. اشتراكك سارٍ حتى{" "}
              <span className="font-medium text-foreground">
                {activatedExpiresAt
                  ? new Date(activatedExpiresAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
                  : tenant?.expiresAt
                  ? new Date(tenant.expiresAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
                  : "—"}
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

  // Activating in progress
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full space-y-6 shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تفعيل الحساب</h1>
          <p className="text-muted-foreground text-sm mt-1">نظام إدارة العيادة</p>
        </div>

        {tenant && (
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">اسم العيادة</span>
              <span className="font-medium text-foreground">{tenant.clinicName}</span>
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

        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جاري تفعيل حسابك تلقائياً...</p>
          {linkCurrentUserMutation.error && (
            <p className="text-sm text-destructive mt-2">{linkCurrentUserMutation.error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
