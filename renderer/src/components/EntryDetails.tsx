import { PasswordEntry, EntryField } from '@/lib/ipc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, Trash2, Clipboard, Edit2 } from 'lucide-react';

interface EntryDetailsProps {
  entry: PasswordEntry | null;
  revealedFieldIds: Set<string>;
  copiedFieldIds: Set<string>;
  onFieldReveal: (fieldId: string) => void;
  onCopyField: (value: string, label: string, fieldId: string) => void;
  onEntryEdit: (entry: PasswordEntry) => void;
  onEntryDelete: (entryId: string) => void;
  onEntryDuplicate: (entry: PasswordEntry) => void;
  onInlineEdit: (field: string, currentValue: string) => void;
  onInlineSave: (field: string, value: string) => void;
  onCustomFieldAdd: () => void;
  onCustomFieldUpdate: (index: number, field: Partial<EntryField>) => void;
  onCustomFieldMove: (index: number, direction: 'up' | 'down') => void;
  onCustomFieldDelete: (fieldId: string) => void;
}

export function EntryDetails({
  entry,
  revealedFieldIds,
  copiedFieldIds,
  onFieldReveal,
  onCopyField,
  onEntryEdit,
  onEntryDelete,
  onEntryDuplicate,
  onInlineEdit,
  onInlineSave,
  onCustomFieldAdd,
  onCustomFieldUpdate,
  onCustomFieldMove,
  onCustomFieldDelete
}: EntryDetailsProps) {
  if (!entry) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-sm text-muted-foreground text-center">
            <div className="text-2xl mb-3">👆</div>
            <div className="font-medium mb-1">Select a login to view details</div>
            <div className="text-xs">Use arrow keys to navigate, Enter to select</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{entry.name || 'Entry Details'}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" title="Entry actions">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyField(entry.username || '', 'Username', `username-${entry.id}`)}>
              <Clipboard className="w-4 h-4 mr-2" />
              Copy username
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyField(entry.password || '', 'Password', `password-${entry.id}`)}>
              <Clipboard className="w-4 h-4 mr-2" />
              Copy password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyField(entry.url || '', 'URL', `url-${entry.id}`)}>
              <Clipboard className="w-4 h-4 mr-2" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEntryDuplicate(entry)}>
              <Plus className="w-4 h-4 mr-2" />
              Duplicate entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEntryEdit(entry)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEntryDelete(entry.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {/* Company Field */}
          <div className="text-sm">
            <span className="font-medium">Company:</span>{' '}
            <button
              className="flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent"
              onClick={() => onInlineEdit('company', entry.company || '')}
            >
              {entry.company || <span className="text-muted-foreground italic">Unassigned</span>}
            </button>
          </div>

          {/* Name Field */}
          <div className="text-sm">
            <span className="font-medium">Name:</span>{' '}
            <button
              className="flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent"
              onClick={() => onInlineEdit('name', entry.name || '')}
            >
              {entry.name}
            </button>
          </div>

          {/* Username Field */}
          <div className="text-sm">
            <span className="font-medium">Username:</span>{' '}
            <div className="flex items-center gap-2">
              <button
                className={`flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  copiedFieldIds.has(`username-${entry.id}`)
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'hover:bg-accent'
                }`}
                onClick={() => onCopyField(entry.username || '', 'Username', `username-${entry.id}`)}
              >
                {entry.username || <span className="text-muted-foreground italic">No username</span>}
                {copiedFieldIds.has(`username-${entry.id}`) && (
                  <span className="ml-2 text-xs opacity-70">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* Password Field */}
          <div className="text-sm">
            <span className="font-medium">Password:</span>{' '}
            <div className="flex items-center gap-2">
              <button
                className={`flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  copiedFieldIds.has(`password-${entry.id}`)
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'hover:bg-accent'
                }`}
                onClick={() => onCopyField(entry.password || '', 'Password', `password-${entry.id}`)}
              >
                {entry.password ? '••••••••' : <span className="text-muted-foreground italic">No password</span>}
                {copiedFieldIds.has(`password-${entry.id}`) && (
                  <span className="ml-2 text-xs opacity-70">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* URL Field */}
          <div className="text-sm">
            <span className="font-medium">URL:</span>{' '}
            <button
              className="flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent"
              onClick={() => onInlineEdit('url', entry.url || '')}
            >
              {entry.url || <span className="text-muted-foreground italic">No URL</span>}
            </button>
          </div>

          {/* Notes Field */}
          <div className="text-sm">
            <span className="font-medium">Notes:</span>
            <div className="mt-1">
              <button
                className="w-full text-left rounded px-1 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent min-h-[60px] whitespace-pre-wrap"
                onClick={() => onInlineEdit('notes', entry.notes || '')}
              >
                {entry.notes || <span className="text-muted-foreground italic">No notes</span>}
              </button>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="mt-4 grid gap-2">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Custom Fields</div>
              <Button
                variant="outline"
                size="sm"
                onClick={onCustomFieldAdd}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add field
              </Button>
            </div>

            {(entry.fields || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No custom fields</div>
            )}

            {(entry.fields || []).map((field, idx) => (
              <div key={field.id} className="rounded-md border p-3 grid gap-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => onCustomFieldUpdate(idx, { label: e.target.value })}
                      placeholder="Field label"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => onCustomFieldUpdate(idx, { type: value as 'text' | 'password' })}
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
                        onChange={(e) => onCustomFieldUpdate(idx, { value: e.target.value })}
                        placeholder="Field value"
                        className="text-sm"
                      />
                      {field.type === 'password' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onFieldReveal(field.id)}
                          title={revealedFieldIds.has(field.id) ? 'Hide' : 'Show'}
                        >
                          {revealedFieldIds.has(field.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onCopyField(field.value, field.label || 'Field', `field-${field.id}`)}
                        title="Copy"
                        className={`transition-all duration-200 ${
                          copiedFieldIds.has(`field-${field.id}`)
                            ? 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                            : ''
                        }`}
                      >
                        <Clipboard className="w-4 h-4" />
                      </Button>
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
                      onClick={() => onCustomFieldMove(idx, 'up')}
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={idx === (entry.fields || []).length - 1}
                      onClick={() => onCustomFieldMove(idx, 'down')}
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => onCustomFieldDelete(field.id)}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
