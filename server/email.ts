import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "noreply@clinic-system.org";
const FROM_NAME = "نظام إدارة العيادة";

export async function sendActivationEmail({
  toEmail,
  toName,
  clinicName,
  activationLink,
}: {
  toEmail: string;
  toName?: string;
  clinicName: string;
  activationLink: string;
}) {
  const greeting = toName ? `مرحباً ${toName}،` : "مرحباً،";

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>دعوة تفعيل حساب العيادة</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db 0%,#1e40af 100%);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;margin-bottom:16px;">
                <span style="font-size:28px;">🏥</span>
              </div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">نظام إدارة العيادة</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">المنصة الطبية المتكاملة</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="color:#374151;font-size:16px;margin:0 0 8px;font-weight:600;">${greeting}</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">
                تمت دعوتك للانضمام إلى نظام إدارة عيادة <strong style="color:#1a56db;">${clinicName}</strong> على منصتنا الطبية المتكاملة.
              </p>

              <!-- Info Box -->
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 10px;">✨ ما الذي ستتمكن من فعله؟</p>
                <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0;padding-right:20px;">
                  <li>إدارة بيانات المرضى وملفاتهم الطبية</li>
                  <li>تسجيل الزيارات والوصفات الطبية</li>
                  <li>إدارة المواعيد والجدول اليومي</li>
                  <li>متابعة التقارير والإحصائيات</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${activationLink}" 
                   style="display:inline-block;background:linear-gradient(135deg,#1a56db,#1e40af);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(26,86,219,0.35);">
                  تفعيل الحساب الآن ←
                </a>
              </div>

              <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0 0 4px;">
                أو انسخ الرابط التالي وافتحه في متصفحك:
              </p>
              <p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:12px;color:#6b7280;word-break:break-all;text-align:left;direction:ltr;margin:0 0 24px;">
                ${activationLink}
              </p>

              <!-- Warning -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
                <p style="color:#92400e;font-size:13px;margin:0;">
                  ⚠️ هذا الرابط شخصي — لا تشاركه مع أحد. إذا لم تطلب هذه الدعوة، يمكنك تجاهل هذا الإيميل.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                تم إرسال هذا الإيميل من <strong>نظام إدارة العيادة</strong> — clinic-system.org
              </p>
              <p style="color:#d1d5db;font-size:11px;margin:6px 0 0;">
                © ${new Date().getFullYear()} جميع الحقوق محفوظة
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const result = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `دعوة تفعيل حساب عيادة ${clinicName} 🏥`,
    html,
  });

  return result;
}
