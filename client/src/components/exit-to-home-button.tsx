import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const OPEN_HOME_EVENT = "jr:open-home";

export function ExitToHomeButton() {
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";
  const Arrow = isRtl ? ArrowRight : ArrowLeft;

  const goHome = () => {
    setLocation("/");
    window.dispatchEvent(new Event(OPEN_HOME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={goHome}
      data-testid="button-exit-to-home"
      className="inline-flex items-center gap-2 h-10 px-5 rounded-full border-2 border-[#E8B87A] bg-[#FBE4C9] text-[#8B5A2B] text-[15px] font-bold shadow-sm hover:bg-[#f7d7ad] hover:border-[#d9a45e] transition-colors shrink-0"
    >
      <span>{t("Exit")}</span>
      <Arrow className="w-4 h-4" />
    </button>
  );
}
