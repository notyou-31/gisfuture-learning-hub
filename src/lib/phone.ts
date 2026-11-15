/** Normalises an Indian mobile number to its 10 digits, or returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  let d = digits;
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return d;
}

/** Synthetic login identity for a phone number (never shown to users, never emailed). */
export function phoneToAuthEmail(phone: string): string {
  return `p${phone}@phone.gisfuture.app`;
}

export function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 2)}••••${phone.slice(6)}` : phone;
}
