import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  place_name: string;
  text: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mapbox-search`;

export function AddressAutocomplete({ value, onChange, placeholder = "Start typing an address...", className, id }: Props) {
  const [query, setQuery] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSelected = useRef<string>(value ?? "");

  useEffect(() => {
    setQuery(value ?? "");
    lastSelected.current = value ?? "";
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchSuggestions = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const r = await fetch(`${FN_URL}?q=${encodeURIComponent(q)}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await r.json();
        setSuggestions(data.features ?? []);
        setOpen(true);
        setHighlight(0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const select = (s: Suggestion) => {
    setQuery(s.place_name);
    lastSelected.current = s.place_name;
    onChange(s.place_name);
    setOpen(false);
    setSuggestions([]);
  };

  const handleBlur = () => {
    // Enforce autocomplete: revert to last selected if user typed free-text
    setTimeout(() => {
      if (query !== lastSelected.current) {
        setQuery(lastSelected.current);
      }
    }, 200);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && suggestions[highlight]) { e.preventDefault(); select(suggestions[highlight]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-accent",
                i === highlight && "bg-accent",
              )}
            >
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1">{s.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
