/**
 * دوال التنسيق الخاصة بالسوق الجزائري
 */

/**
 * تنسيق المبالغ بالدينار الجزائري
 * أمثلة:
 * formatDZD(500) -> "500 دج"
 * formatDZD(1500) -> "1,500 دج"
 */
export function formatDZD(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 دج';
  }
  const rounded = Math.round(amount);
  const formattedNumber = new Intl.NumberFormat('fr-DZ').format(rounded);
  return `${formattedNumber} دج`;
}

/**
 * التحقق من صحة رقم الهاتف الجزائري
 * 05 / 06 / 07 متبوعة بـ 8 أرقام
 */
export function isValidAlgerianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  const mobileRegex = /^(?:(?:\+|00)213|0)[567]\d{8}$/;
  const landlineRegex = /^(?:(?:\+|00)213|0)[234]\d{7,8}$/;
  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned);
}

/**
 * تنسيق عرض رقم الهاتف الجزائري بمجموعات سهلة القراءة (مثال: 0550 12 34 56)
 */
export function formatAlgerianPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  return phone;
}

/**
 * تنسيق التواريخ بتوقيت الجزائر الرسمي (Africa/Algiers)
 */
export function formatAlgerianDateTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('ar-DZ', {
      timeZone: 'Africa/Algiers',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
