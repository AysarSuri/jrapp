const c1 = "currentColor";
const c2 = "#3b82f6";

type P = { className?: string };

export function IconDashboard({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="4" width="18" height="18" rx="3" fill={c2} />
      <rect x="26" y="4" width="18" height="10" rx="3" fill={c1} />
      <rect x="26" y="18" width="18" height="4" rx="2" fill={c2} opacity="0.5" />
      <rect x="4" y="26" width="18" height="4" rx="2" fill={c2} opacity="0.5" />
      <rect x="4" y="34" width="18" height="10" rx="3" fill={c1} />
      <rect x="26" y="26" width="18" height="18" rx="3" fill={c2} />
    </svg>
  );
}

export function IconSales({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="2" y="28" width="30" height="16" rx="3" fill={c1} />
      <rect x="8" y="32" width="6" height="8" rx="1" fill={c2} />
      <rect x="16" y="30" width="6" height="10" rx="1" fill={c2} opacity="0.7" />
      <circle cx="8" cy="44" r="3" fill={c2} />
      <circle cx="28" cy="44" r="3" fill={c2} />
      <rect x="28" y="30" width="4" height="8" rx="1" fill={c1} />
      <circle cx="38" cy="12" r="9" fill={c2} />
      <text x="38" y="16" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">$</text>
      <circle cx="38" cy="28" r="7" fill={c1} opacity="0.8" />
      <text x="38" y="31.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconSupplier({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="14" cy="30" r="4" fill={c2} />
      <circle cx="36" cy="30" r="4" fill={c2} />
      <path d="M5 14h18v16H5z" fill={c1} />
      <path d="M23 18h10l6 8v4H23z" fill={c2} />
      <rect x="25" y="20" width="7" height="5" rx="1" fill="white" opacity="0.4" />
      <circle cx="38" cy="8" r="7" fill={c2} opacity="0.9" />
      <text x="38" y="12" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconAgent({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="10" cy="36" r="3.5" fill={c2} />
      <circle cx="30" cy="36" r="3.5" fill={c2} />
      <path d="M3 16h20v18H3z" fill={c1} />
      <path d="M23 20h9l5 7v7H23z" fill={c2} />
      <rect x="25" y="22" width="6" height="4" rx="1" fill="white" opacity="0.4" />
      <circle cx="38" cy="8" r="8" fill={c2} />
      <circle cx="38" cy="6" r="2" fill="white" />
      <path d="M35 10a3 3 0 016 0" fill="white" opacity="0.8" />
      <path d="M38 14v4M36 18h4" stroke={c1} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMaterial({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="18" width="20" height="16" rx="2" fill={c1} />
      <path d="M4 20l10-4 10 4" fill={c2} opacity="0.5" />
      <rect x="8" y="24" width="4" height="6" rx="1" fill={c2} />
      <rect x="22" y="8" width="20" height="16" rx="2" fill={c2} />
      <path d="M22 10l10-4 10 4" fill={c1} opacity="0.5" />
      <rect x="26" y="14" width="4" height="6" rx="1" fill="white" opacity="0.5" />
      <rect x="14" y="34" width="22" height="12" rx="2" fill={c1} opacity="0.7" />
      <circle cx="25" cy="40" r="2" fill={c2} />
    </svg>
  );
}

export function IconBank({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L4 16h40z" fill={c2} />
      <rect x="4" y="16" width="40" height="4" rx="1" fill={c1} />
      <rect x="8" y="20" width="5" height="16" rx="1" fill={c1} />
      <rect x="17" y="20" width="5" height="16" rx="1" fill={c2} />
      <rect x="26" y="20" width="5" height="16" rx="1" fill={c1} />
      <rect x="35" y="20" width="5" height="16" rx="1" fill={c2} />
      <rect x="4" y="36" width="40" height="5" rx="1" fill={c1} />
      <rect x="6" y="41" width="36" height="3" rx="1" fill={c2} opacity="0.6" />
    </svg>
  );
}

export function IconClearance({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="12" width="24" height="24" rx="3" fill={c1} />
      <path d="M8 15a3 3 0 013-3h18a3 3 0 013 3v3H8z" fill={c2} />
      <polyline points="15,26 20,31 30,21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="38" cy="12" r="8" fill={c2} />
      <text x="38" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconOffice({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="12" width="22" height="30" rx="2" fill={c1} />
      <rect x="8" y="16" width="6" height="5" rx="1" fill={c2} opacity="0.5" />
      <rect x="16" y="16" width="6" height="5" rx="1" fill={c2} opacity="0.5" />
      <rect x="8" y="24" width="6" height="5" rx="1" fill={c2} opacity="0.5" />
      <rect x="16" y="24" width="6" height="5" rx="1" fill={c2} opacity="0.5" />
      <rect x="12" y="34" width="6" height="8" rx="1" fill={c2} />
      <path d="M26 22h14a2 2 0 012 2v18H26z" fill={c2} />
      <rect x="30" y="26" width="4" height="4" rx="1" fill="white" opacity="0.4" />
      <rect x="30" y="33" width="4" height="4" rx="1" fill="white" opacity="0.4" />
      <path d="M22 18h8l2 4H26z" fill={c2} opacity="0.6" />
    </svg>
  );
}

export function IconExpense({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="14" width="32" height="22" rx="4" fill={c1} />
      <rect x="4" y="14" width="32" height="8" rx="4" fill={c2} />
      <rect x="26" y="26" width="10" height="6" rx="2" fill={c2} />
      <circle cx="31" cy="29" r="2" fill="white" opacity="0.5" />
      <path d="M36 18h6v8h-6z" fill={c2} opacity="0.7" />
    </svg>
  );
}

export function IconExternalDebt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M18 36c-6 0-12-3-12-10s8-14 18-14 18 7 18 14-6 10-12 10" fill="none" stroke={c1} strokeWidth="3" />
      <circle cx="24" cy="22" r="10" fill={c2} />
      <text x="24" y="27" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">$</text>
      <path d="M14 34l-4 8M34 34l4 8" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 38l-2 6M28 38l2 6" stroke={c2} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconOwner({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 38c0-6 4-10 10-10h4c6 0 10 4 10 10" fill={c1} />
      <circle cx="22" cy="16" r="9" fill={c2} />
      <circle cx="22" cy="14" r="4" fill="white" opacity="0.5" />
      <circle cx="38" cy="14" r="8" fill={c1} opacity="0.85" />
      <text x="38" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">$</text>
      <path d="M32 36h10M37 31v10" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconWarehouse({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 20L24 8l20 12v2H4z" fill={c2} />
      <rect x="6" y="22" width="36" height="20" rx="1" fill={c1} />
      <rect x="12" y="26" width="10" height="12" rx="1" fill={c2} opacity="0.5" />
      <rect x="26" y="26" width="10" height="12" rx="1" fill={c2} opacity="0.5" />
      <rect x="18" y="28" width="2" height="4" rx="0.5" fill="white" opacity="0.6" />
      <rect x="32" y="28" width="2" height="4" rx="0.5" fill="white" opacity="0.6" />
    </svg>
  );
}

export function IconDamage({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="14" width="26" height="24" rx="3" fill={c1} />
      <path d="M6 17a3 3 0 013-3h20a3 3 0 013 3v3H6z" fill={c2} opacity="0.6" />
      <rect x="14" y="26" width="4" height="8" rx="1" fill={c2} />
      <circle cx="38" cy="14" r="9" fill="#ef4444" />
      <text x="38" y="18.5" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">!</text>
    </svg>
  );
}

export function IconBarcode({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="8" width="28" height="22" rx="2" fill={c1} />
      <rect x="8" y="12" width="2" height="14" fill="white" opacity="0.8" />
      <rect x="12" y="12" width="3" height="14" fill={c2} />
      <rect x="17" y="12" width="1.5" height="14" fill="white" opacity="0.8" />
      <rect x="20" y="12" width="3" height="14" fill={c2} />
      <rect x="25" y="12" width="2" height="14" fill="white" opacity="0.8" />
      <rect x="29" y="12" width="1" height="14" fill={c2} />
      <path d="M34 26l8 10v4h-6l-6-10z" fill={c2} />
      <circle cx="40" cy="38" r="4" fill={c1} />
      <line x1="38" y1="36" x2="42" y2="40" stroke={c2} strokeWidth="1.5" />
    </svg>
  );
}

export function IconCurrencyExchange({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="2" y="10" width="20" height="14" rx="3" fill={c2} />
      <text x="12" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">USD</text>
      <rect x="26" y="24" width="20" height="14" rx="3" fill={c1} />
      <text x="36" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">IQD</text>
      <path d="M24 14l4-4M28 14h-4v-4" stroke={c1} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 34l-4 4M20 34h4v4" stroke={c2} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 14c4 0 6 4 6 10" stroke={c1} strokeWidth="1.5" fill="none" />
      <path d="M26 34c-4 0-6-4-6-10" stroke={c2} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconSettings({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="20" cy="24" r="8" fill={c2} />
      <circle cx="20" cy="24" r="4" fill="white" opacity="0.4" />
      <path d="M20 12v-4M20 40v-4M32 24h4M4 24h4M28.5 15.5l2.8-2.8M8.7 35.3l2.8-2.8M28.5 32.5l2.8 2.8M8.7 12.7l2.8 2.8" stroke={c1} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="36" cy="36" r="7" fill={c1} />
      <circle cx="36" cy="36" r="3.5" fill={c2} opacity="0.6" />
      <path d="M36 28v-1M36 45v-1M44 36h1M27 36h1M41.5 30.5l.7-.7M29.8 42.2l.7-.7M41.5 41.5l.7.7M29.8 29.8l.7.7" stroke={c1} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconUserManagement({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="18" cy="14" r="7" fill={c2} />
      <path d="M6 40c0-8 5-14 12-14s12 6 12 14" fill={c1} />
      <circle cx="34" cy="16" r="5" fill={c1} opacity="0.7" />
      <path d="M28 40c0-5 3-10 6-10s6 5 6 10" fill={c2} opacity="0.5" />
      <circle cx="42" cy="10" r="6" fill="#ef4444" opacity="0.85" />
      <text x="42" y="14" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">!</text>
    </svg>
  );
}

export function IconCompany({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="8" width="20" height="34" rx="2" fill={c1} />
      <rect x="12" y="12" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="19" y="12" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="12" y="19" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="19" y="19" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="12" y="26" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="19" y="26" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="15" y="34" width="6" height="8" rx="1" fill={c2} />
      <rect x="28" y="20" width="14" height="22" rx="2" fill={c2} />
      <rect x="31" y="24" width="4" height="3" rx="0.5" fill="white" opacity="0.4" />
      <rect x="31" y="30" width="4" height="3" rx="0.5" fill="white" opacity="0.4" />
      <rect x="33" y="36" width="4" height="6" rx="0.5" fill="white" opacity="0.5" />
    </svg>
  );
}

export function IconAccounts({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="10" width="40" height="28" rx="4" fill={c1} />
      <rect x="4" y="10" width="40" height="10" rx="4" fill={c2} />
      <rect x="8" y="28" width="12" height="6" rx="2" fill={c2} opacity="0.6" />
      <circle cx="35" cy="31" r="4" fill={c2} />
      <circle cx="31" cy="31" r="4" fill={c1} opacity="0.7" />
    </svg>
  );
}

export function IconAddress({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4C16 4 10 10 10 18c0 12 14 26 14 26s14-14 14-26c0-8-6-14-14-14z" fill={c2} />
      <circle cx="24" cy="18" r="6" fill="white" opacity="0.5" />
      <circle cx="24" cy="18" r="3" fill={c1} />
    </svg>
  );
}

export function IconDollar({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 42c-3 0-14-2-14-10 0-4 2-7 6-7h16c4 0 6 3 6 7 0 8-11 10-14 10z" fill={c1} />
      <circle cx="24" cy="20" r="14" fill={c2} />
      <text x="24" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconDinar({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="2" y="14" width="30" height="14" rx="3" fill={c2} transform="rotate(-8 17 21)" />
      <rect x="6" y="18" width="30" height="14" rx="3" fill={c1} transform="rotate(-2 21 25)" />
      <rect x="10" y="22" width="30" height="14" rx="3" fill={c2} opacity="0.9" />
      <text x="25" y="33" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconReceiptUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="26" height="36" rx="3" fill={c1} />
      <rect x="10" y="12" width="18" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="18" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="24" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="30" width="10" height="2" rx="1" fill={c2} opacity="0.4" />
      <circle cx="38" cy="16" r="9" fill={c2} />
      <text x="38" y="20.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconReceiptIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="26" height="36" rx="3" fill={c1} />
      <rect x="10" y="12" width="18" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="18" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="24" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="30" width="10" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="30" y="8" width="16" height="12" rx="3" fill={c2} />
      <text x="38" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconInvoiceUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="4" width="28" height="36" rx="3" fill={c1} />
      <path d="M4 7a3 3 0 013-3h22a3 3 0 013 3v5H4z" fill={c2} />
      <rect x="8" y="14" width="20" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="20" width="16" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="26" width="18" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="32" width="12" height="2" rx="1" fill={c2} opacity="0.3" />
      <circle cx="38" cy="34" r="10" fill={c2} />
      <text x="38" y="39" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconInvoiceIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="4" width="28" height="36" rx="3" fill={c1} />
      <path d="M4 7a3 3 0 013-3h22a3 3 0 013 3v5H4z" fill={c2} />
      <rect x="8" y="14" width="20" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="20" width="16" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="26" width="18" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="8" y="32" width="12" height="2" rx="1" fill={c2} opacity="0.3" />
      <rect x="30" y="28" width="16" height="12" rx="3" fill={c2} />
      <text x="38" y="37" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconReturnUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 24c0-10 7-16 16-16s16 6 16 16" stroke={c1} strokeWidth="3" fill="none" />
      <path d="M12 24l-6-6M12 24l-6 6" stroke={c1} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 24c0 10-7 16-16 16s-16-6-16-16" stroke={c2} strokeWidth="3" fill="none" />
      <circle cx="34" cy="14" r="8" fill={c2} />
      <text x="34" y="18.5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconReturnIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 24c0-10 7-16 16-16s16 6 16 16" stroke={c1} strokeWidth="3" fill="none" />
      <path d="M12 24l-6-6M12 24l-6 6" stroke={c1} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 24c0 10-7 16-16 16s-16-6-16-16" stroke={c2} strokeWidth="3" fill="none" />
      <rect x="28" y="6" width="16" height="12" rx="3" fill={c2} />
      <text x="36" y="15" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconCustomers({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="18" cy="14" r="7" fill={c2} />
      <path d="M6 38c0-7 5-12 12-12s12 5 12 12" fill={c1} />
      <circle cx="34" cy="16" r="5" fill={c1} opacity="0.7" />
      <path d="M28 38c0-5 3-9 6-9s6 4 6 9" fill={c2} opacity="0.5" />
    </svg>
  );
}

export function IconStatementUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="4" width="24" height="32" rx="3" fill={c1} />
      <rect x="10" y="10" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="16" width="12" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="22" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="28" width="10" height="2" rx="1" fill={c2} opacity="0.4" />
      <circle cx="36" cy="32" r="10" fill={c2} />
      <text x="36" y="37" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconStatementIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="4" width="24" height="32" rx="3" fill={c1} />
      <rect x="10" y="10" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="16" width="12" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="22" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="10" y="28" width="10" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="28" y="28" width="18" height="12" rx="3" fill={c2} />
      <text x="37" y="37" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconPaymentUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 20h22v18H8z" rx="2" fill={c1} />
      <path d="M8 20l11 8 11-8" fill={c2} opacity="0.6" />
      <circle cx="38" cy="14" r="9" fill={c2} />
      <text x="38" y="18.5" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">$</text>
      <path d="M28 38l6-4M28 38l6 4" stroke={c2} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPaymentIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M8 20h22v18H8z" rx="2" fill={c1} />
      <path d="M8 20l11 8 11-8" fill={c2} opacity="0.6" />
      <rect x="30" y="8" width="16" height="12" rx="3" fill={c2} />
      <text x="38" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IQD</text>
      <path d="M28 38l6-4M28 38l6 4" stroke={c2} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPosUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="10" y="4" width="22" height="34" rx="3" fill={c1} />
      <rect x="14" y="8" width="14" height="10" rx="2" fill={c2} opacity="0.5" />
      <rect x="14" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="20" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="26" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="14" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="20" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="26" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="14" y="34" width="16" height="3" rx="1" fill={c2} />
      <circle cx="40" cy="10" r="7" fill={c2} />
      <text x="40" y="14" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconPosIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="10" y="4" width="22" height="34" rx="3" fill={c1} />
      <rect x="14" y="8" width="14" height="10" rx="2" fill={c2} opacity="0.5" />
      <rect x="14" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="20" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="26" y="22" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="14" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="20" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="26" y="28" width="4" height="3" rx="1" fill={c2} opacity="0.4" />
      <rect x="14" y="34" width="16" height="3" rx="1" fill={c2} />
      <rect x="34" y="4" width="14" height="10" rx="3" fill={c2} />
      <text x="41" y="12" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconSupplierList({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="10" cy="30" r="4" fill={c2} />
      <circle cx="32" cy="30" r="4" fill={c2} />
      <path d="M4 14h18v16H4z" fill={c1} />
      <path d="M22 18h9l5 7v5H22z" fill={c2} />
      <rect x="24" y="20" width="6" height="4" rx="1" fill="white" opacity="0.4" />
    </svg>
  );
}

export function IconPurchaseUsd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 8h6l6 22H38" stroke={c1} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="38" r="3" fill={c2} />
      <circle cx="34" cy="38" r="3" fill={c2} />
      <path d="M14 14h26l-3 14H17z" fill={c1} />
      <circle cx="40" cy="10" r="7" fill={c2} />
      <text x="40" y="14" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconPurchaseIqd({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M6 8h6l6 22H38" stroke={c1} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="38" r="3" fill={c2} />
      <circle cx="34" cy="38" r="3" fill={c2} />
      <path d="M14 14h26l-3 14H17z" fill={c1} />
      <rect x="32" y="4" width="14" height="10" rx="3" fill={c2} />
      <text x="39" y="12" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">IQD</text>
    </svg>
  );
}

export function IconSupplierPayment({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="14" width="28" height="20" rx="3" fill={c1} />
      <rect x="4" y="14" width="28" height="7" rx="3" fill={c2} />
      <rect x="8" y="26" width="10" height="4" rx="1" fill={c2} opacity="0.4" />
      <circle cx="38" cy="14" r="8" fill={c2} />
      <text x="38" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">$</text>
      <path d="M34 32l4 6 4-6" stroke={c2} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSupplierAdjust({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="10" width="26" height="28" rx="3" fill={c1} />
      <rect x="8" y="16" width="18" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="8" y="22" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="8" y="28" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <path d="M36 16v16M30 24h12" stroke={c2} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSupplierDebt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="8" width="24" height="32" rx="3" fill={c1} />
      <rect x="8" y="14" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="8" y="20" width="12" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="8" y="26" width="14" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="8" y="32" width="10" height="2" rx="1" fill={c2} opacity="0.4" />
      <circle cx="36" cy="20" r="10" fill="#ef4444" opacity="0.85" />
      <text x="36" y="25" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconBankReceipt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 14h36z" fill={c2} />
      <rect x="8" y="14" width="32" height="4" rx="1" fill={c1} />
      <rect x="12" y="18" width="4" height="12" rx="1" fill={c1} />
      <rect x="22" y="18" width="4" height="12" rx="1" fill={c2} />
      <rect x="32" y="18" width="4" height="12" rx="1" fill={c1} />
      <rect x="8" y="30" width="32" height="4" rx="1" fill={c1} />
      <path d="M24 36v6M20 42h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBankPayment({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 14h36z" fill={c2} />
      <rect x="8" y="14" width="32" height="4" rx="1" fill={c1} />
      <rect x="12" y="18" width="4" height="12" rx="1" fill={c1} />
      <rect x="22" y="18" width="4" height="12" rx="1" fill={c2} />
      <rect x="32" y="18" width="4" height="12" rx="1" fill={c1} />
      <rect x="8" y="30" width="32" height="4" rx="1" fill={c1} />
      <path d="M24 42v-6M20 36h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClearanceReceipt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="12" width="24" height="24" rx="3" fill={c1} />
      <path d="M8 15a3 3 0 013-3h18a3 3 0 013 3v3H8z" fill={c2} />
      <polyline points="15,26 20,31 30,21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 28v8M32 36h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClearancePayment({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="12" width="24" height="24" rx="3" fill={c1} />
      <path d="M8 15a3 3 0 013-3h18a3 3 0 013 3v3H8z" fill={c2} />
      <polyline points="15,26 20,31 30,21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 36v-8M32 28h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconClearanceInvoice({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="8" y="12" width="24" height="24" rx="3" fill={c1} />
      <path d="M8 15a3 3 0 013-3h18a3 3 0 013 3v3H8z" fill={c2} />
      <rect x="12" y="22" width="16" height="2" rx="1" fill={c2} opacity="0.4" />
      <rect x="12" y="28" width="12" height="2" rx="1" fill={c2} opacity="0.4" />
      <circle cx="40" cy="14" r="7" fill={c2} />
      <text x="40" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">$</text>
    </svg>
  );
}

export function IconOfficeReceipt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="10" width="20" height="28" rx="2" fill={c1} />
      <rect x="10" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="10" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <path d="M30 28v8M26 36h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOfficePayment({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="10" width="20" height="28" rx="2" fill={c1} />
      <rect x="10" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="10" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <path d="M30 36v-8M26 28h8" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOfficeStatement({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="10" width="20" height="28" rx="2" fill={c1} />
      <rect x="10" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="14" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="10" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="17" y="22" width="5" height="4" rx="1" fill={c2} opacity="0.5" />
      <rect x="28" y="20" width="16" height="18" rx="3" fill={c2} />
      <rect x="32" y="26" width="8" height="2" rx="1" fill="white" opacity="0.4" />
      <rect x="32" y="30" width="6" height="2" rx="1" fill="white" opacity="0.4" />
    </svg>
  );
}

export function IconExpenseType({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="6" width="30" height="10" rx="3" fill={c2} />
      <text x="19" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">TAG</text>
      <rect x="4" y="20" width="30" height="10" rx="3" fill={c1} />
      <rect x="8" y="24" width="10" height="2" rx="1" fill={c2} opacity="0.5" />
      <rect x="4" y="34" width="30" height="10" rx="3" fill={c2} opacity="0.7" />
      <rect x="8" y="38" width="12" height="2" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
}

export function IconExpenseEntry({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="14" width="32" height="22" rx="4" fill={c1} />
      <rect x="4" y="14" width="32" height="8" rx="4" fill={c2} />
      <rect x="26" y="26" width="8" height="6" rx="2" fill={c2} />
      <circle cx="30" cy="29" r="1.5" fill="white" opacity="0.5" />
      <circle cx="40" cy="12" r="7" fill="#ef4444" opacity="0.85" />
      <text x="40" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">-</text>
    </svg>
  );
}

export function IconDebtReceipt({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="20" cy="20" r="12" fill={c2} />
      <text x="20" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">$</text>
      <path d="M34 30v8M30 38h8" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconDebtPayment({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="20" cy="20" r="12" fill={c2} />
      <text x="20" y="25" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">$</text>
      <path d="M34 38v-8M30 30h8" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOwnerWithdraw({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 38c0-6 4-10 10-10h4c6 0 10 4 10 10" fill={c1} />
      <circle cx="22" cy="16" r="9" fill={c2} />
      <path d="M36 14v10" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 20l4 4 4-4" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOwnerReturn({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 38c0-6 4-10 10-10h4c6 0 10 4 10 10" fill={c1} />
      <circle cx="22" cy="16" r="9" fill={c2} />
      <path d="M36 24v-10" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 18l4-4 4 4" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconOwnerNames({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M10 38c0-6 4-10 10-10h4c6 0 10 4 10 10" fill={c1} />
      <circle cx="22" cy="16" r="9" fill={c2} />
      <circle cx="22" cy="14" r="4" fill="white" opacity="0.5" />
      <circle cx="40" cy="14" r="6" fill={c2} />
      <path d="M38 14h4M40 12v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconAgentClients({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="16" cy="14" r="6" fill={c2} />
      <path d="M6 36c0-6 4-10 10-10s10 4 10 10" fill={c1} />
      <circle cx="32" cy="14" r="6" fill={c1} opacity="0.7" />
      <path d="M24 36c0-6 4-10 8-10s8 4 8 10" fill={c2} opacity="0.5" />
      <rect x="18" y="38" width="12" height="4" rx="2" fill={c2} />
    </svg>
  );
}

export function IconAgentLoad({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="10" cy="34" r="3.5" fill={c2} />
      <circle cx="30" cy="34" r="3.5" fill={c2} />
      <path d="M3 14h20v18H3z" fill={c1} />
      <path d="M23 18h9l5 7v7H23z" fill={c2} />
      <rect x="8" y="8" width="12" height="6" rx="2" fill={c2} />
      <path d="M14 8v-4M10 4h8" stroke={c1} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconAgentGps({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="16" stroke={c1} strokeWidth="3" fill="none" />
      <circle cx="24" cy="24" r="8" stroke={c2} strokeWidth="2" fill="none" />
      <circle cx="24" cy="24" r="3" fill={c2} />
      <line x1="24" y1="4" x2="24" y2="12" stroke={c1} strokeWidth="2.5" />
      <line x1="24" y1="36" x2="24" y2="44" stroke={c1} strokeWidth="2.5" />
      <line x1="4" y1="24" x2="12" y2="24" stroke={c1} strokeWidth="2.5" />
      <line x1="36" y1="24" x2="44" y2="24" stroke={c1} strokeWidth="2.5" />
    </svg>
  );
}

export function IconProduct({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 14v20l18 10 18-10V14z" fill={c1} />
      <path d="M24 4L6 14l18 10 18-10z" fill={c2} />
      <path d="M24 24v20" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <path d="M6 14l18 10" stroke="white" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}

export function IconUnit({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="6" y="6" width="36" height="36" rx="3" stroke={c1} strokeWidth="3" fill="none" />
      <line x1="6" y1="18" x2="42" y2="18" stroke={c2} strokeWidth="2" />
      <line x1="6" y1="30" x2="42" y2="30" stroke={c2} strokeWidth="2" />
      <line x1="18" y1="6" x2="18" y2="42" stroke={c2} strokeWidth="2" />
      <line x1="30" y1="6" x2="30" y2="42" stroke={c2} strokeWidth="2" />
    </svg>
  );
}

export function IconCategory({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="4" width="18" height="18" rx="3" fill={c2} />
      <rect x="26" y="4" width="18" height="18" rx="3" fill={c1} />
      <rect x="4" y="26" width="18" height="18" rx="3" fill={c1} />
      <rect x="26" y="26" width="18" height="18" rx="3" fill={c2} />
    </svg>
  );
}

export function IconInventory({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <rect x="4" y="4" width="40" height="8" rx="2" fill={c2} />
      <rect x="6" y="12" width="36" height="32" rx="2" fill={c1} />
      <rect x="10" y="18" width="10" height="3" rx="1" fill={c2} opacity="0.5" />
      <rect x="10" y="24" width="14" height="3" rx="1" fill={c2} opacity="0.5" />
      <rect x="10" y="30" width="8" height="3" rx="1" fill={c2} opacity="0.5" />
      <polyline points="30,30 34,34 42,24" stroke={c2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IconWarehouseTransfer({ className }: P) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 18L12 12l8 6v2H4z" fill={c2} />
      <rect x="5" y="20" width="14" height="10" rx="1" fill={c1} />
      <rect x="8" y="22" width="4" height="6" rx="1" fill={c2} opacity="0.5" />
      <path d="M28 18L36 12l8 6v2H28z" fill={c2} />
      <rect x="29" y="20" width="14" height="10" rx="1" fill={c1} />
      <rect x="32" y="22" width="4" height="6" rx="1" fill={c2} opacity="0.5" />
      <path d="M20 22h8M26 19l3 3-3 3" stroke={c2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 28h-8M22 31l-3-3 3-3" stroke={c1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
