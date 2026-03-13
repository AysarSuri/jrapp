import { SearchSelect } from "@/components/search-select";
import { useTranslation } from "react-i18next";

interface CustomerSearchSelectProps {
  customers: { id: number; name: string }[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputClassName?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function CustomerSearchSelect({
  customers,
  value,
  onValueChange,
  placeholder,
  "data-testid": testId,
  className,
  inputClassName,
  showAllOption,
  allOptionLabel,
}: CustomerSearchSelectProps) {
  const { t } = useTranslation();
  return (
    <SearchSelect
      items={customers}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder || t("Select customer...")}
      noResultsText={t("No clients found")}
      data-testid={testId}
      className={className}
      inputClassName={inputClassName}
      showAllOption={showAllOption}
      allOptionLabel={allOptionLabel}
    />
  );
}
