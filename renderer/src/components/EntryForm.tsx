import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PasswordEntry, EntryField } from '@/lib/ipc';
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';

interface EntryFormProps {
  isOpen: boolean;
  editing: PasswordEntry | null;
  selectedCompany?: string | null;
  onClose: () => void;
  onSave: (entry: Omit<PasswordEntry, 'id' | 'updatedAt'>) => void;
}

export function EntryForm({ isOpen, editing, selectedCompany, onClose, onSave }: EntryFormProps) {
  const [form, setForm] = useState<Required<Omit<PasswordEntry, 'id' | 'updatedAt'> & { fields: EntryField[] }>>({
    company: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    fields: []
  });

  const [revealedFieldIds, setRevealedFieldIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setForm({
          company: editing.company || '',
          name: editing.name || '',
          username: editing.username || '',
          password: editing.password || '',
          url: editing.url || '',
          notes: editing.notes || '',
          fields: editing.fields || []
        });
      } else {
        setForm({
          company: selectedCompany || '',
          name: '',
          username: '',
          password: '',
          url: '',
          notes: '',
          fields: []
        });
      }
      setRevealedFieldIds(new Set());
    }
  }, [isOpen, editing, selectedCompany]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    onSave(form);
  };

  const addCustomField = () => {
    const newField: EntryField = {
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      label: '',
      type: 'text',
      value: ''
    };
    setForm(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateCustomField = (index: number, updates: Partial<EntryField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    const newFields = [...form.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

    setForm(prev => ({ ...prev, fields: newFields }));
  };

  const deleteCustomField = (fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    setRevealedFieldIds(prev => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  };

  const toggleFieldReveal = (fieldId: string) => {
    setRevealedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <DialogHeader>
          <DialogTitle id="dialog-title">{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={form.url}
              onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Custom Fields */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Custom fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomField}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add field
              </Button>
            </div>

            {form.fields.length === 0 && (
              <div className="text-sm text-muted-foreground">No custom fields</div>
            )}

            {form.fields.map((field, idx) => (
              <div key={field.id} className="rounded-md border p-2 grid gap-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                      placeholder="Field label"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateCustomField(idx, { type: value as 'text' | 'password' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">Value</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={field.type === 'password' && !revealedFieldIds.has(field.id) ? 'password' : 'text'}
                        value={field.value}
                        onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                        placeholder="Field value"
                        className="text-sm"
                      />
                      {field.type === 'password' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => toggleFieldReveal(field.id)}
                          title={revealedFieldIds.has(field.id) ? 'Hide' : 'Show'}
                        >
                          {revealedFieldIds.has(field.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveCustomField(idx, 'up')}
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={idx === form.fields.length - 1}
                      onClick={() => moveCustomField(idx, 'down')}
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteCustomField(field.id)}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
