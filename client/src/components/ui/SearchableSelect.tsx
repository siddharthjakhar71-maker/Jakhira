import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SearchableSelectProps<T> = {
  options: T[];
  value: string;
  onSelect: (value: string, option: T | null) => void;
  placeholder?: string;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  getOptionDescription?: (option: T) => string | null | undefined;
  renderOption?: (option: T, state: { selected: boolean; active: boolean }) => ReactNode;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  noResultsText?: string;
  maxResults?: number;
  onInputChange?: (query: string) => void;
  onFocus?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  endAdornment?: ReactNode;
  "data-testid"?: string;
};

export function SearchableSelect<T>({
  options,
  value,
  onSelect,
  placeholder = "Search...",
  getOptionLabel,
  getOptionValue,
  getOptionDescription,
  renderOption,
  disabled = false,
  className,
  inputClassName,
  dropdownClassName,
  noResultsText = "No results found",
  maxResults = 20,
  onInputChange,
  onFocus,
  inputRef,
  endAdornment,
  "data-testid": dataTestId,
}: SearchableSelectProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<Record<string, string | number>>({});

  const selectedOption = useMemo(
    () => options.find((option) => getOptionValue(option) === value) ?? null,
    [getOptionValue, options, value],
  );

  useEffect(() => {
    setQuery(selectedOption ? getOptionLabel(selectedOption) : "");
  }, [getOptionLabel, selectedOption]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? options.filter((option) => {
          const label = getOptionLabel(option).toLowerCase();
          const description = getOptionDescription?.(option)?.toLowerCase() ?? "";
          return label.includes(normalized) || description.includes(normalized);
        })
      : options;

    return matches.slice(0, maxResults);
  }, [getOptionDescription, getOptionLabel, maxResults, options, query]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(Math.max(filteredOptions.length - 1, 0));
    }
  }, [activeIndex, filteredOptions.length]);

  const updateDropdownPosition = () => {
    if (!internalInputRef.current) return;
    const rect = internalInputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: 260,
      overflowY: "auto",
    });
  };

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  const selectOption = (option: T) => {
    const nextValue = getOptionValue(option);
    setQuery(getOptionLabel(option));
    setOpen(false);
    onSelect(nextValue, option);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter" && open) {
      const option = filteredOptions[activeIndex];
      if (!option) return;
      event.preventDefault();
      selectOption(option);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={(el) => {
            internalInputRef.current = el;
            inputRef?.(el);
          }}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(endAdornment ? "pr-10" : undefined, inputClassName)}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setActiveIndex(0);
            updateDropdownPosition();
            onFocus?.();
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(true);
            setActiveIndex(0);
            updateDropdownPosition();
            onInputChange?.(nextQuery);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-muted-foreground">
          {endAdornment ?? <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {open && !disabled && typeof document !== "undefined"
        ? createPortal(
            <div
              style={dropdownStyle}
              className={cn("rounded-md border bg-popover shadow-md", dropdownClassName)}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">{noResultsText}</div>
              ) : (
                filteredOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const selected = optionValue === value;
                  const active = index === activeIndex;
                  return (
                    <button
                      type="button"
                      key={optionValue}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
                        active && "bg-muted",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setActiveIndex(index);
                        selectOption(option);
                      }}
                    >
                      {renderOption ? (
                        renderOption(option, { selected, active })
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{getOptionLabel(option)}</div>
                            {getOptionDescription?.(option) ? (
                              <div className="truncate text-xs text-muted-foreground">{getOptionDescription(option)}</div>
                            ) : null}
                          </div>
                          {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default SearchableSelect;
