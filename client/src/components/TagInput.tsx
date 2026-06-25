import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export default function TagInput({ value = [], onChange, placeholder = "أضف تاج...", maxTags = 20 }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="border border-input rounded-md p-2 min-h-[42px] bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-medium cursor-default"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="border-0 shadow-none focus-visible:ring-0 h-7 px-1 text-sm flex-1 bg-transparent"
          />
          {inputValue.trim() && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => addTag(inputValue)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {value.length} تاج — اضغط Enter أو فاصلة للإضافة
        </p>
      )}
    </div>
  );
}
