import { MessageCircle, Stethoscope, Clock, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

const WHATSAPP_NUMBER = "201500663131"; // 01500663131 with country code

function buildWhatsAppLink(email: string, name: string) {
  const message = encodeURIComponent(
    `مرحباً، أنا ${name} (${email})\nأريد طلب فترة تجريبية لنظام إدارة العيادة.`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}

export default function NotSubscribed() {
  const { user } = useAuth();

  const whatsappLink = buildWhatsAppLink(
    user?.email ?? "غير معروف",
    user?.name ?? "مستخدم جديد"
  );

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            مرحباً بك في نظام إدارة العيادة
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            حسابك غير مفعّل بعد. تواصل معنا للحصول على فترة تجريبية مجانية
            وابدأ في إدارة عيادتك بشكل احترافي.
          </p>
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              الإيميل المسجل:{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Clock, label: "48 ساعة تجريبية مجانية" },
            { icon: Shield, label: "بيانات آمنة ومحمية" },
            { icon: Zap, label: "إعداد سريع وسهل" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="bg-muted/40 rounded-xl p-3 flex flex-col items-center gap-2"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* WhatsApp Button */}
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="w-full gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-base font-semibold h-14 rounded-xl shadow-lg shadow-[#25D366]/30 transition-all active:scale-[0.97]"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل معنا على واتساب
          </Button>
        </a>

        <p className="text-xs text-muted-foreground">
          سيتم الرد عليك في أقرب وقت وإرسال رابط التفعيل على إيميلك
        </p>
      </div>
    </div>
  );
}
