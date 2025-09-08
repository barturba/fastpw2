import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Edit2 } from 'lucide-react';

interface InlineEditFieldProps {
  field: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'password';
  multiline?: boolean;
  showEditButton?: boolean;
  onSave: (field: string, value: string) => void;
  className?: string;
}

export function InlineEditField({
  field,
  value,
  placeholder,
  type = 'text',
  multiline = false,
  showEditButton = true,
  onSave,
  className = ''
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);

  const handleStartEdit = () => {
    setEditingValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(field, editingValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 flex-1 ${className}`}>
        {multiline ? (
          <Textarea
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] text-sm"
            autoFocus
            onKeyDown={handleKeyDown}
          />
        ) : (
          <Input
            type={type}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            autoFocus
            onKeyDown={handleKeyDown}
          />
        )}
        <Button size="sm" onClick={handleSave} title="Save (Enter)">
          <Check className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} title="Cancel (Esc)">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const displayValue = field === 'password' && !isEditing ? '••••••••' : value;

  return (
    <div className={`group flex items-center gap-2 flex-1 ${className}`}>
      <span className="flex-1">
        {displayValue || (placeholder ? <span className="text-muted-foreground italic">{placeholder}</span> : '')}
      </span>
      {showEditButton && (
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleStartEdit}
          title="Edit inline"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
