import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteCompany, setCompanyArchived } from '@/app/actions/companies'
import { ConfirmButton } from '@/components/action-form'
import { AttachmentZone, type FileRow } from '@/components/attachment-zone'
import { CopyValue, TaxPasswordField } from '@/components/secret-field'
import { Tabs } from '@/components/tabs'
import { TaskList } from '@/components/task-list'
import { Alert, Card, PageHeader, btn } from '@/components/ui'
import { ATTACHMENT_KINDS, ATTACHMENT_LABEL } from '@/lib/attachments'
import { requireSession } from '@/lib/auth'
import { one, query } from '@/lib/db'
import { formatDateTime, todayIn } from '@/lib/dates'
import { TASK_SELECT } from '@/lib/queries'
import { blobEnabled, companyPrefix } from '@/lib/storage'
import type { Attachment, Company, Task } from '@/lib/types'

export const metadata = { title: 'الشركة' }

function InfoList({ items }: { items: [string, React.ReactNode, boolean?][] }) {
  return (
    <dl className="space-y-3 text-sm">
      {items.map(([label, value, ltr]) => (
        <div key={label}>
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className={ltr ? 'ltr text-right' : 'whitespace-pre-wrap'}>{value || <span className="text-slate-300">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ closed?: string; tab?: string }>
}) {
  const { org } = await requireSession()
  const { id } = await params
  const { closed, tab } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const company = await one<Company>('select * from companies where id = $1 and org_id = $2', [id, org.id])
  if (!company) notFound()

  const today = todayIn(org.timezone)
  const [tasks, attachments] = await Promise.all([
    query<Task>(`${TASK_SELECT} where t.company_id = $1 order by t.deadline`, [id]),
    query<Attachment>(
      `select a.id, a.kind, a.file_name, a.size_bytes, a.created_at, u.full_name as uploaded_by_name
         from company_attachments a left join users u on u.id = a.uploaded_by
        where a.company_id = $1 order by a.created_at desc`,
      [id],
    ),
  ])
  const open = tasks.filter((t) => ['not_started', 'in_progress', 'on_hold'].includes(t.status))
  const done = tasks.filter((t) => !open.includes(t))
  const overdue = open.filter((t) => t.deadline < today).length
  const hasTax = Boolean(company.tax_email || company.tax_username || company.tax_password_enc)

  const filesOf = (kind: string): FileRow[] =>
    attachments
      .filter((a) => a.kind === kind)
      .map((a) => ({
        id: a.id,
        file_name: a.file_name,
        size_bytes: a.size_bytes,
        uploaded: formatDateTime(a.created_at, org.timezone),
        by: a.uploaded_by_name,
      }))

  const generalTab = (
    <InfoList
      items={[
        ['النشاط', company.activity],
        ['الشخص المسؤول', company.contact_person],
        ['الهاتف', company.phone, true],
        ['البريد الإلكتروني', company.email, true],
        ['ملاحظات', company.notes],
      ]}
    />
  )

  const taxTab = hasTax ? (
    <div className="space-y-4">
      <InfoList
        items={[
          ['البريد الإلكتروني', company.tax_email && <CopyValue value={company.tax_email} />],
          ['اسم المستخدم', company.tax_username && <CopyValue value={company.tax_username} />],
          ['كلمة المرور', company.tax_password_enc && <TaxPasswordField companyId={company.id} />],
        ]}
      />
      <Link href={`/companies/${company.id}/edit?tab=tax`} className="inline-block text-sm text-brand-700 hover:underline">
        تعديل البيانات الضريبية
      </Link>
    </div>
  ) : (
    <div className="space-y-3 text-sm text-slate-500">
      <p>لم تُضف البيانات الضريبية لهذه الشركة بعد.</p>
      <Link href={`/companies/${company.id}/edit?tab=tax`} className={btn.secondary}>
        إضافة البيانات الضريبية
      </Link>
    </div>
  )

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/companies" className="text-brand-700 hover:underline">
          الشركات
        </Link>
      </div>
      <PageHeader
        title={company.name}
        subtitle={`${open.length} مفتوحة · ${overdue} متأخرة · ${done.filter((t) => t.status === 'done').length} منجزة`}
        actions={
          <>
            <Link href={`/tasks/new?company=${company.id}`} className={btn.primary}>
              + مهمة لهذه الشركة
            </Link>
            <Link href={`/companies/${company.id}/edit`} className={btn.secondary}>
              تعديل
            </Link>
          </>
        }
      />

      {company.archived_at && (
        <div className="mb-4">
          <Alert kind="info">هذه الشركة مؤرشفة ولا تظهر في القوائم.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">المهام المفتوحة ({open.length})</h2>
            <TaskList tasks={open} today={today} showCompany={false} empty="لا توجد مهام مفتوحة لهذه الشركة" />
          </Card>
          {done.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold">المنجزة والملغاة ({done.length})</h2>
                <Link href={closed ? `/companies/${id}` : `/companies/${id}?closed=1`} className="text-sm text-brand-700 hover:underline">
                  {closed ? 'إخفاء' : 'عرض'}
                </Link>
              </div>
              {closed && <TaskList tasks={[...done].reverse()} today={today} showCompany={false} />}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-4 font-semibold">المرفقات</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {ATTACHMENT_KINDS.map((kind) => (
                <div key={kind} className={kind === 'other' ? 'md:col-span-2' : ''}>
                  <AttachmentZone
                    companyId={company.id}
                    kind={kind}
                    label={ATTACHMENT_LABEL[kind]}
                    multiple={kind === 'other'}
                    files={filesOf(kind)}
                    blobMode={blobEnabled()}
                    prefix={companyPrefix(org.id, company.id)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <Tabs
              initial={tab}
              tabs={[
                { id: 'general', label: 'البيانات العامة', content: generalTab },
                { id: 'tax', label: 'البيانات الضريبية', content: taxTab },
              ]}
            />
          </Card>
          <Card className="space-y-2 p-5">
            <form action={setCompanyArchived.bind(null, company.id, !company.archived_at)}>
              <button className={`${btn.secondary} w-full`}>{company.archived_at ? 'إلغاء الأرشفة' : 'أرشفة الشركة'}</button>
            </form>
            <ConfirmButton
              action={deleteCompany.bind(null, company.id)}
              confirmText={`سيتم حذف الشركة "${company.name}" وجميع مهامها (${tasks.length}) ومرفقاتها (${attachments.length}) نهائيًا. هل أنت متأكد؟`}
              className={`${btn.danger} w-full`}
            >
              حذف الشركة
            </ConfirmButton>
          </Card>
        </div>
      </div>
    </>
  )
}
