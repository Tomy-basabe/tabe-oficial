import { useState } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
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

  const isPreset = presets.some(p => p.label === value.label);

  return (
    <div className="flex items-center gap-2">
      {/* Preset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "gap-2 bg-secondary border-border hover:bg-secondary/80",
              !isPreset && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{value.label}</span>
            <span className="sm:hidden">
              {value.label.length > 15 ? value.label.slice(0, 12) + "..." : value.label}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                value.label === preset.label && "bg-primary/10 text-primary"
              )}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCustomOpen(true)}>
            Personalizado...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Date Range Popover */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <h4 className="font-medium text-sm">Seleccionar rango</h4>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Desde</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className="rounded-md border pointer-events-auto"
                  locale={es}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Hasta</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  disabled={(date) => customFrom ? date < customFrom : false}
                  className="rounded-md border pointer-events-auto"
                  locale={es}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {customFrom && customTo
                  ? `${format(customFrom, "dd MMM yyyy", { locale: es })} - ${format(customTo, "dd MMM yyyy", { locale: es })}`
                  : "Selecciona ambas fechas"}
              </p>
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
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
