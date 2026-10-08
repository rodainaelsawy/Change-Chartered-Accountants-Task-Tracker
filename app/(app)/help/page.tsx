import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { SHORTCUTS } from '@/lib/shortcuts'
import { kbd } from '@/components/side-tips'
import { Card, PageHeader } from '@/components/ui'
import { requireSession } from '@/lib/auth'

export const metadata = { title: 'المساعدة' }

/** Help & documentation (Nielsen H10): short guide, shortcuts and FAQ. */
const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: 'start',
    title: 'البدء السريع',
    body: (
      <ol className="list-decimal space-y-1 ps-5">
        <li>
          أضف الشركات من <Link href="/companies/new">الشركات ← شركة جديدة</Link> أو استوردها من Excel.
        </li>
        <li>
          أضف المهام لكل شركة مع موعد التسليم والمسؤولين من <Link href="/tasks/new">مهمة جديدة</Link>.
        </li>
        <li>تابع لوحة المتابعة يوميًا: الأحمر = متأخرة، البرتقالي = موعدها خلال يومين، الأخضر = منجزة.</li>
        <li>عند الانتهاء اضغط الدائرة ✓ بجوار المهمة. يمكنك التراجع فورًا من الرسالة التي تظهر أسفل الشاشة.</li>
      </ol>
    ),
  },
  {
    id: 'tasks',
    title: 'المهام',
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>لكل مهمة شركة واحدة، وموعد تسليم، ومسؤول واحد أو أكثر (إلزامي).</li>
        <li>
          <b>الخطوات:</b> قسّم المهمة إلى خطوات وأنجزها واحدة تلو الأخرى؛ يظهر التقدم (مثل 2/4) في القوائم.
        </li>
        <li>
          <b>صفحة المهمة:</b> اضغط على أي مهمة لفتحها وتعديل بياناتها مباشرة («حفظ التعديلات» و«إلغاء» أعلى الصفحة)، وفيها أيضًا التعليقات والسجل؛ السجل يحفظ تلقائيًا كل تغيير ومن قام به.
        </li>
        <li>
          <b>المهام المتكررة:</b> اختر «شهريًا» مثلًا عند الإنشاء؛ تُنشأ المرة التالية تلقائيًا عند إنجاز الحالية أو حلول
          موعدها. يمكن إيقاف التكرار من صفحة المهمة.
        </li>
        <li>
          <b>إضافة عدة مهام / القوالب:</b> لإضافة مجموعة مهام لشركة أو لعدة شركات دفعة واحدة. انظر{' '}
          <Link href="/templates">القوالب</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: 'reminders',
    title: 'التذكيرات والتنبيهات',
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>يصل للمسؤولين تنبيه قبل الموعد بيومين (قابل للتغيير لكل مهمة)، ويوم الموعد، ثم يوميًا إذا تأخرت المهمة.</li>
        <li>التنبيهات تظهر في الجرس أعلى الصفحة، وفي رسالة بريد يومية (بعد تفعيل البريد في النظام).</li>
        <li>عند إسناد مهمة إليك يصلك تنبيه «أُسندت إليك مهمة».</li>
      </ul>
    ),
  },
  {
    id: 'companies',
    title: 'الشركات والمرفقات',
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>الحقول الإلزامية: اسم الشركة، الشخص المسؤول، والهاتف أو البريد الإلكتروني.</li>
        <li>
          <b>البيانات الضريبية:</b> في تبويب «البيانات الضريبية» بصفحة الشركة. كلمة المرور مشفّرة وتظهر فقط عند الضغط على «إظهار».
        </li>
        <li>
          <b>المرفقات:</b> ملفات PDF فقط بحد أقصى 10 ميجابايت. السجل التجاري والبطاقة الضريبية ملف واحد لكل منهما (الرفع الجديد يستبدل
          القديم)، و«مرفقات أخرى» لعدد غير محدود.
        </li>
        <li>الأرشفة تخفي الشركة من القوائم دون حذف بياناتها، ويمكن إلغاؤها في أي وقت.</li>
      </ul>
    ),
  },
  {
    id: 'reports',
    title: 'التقويم والتقارير',
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>
          <Link href="/calendar">التقويم</Link> يعرض المهام حسب موعد التسليم شهرًا بشهر.
        </li>
        <li>
          <Link href="/reports">التقارير</Link> تعرض لكل شركة: المنجز في الموعد وبعده، والمتأخر، ونسبة الالتزام، مع تصدير Excel
          أو طباعة/حفظ PDF.
        </li>
        <li>يمكن أيضًا تصدير قائمة المهام بعد الفلترة إلى Excel من صفحة المهام.</li>
        <li>الفلاتر التي تختارها (المهام، الشركات، التقويم، التقارير، لوحة المتابعة) تبقى مطبَّقة عند الخروج والعودة للصفحة. في المهام اضغط «مسح الفلاتر» للعودة للوضع الافتراضي.</li>
      </ul>
    ),
  },
]

const FAQ: [string, React.ReactNode][] = [
  ['حددت مهمة كمنجزة بالخطأ، ماذا أفعل؟', 'اضغط «تراجع» في الرسالة أسفل الشاشة فورًا، أو اضغط الدائرة مرة أخرى، أو افتح المهمة وغيّر «الحالة» ثم «حفظ التعديلات».'],
  ['لماذا لا تصلني تذكيرات مهمة معيّنة؟', 'التذكيرات تصل للمسؤولين عن المهمة فقط. افتح المهمة وتأكد من اختيارك ضمن المسؤولين.'],
  ['حذفت شركة، هل يمكن استرجاعها؟', 'لا، الحذف نهائي ويشمل مهامها ومرفقاتها، لذلك يُطلب التأكيد. إذا أردت إخفاءها فقط استخدم «أرشفة الشركة».'],
  ['نسيت كلمة المرور', <>من صفحة الدخول اضغط «نسيت كلمة المرور؟»، أو اطلب من مدير النظام إرسال رابط جديد من الإعدادات.</>],
  ['كيف أضيف زميلًا للفريق؟', 'المدير فقط: الإعدادات والفريق ← إضافة عضو للفريق، ثم أرسل له رابط الدعوة.'],
]

export default async function HelpPage() {
  await requireSession()
  return (
    <>
      <BackButton />
      <PageHeader title="المساعدة ودليل الاستخدام" subtitle="إجابات سريعة لأكثر الأسئلة شيوعًا" />
      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="h-fit p-4 xl:sticky xl:top-24">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">المحتويات</h2>
          <ul className="space-y-1 text-sm">
            {[...SECTIONS, { id: 'shortcuts', title: 'اختصارات لوحة المفاتيح' }, { id: 'faq', title: 'أسئلة شائعة' }].map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-brand-700 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4 xl:col-span-3 [&_a]:text-brand-700 [&_a:hover]:underline">
          {SECTIONS.map((s) => (
            <Card key={s.id} id={s.id} className="scroll-mt-24 p-5 leading-7 text-slate-700">
              <h2 className="mb-2 text-lg font-semibold text-slate-900">{s.title}</h2>
              {s.body}
            </Card>
          ))}
          <Card id="shortcuts" className="scroll-mt-24 p-5">
            <h2 className="mb-3 text-lg font-semibold">اختصارات لوحة المفاتيح</h2>
            <p className="mb-3 text-sm text-slate-500">تعمل من أي صفحة طالما أنك لا تكتب داخل حقل.</p>
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <dt>{kbd(s.keys)}</dt>
                  <dd className="text-slate-700">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card id="faq" className="scroll-mt-24 p-5">
            <h2 className="mb-3 text-lg font-semibold">أسئلة شائعة</h2>
            <div className="divide-y divide-slate-100">
              {FAQ.map(([q, a]) => (
                <details key={q} className="py-3">
                  <summary className="cursor-pointer font-medium text-slate-800">{q}</summary>
                  <p className="mt-2 text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
