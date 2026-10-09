/** Confirmation messages shown as toasts after a redirect (?msg=<key>). */
export const FLASH = {
  task_created: 'تمت إضافة المهمة',
  task_saved: 'تم حفظ التعديلات',
  task_deleted: 'تم حذف المهمة',
  task_sent_review: 'تم إرسال المهمة للمراجعة — سيصل تنبيه للمتابعين',
  task_approved: 'تم اعتماد المهمة كمنجزة',
  task_copied: 'تم إنشاء نسخة من المهمة — عدّل العنوان والموعد ثم احفظ',
  company_created: 'تمت إضافة الشركة — يمكنك الآن رفع مرفقاتها',
  company_saved: 'تم حفظ بيانات الشركة',
  company_deleted: 'تم حذف الشركة',
  company_has_open_tasks: 'لا يمكن حذف الشركة لأن لديها مهام مفتوحة. أنجز المهام أو ألغها أولًا ثم احذف الشركة.',
  template_saved: 'تم حفظ القالب',
  template_deleted: 'تم حذف القالب',
  tasks_added: 'تمت إضافة المهام',
} as const

export type FlashKey = keyof typeof FLASH
