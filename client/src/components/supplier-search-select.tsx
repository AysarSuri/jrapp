import { SearchSelect } from "@/components/search-select";
import { useTranslation } from "react-i18next";

interface SupplierSearchSelectProps {
  suppliers: { id: number; name: string }[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputClassName?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function SupplierSearchSelect({
  suppliers,
  value,
  onValueChange,
  placeholder,
  "data-testid": testId,
  className,
  inputClassName,
  showAllOption,
  allOptionLabel,
}: SupplierSearchSelectProps) {
  const { t } = useTranslation();
  return (
    <SearchSelect
      items={suppliers}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder || t("Select supplier...")}
      noResultsText={t("No suppliers found")}
      data-testid={testId}
      className={className}
      inputClassName={inputClassName}
      showAllOption={showAllOption}
      allOptionLabel={allOptionLabel}
    />
  );
}
