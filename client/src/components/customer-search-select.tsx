import { useMemo } from "react";
import { SearchSelect } from "@/components/search-select";
import { useTranslation } from "react-i18next";

interface CustomerSearchSelectProps {
  customers: { id: number; name: string; address?: string | null; contact?: string | null }[];
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

  const items = useMemo(() =>
    customers.map(c => {
      const parts: string[] = [];
      if (c.address) parts.push(c.address);
      if (c.contact) parts.push(c.contact);
      return {
        id: c.id,
        name: c.name,
        subtitle: parts.length > 0 ? parts.join(" • ") : undefined,
      };
    }),
    [customers]
  );

  return (
    <SearchSelect
      items={items}
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
