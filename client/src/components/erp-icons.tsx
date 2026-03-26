import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  UserCheck,
  Package,
  Landmark,
  ClipboardCheck,
  Building2,
  Wallet,
  HandCoins,
  Crown,
  Warehouse,
  AlertTriangle,
  Barcode,
  ArrowRightLeft,
  Settings,
  Users,
  Building,
  CreditCard,
  MapPin,
  DollarSign,
  Banknote,
  FileText,
  FilePlus,
  FileInput,
  FileOutput,
  FileMinus,
  FileSpreadsheet,
  FileCheck,
  Receipt,
  ReceiptText,
  Send,
  Download,
  Upload,
  BadgeDollarSign,
  CircleDollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  UserPlus,
  UsersRound,
  PackagePlus,
  Navigation,
  Box,
  Ruler,
  Grid3X3,
  ClipboardList,
  ArrowLeftRight,
  RotateCcw,
  BarChart3,
  Timer,
  Tags,
  ReceiptIcon,
  type LucideProps,
} from "lucide-react";

type P = { className?: string };

export function IconDashboard({ className }: P) {
  return <LayoutDashboard className={className} />;
}

export function IconSales({ className }: P) {
  return <ShoppingCart className={className} />;
}

export function IconSupplier({ className }: P) {
  return <Truck className={className} />;
}

export function IconAgent({ className }: P) {
  return <UserCheck className={className} />;
}

export function IconMaterial({ className }: P) {
  return <Package className={className} />;
}

export function IconBank({ className }: P) {
  return <Landmark className={className} />;
}

export function IconClearance({ className }: P) {
  return <ClipboardCheck className={className} />;
}

export function IconOffice({ className }: P) {
  return <Building2 className={className} />;
}

export function IconExpense({ className }: P) {
  return <Wallet className={className} />;
}

export function IconExternalDebt({ className }: P) {
  return <HandCoins className={className} />;
}

export function IconOwner({ className }: P) {
  return <Crown className={className} />;
}

export function IconWarehouse({ className }: P) {
  return <Warehouse className={className} />;
}

export function IconDamage({ className }: P) {
  return <AlertTriangle className={className} />;
}

export function IconBarcode({ className }: P) {
  return <Barcode className={className} />;
}

export function IconCurrencyExchange({ className }: P) {
  return <ArrowRightLeft className={className} />;
}

export function IconSettings({ className }: P) {
  return <Settings className={className} />;
}

export function IconUserManagement({ className }: P) {
  return <Users className={className} />;
}

export function IconCompany({ className }: P) {
  return <Building className={className} />;
}

export function IconAccounts({ className }: P) {
  return <CreditCard className={className} />;
}

export function IconAddress({ className }: P) {
  return <MapPin className={className} />;
}

export function IconDollar({ className }: P) {
  return <DollarSign className={className} />;
}

export function IconDinar({ className }: P) {
  return <Banknote className={className} />;
}

export function IconReceiptUsd({ className }: P) {
  return <Receipt className={className} />;
}

export function IconReceiptIqd({ className }: P) {
  return <ReceiptText className={className} />;
}

export function IconInvoiceUsd({ className }: P) {
  return <FileText className={className} />;
}

export function IconInvoiceIqd({ className }: P) {
  return <FileInput className={className} />;
}

export function IconReturnUsd({ className }: P) {
  return <FileOutput className={className} />;
}

export function IconReturnIqd({ className }: P) {
  return <FileMinus className={className} />;
}

export function IconCustomers({ className }: P) {
  return <UsersRound className={className} />;
}

export function IconStatementUsd({ className }: P) {
  return <FileSpreadsheet className={className} />;
}

export function IconStatementIqd({ className }: P) {
  return <FileCheck className={className} />;
}

export function IconPaymentUsd({ className }: P) {
  return <Send className={className} />;
}

export function IconPaymentIqd({ className }: P) {
  return <BadgeDollarSign className={className} />;
}

export function IconPosUsd({ className }: P) {
  return <CircleDollarSign className={className} />;
}

export function IconPosIqd({ className }: P) {
  return <Banknote className={className} />;
}

export function IconSupplierList({ className }: P) {
  return <Truck className={className} />;
}

export function IconPurchaseUsd({ className }: P) {
  return <FilePlus className={className} />;
}

export function IconPurchaseIqd({ className }: P) {
  return <FileInput className={className} />;
}

export function IconSupplierPayment({ className }: P) {
  return <ArrowDownToLine className={className} />;
}

export function IconSupplierAdjust({ className }: P) {
  return <ArrowRightLeft className={className} />;
}

export function IconSupplierDebt({ className }: P) {
  return <HandCoins className={className} />;
}

export function IconBankReceipt({ className }: P) {
  return <ArrowUpFromLine className={className} />;
}

export function IconBankPayment({ className }: P) {
  return <ArrowDownToLine className={className} />;
}

export function IconClearanceReceipt({ className }: P) {
  return <ArrowUpFromLine className={className} />;
}

export function IconClearancePayment({ className }: P) {
  return <ArrowDownToLine className={className} />;
}

export function IconClearanceInvoice({ className }: P) {
  return <FileCheck className={className} />;
}

export function IconOfficeReceipt({ className }: P) {
  return <ArrowUpFromLine className={className} />;
}

export function IconOfficePayment({ className }: P) {
  return <ArrowDownToLine className={className} />;
}

export function IconOfficeStatement({ className }: P) {
  return <FileSpreadsheet className={className} />;
}

export function IconExpenseType({ className }: P) {
  return <Tags className={className} />;
}

export function IconExpenseEntry({ className }: P) {
  return <ReceiptIcon className={className} />;
}

export function IconDebtReceipt({ className }: P) {
  return <Download className={className} />;
}

export function IconDebtPayment({ className }: P) {
  return <Upload className={className} />;
}

export function IconOwnerWithdraw({ className }: P) {
  return <ArrowDownToLine className={className} />;
}

export function IconOwnerReturn({ className }: P) {
  return <ArrowUpFromLine className={className} />;
}

export function IconOwnerNames({ className }: P) {
  return <UserPlus className={className} />;
}

export function IconAgentClients({ className }: P) {
  return <UsersRound className={className} />;
}

export function IconAgentLoad({ className }: P) {
  return <PackagePlus className={className} />;
}

export function IconAgentGps({ className }: P) {
  return <Navigation className={className} />;
}

export function IconProduct({ className }: P) {
  return <Box className={className} />;
}

export function IconUnit({ className }: P) {
  return <Ruler className={className} />;
}

export function IconCategory({ className }: P) {
  return <Grid3X3 className={className} />;
}

export function IconInventory({ className }: P) {
  return <ClipboardList className={className} />;
}

export function IconWarehouseTransfer({ className }: P) {
  return <ArrowLeftRight className={className} />;
}

export function IconDataReset({ className }: P) {
  return <RotateCcw className={className} />;
}

export function IconReport({ className }: P) {
  return <BarChart3 className={className} />;
}

export function IconExpiry({ className }: P) {
  return <Timer className={className} />;
}
