import { useState } from "react";
import { CalendarIcon, ChevronDown, Check } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const WEEK_OPTIONS = { locale: es, weekStartsOn: 1 as const }; // Monday

const presets = [
  {
    label: "Esta semana",
    getValue: () => ({
      from: startOfWeek(new Date(), WEEK_OPTIONS),
      to: endOfWeek(new Date(), WEEK_OPTIONS),
      label: "Esta semana",
    }),
  },
  {
    label: "Últimos 30 días",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
      label: "Últimos 30 días",
    }),
  },
  {
    label: "Este mes",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
      label: "Este mes",
    }),
  },
  {
    label: "Mes anterior",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: "Mes anterior",
      };
    },
  },
  {
    label: "Últimos 3 meses",
    getValue: () => ({
      from: subMonths(new Date(), 3),
      to: new Date(),
      label: "Últimos 3 meses",
    }),
  },
  {
    label: "Últimos 6 meses",
    getValue: () => ({
      from: subMonths(new Date(), 6),
      to: new Date(),
      label: "Últimos 6 meses",
    }),
  },
  {
    label: "Este año",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
      label: "Este año",
    }),
  },
  {
    label: "Todo el historial",
    getValue: () => ({
      from: new Date(2024, 0, 1),
      to: endOfMonth(new Date()),
      label: "Todo el historial",
    }),
  },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const handlePresetSelect = (preset: typeof presets[0]) => {
    onChange(preset.getValue());
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({
        from: customFrom,
        to: customTo,
        label: `${format(customFrom, "dd/MM/yy")} - ${format(customTo, "dd/MM/yy")}`,
      });
      setIsCustomOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Preset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200/90 dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer focus:outline-none shadow-2xs"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="hidden sm:inline">{value.label}</span>
            <span className="sm:hidden">
              {value.label.length > 15 ? value.label.slice(0, 12) + "..." : value.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-xl p-1"
        >
          {presets.map((preset) => {
            const isSelected = value.label === preset.label;
            return (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "text-xs font-medium rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors my-0.5 flex items-center justify-between",
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                )}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
          <DropdownMenuItem
            onClick={() => setIsCustomOpen(true)}
            className="text-xs font-medium rounded-lg px-2.5 py-1.5 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
          >
            Personalizado...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Date Range Popover */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl overflow-hidden"
          align="end"
        >
          <div className="p-4 space-y-4">
            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">Seleccionar rango</h4>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-500">Desde</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 pointer-events-auto"
                  locale={es}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-500">Hasta</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  disabled={(date) => customFrom ? date < customFrom : false}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 pointer-events-auto"
                  locale={es}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                {customFrom && customTo
                  ? `${format(customFrom, "dd MMM yyyy", { locale: es })} - ${format(customTo, "dd MMM yyyy", { locale: es })}`
                  : "Selecciona ambas fechas"}
              </p>
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg text-xs font-medium px-3 h-8 shadow-xs"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
