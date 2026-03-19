import { useState, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter or comma',
  maxTags = 10,
  suggestions = [],
}: TagInputProps) {
  const tags = value
    ? value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTags = useCallback(
    (newTags: string[]) => {
      onChange(newTags.join(', '));
    },
    [onChange],
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (tags.length >= maxTags) return;
      if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
      updateTags([...tags, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    },
    [tags, maxTags, updateTags],
  );

  const removeTag = useCallback(
    (index: number) => {
      updateTags(tags.filter((_, i) => i !== index));
    },
    [tags, updateTags],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If user typed a comma, add as tag
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((p, i) => {
        if (i < parts.length - 1) addTag(p);
      });
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(val);
      setShowSuggestions(val.length > 0);
    }
  };

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-[5px] border border-border bg-background p-2 min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {tags.map((tag, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="gap-1 text-xs font-normal pl-2 pr-1 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {tags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px] flex items-center gap-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => inputValue && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={tags.length === 0 ? placeholder : 'Add more...'}
              className="border-0 shadow-none p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Add"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {showSuggestions && filtered.length > 0 && (
        <div className="rounded-[5px] border border-border bg-card shadow-md max-h-36 overflow-y-auto">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {tags.length}/{maxTags} — separate with commas or press Enter
      </p>
    </div>
  );
}
