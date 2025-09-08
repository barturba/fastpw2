import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ipc, type PasswordEntry } from '@/lib/ipc';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, X } from 'lucide-react';

// Import our new components and hooks
import { EntryList } from '@/components/EntryList';
import { CompanyList } from '@/components/CompanyList';
import { EntryDetails } from '@/components/EntryDetails';
import { EntryForm } from '@/components/EntryForm';
import { usePasswordManager } from '@/hooks/usePasswordManager';

export function MainScreen({
  initialEntries,
  masterPassword,
}: {
  initialEntries: PasswordEntry[];
  masterPassword: string;
}) {
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const local = (typeof window !== 'undefined' && window.localStorage.getItem('themePreference')) as 'light' | 'dark' | null;
    return local || 'light';
  });

  // Form dialog state
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);

  // Rename company dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Use our custom hook for state management
  const {
    entries,
    selectedCompany,
    selectedEntryId,
    selectedEntry,
    searchQuery,
    searchSelectedIndex,
    hasUnsavedChanges,
    companies,
    filteredEntries,
    setSelectedCompany,
    setSelectedEntryId,
    setSearchSelectedIndex,
    handleSearchChange,
    handleSave,
    addEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
    copyToClipboard,
    triggerAutoSave
  } = usePasswordManager(initialEntries, masterPassword);

  function InlineField({
    field,
    value,
    placeholder,
    type = 'text',
    multiline = false,
    showEditButton = true
  }: {
    field: string;
    value: string;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
    showEditButton?: boolean;
  }) {
    const isEditing = editingField === field;

    if (isEditing) {
  return (
        <div className="flex items-center gap-2 flex-1">
          {multiline ? (
            <Textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[80px] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveInlineEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelInlineEdit();
                }
              }}
            />
          ) : (
            <Input
              type={type}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder={placeholder}
              className="text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveInlineEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelInlineEdit();
                }
              }}
            />
          )}
          <Button size="sm" onClick={saveInlineEdit} title="Save (Enter)">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={cancelInlineEdit} title="Cancel (Esc)">
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    const displayValue = field === 'password' && !isEditing ? '••••••••' : value;

    return (
      <div className="group flex items-center gap-2 flex-1">
        <span className="flex-1">
          {displayValue || (placeholder ? <span className="text-muted-foreground italic">{placeholder}</span> : '')}
        </span>
        {showEditButton && (
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => startInlineEdit(field, value)}
            title="Edit inline"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3" role="application" aria-label="Password Manager">
      <header className="flex items-center gap-2" role="toolbar" aria-label="Main toolbar">
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>Auto-saving...</span>
          </div>
        )}
        <div className="relative flex-1">
          <Input
            id="search-input"
            placeholder="Search passwords (⌘K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-8"
            aria-label="Search passwords"
            aria-describedby="search-help"
          />
          <div id="search-help" className="sr-only">
            Press Cmd+K to focus search, use arrow keys to navigate results, Enter to select
          </div>
          {q && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent"
              onClick={() => setQ('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const el = document.documentElement;
              if (el.classList.contains('dark')) {
                setTheme('light');
                window.localStorage.setItem('themePreference', 'light');
                toast({ title: 'Light theme' });
              } else {
                setTheme('dark');
                window.localStorage.setItem('themePreference', 'dark');
                toast({ title: 'Dark theme' });
              }
            }}
            title="Toggle theme (Shift+Click for quick toggle)"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </Button>
          <Button onClick={openAdd} title="Create new entry (⌘N)">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
          <Button
            onClick={handleSave}
            variant={hasUnsavedChanges ? "default" : "outline"}
            className={hasUnsavedChanges ? "animate-pulse" : ""}
            title={hasUnsavedChanges ? "Save changes (⌘S)" : "No changes to save"}
          >
            {hasUnsavedChanges ? "Save*" : "Save"}
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-3">
        {/* Column 1: Companies */}
        <section className="col-span-3" aria-labelledby="companies-heading">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle id="companies-heading" className="text-base">Companies</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!selectedCompany}
                  onClick={() => {
                    setRenameValue(selectedCompany || '');
                    setRenameOpen(true);
                  }}
                >
                  Rename
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y">
                {companies.map((c) => (
                  <button
                    key={c}
                    className={`text-left py-2 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      selectedCompany === c ? 'font-semibold bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => { setSelectedCompany(c); setSelectedEntryId(null); }}
                    aria-selected={selectedCompany === c}
                    role="option"
                  >
                    {c}
                  </button>
                ))}
                {companies.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <div className="text-lg mb-2">🏢</div>
                    <div>No companies yet</div>
                    <div className="text-xs mt-1">Create your first entry to get started</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Column 2: Logins for selected company */}
        <section className="col-span-4" aria-labelledby="logins-heading">
          <Card>
            <CardHeader>
              <CardTitle id="logins-heading" className="text-base">
                Logins {selectedCompany && `for ${selectedCompany}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y" role="listbox">
                {filteredLogins.map((e, idx) => {
                  const isSelected = selectedEntryId === e.id;
                  const isSearchSelected = q.trim() && idx === searchSelectedIndex;
                  return (
                  <button
                    key={e.id || `${e.name || 'item'}-${idx}`}
                      className={`text-left py-2 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        isSelected || isSearchSelected ? 'font-semibold bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        setSelectedEntryId(e.id);
                        if (q.trim()) setSearchSelectedIndex(idx);
                      }}
                      aria-selected={isSelected}
                      role="option"
                  >
                    {e.name}
                  </button>
                  );
                })}
                {filteredLogins.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    {q.trim() ? (
                      <>
                        <div className="text-lg mb-2">🔍</div>
                        <div>No results found</div>
                        <div className="text-xs mt-1">Try a different search term</div>
                      </>
                    ) : selectedCompany ? (
                      <>
                        <div className="text-lg mb-2">🔐</div>
                        <div>No logins for {selectedCompany}</div>
                        <div className="text-xs mt-1">Create a new entry to get started</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg mb-2">📝</div>
                        <div>No logins yet</div>
                        <div className="text-xs mt-1">Select a company or create your first entry</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Column 3: Fields for selected login */}
        <aside className="col-span-5" aria-labelledby="details-heading">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle id="details-heading" className="text-base">
                {selectedEntry?.name || 'Entry Details'}
              </CardTitle>
              {selectedEntry && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" title="Entry actions (⌘E to edit, ⌘D to delete)">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copy(selectedEntry.username, 'Username', `username-${selectedEntry.id}`)}>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy username
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copy(selectedEntry.password, 'Password', `password-${selectedEntry.id}`)}>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copy(selectedEntry.url || '', 'URL', `url-${selectedEntry.id}`)}>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateEntry(selectedEntry)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Duplicate entry (⌘⇧D)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(selectedEntry)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit (⌘E)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => remove(selectedEntry.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete (⌘D)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              {!selectedEntry && (
                <div className="text-sm text-muted-foreground text-center py-12">
                  <div className="text-2xl mb-3">👆</div>
                  <div className="font-medium mb-1">Select a login to view details</div>
                  <div className="text-xs">Use arrow keys to navigate, Enter to select</div>
                </div>
              )}
              {selectedEntry && (
                <div className="grid gap-2">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span>{' '}
                    <InlineField
                      field="company"
                      value={selectedEntry.company || ''}
                      placeholder="Unassigned"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Name:</span>{' '}
                    <InlineField
                      field="name"
                      value={selectedEntry.name || ''}
                      placeholder="Entry name"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Username:</span>{' '}
                    <div className="flex items-center gap-2">
                  <button
                        className={`flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          copiedFieldIds.has(`username-${selectedEntry.id}`)
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => copy(selectedEntry.username, 'Username', `username-${selectedEntry.id}`)}
                        title="Click to copy username (Space)"
                        tabIndex={0}
                      >
                        <InlineField
                          field="username"
                          value={selectedEntry.username || ''}
                          placeholder="Username"
                          showEditButton={false}
                        />
                        {copiedFieldIds.has(`username-${selectedEntry.id}`) && (
                          <span className="ml-2 text-xs opacity-70">✓</span>
                        )}
                  </button>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Password:</span>{' '}
                    <div className="flex items-center gap-2">
                  <button
                        className={`flex-1 text-left rounded px-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          copiedFieldIds.has(`password-${selectedEntry.id}`)
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => copy(selectedEntry.password, 'Password', `password-${selectedEntry.id}`)}
                        title="Click to copy password (Space)"
                        tabIndex={0}
                      >
                        <InlineField
                          field="password"
                          value={selectedEntry.password || ''}
                          placeholder="Password"
                          type="password"
                          showEditButton={false}
                        />
                        {copiedFieldIds.has(`password-${selectedEntry.id}`) && (
                          <span className="ml-2 text-xs opacity-70">✓</span>
                        )}
                  </button>
                            </div>
                          </div>
                  <div className="text-sm">
                    <span className="font-medium">URL:</span>{' '}
                    <InlineField
                      field="url"
                      value={selectedEntry.url || ''}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Notes:</span>
                    <div className="mt-1">
                      <InlineField
                        field="notes"
                        value={selectedEntry.notes || ''}
                        placeholder="Additional notes..."
                        multiline
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">Custom Fields</div>
                          <Button
                            variant="outline"
                            size="sm"
                        onClick={() => {
                          const nf: EntryField = { id: randomId(), label: '', type: 'text', value: '' };
                          const next = [...(selectedEntry.fields || []), nf];
                          const updatedEntry = { ...selectedEntry, fields: next };
                          setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                          triggerAutoSave();
                        }}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add field
                      </Button>
                    </div>
                    {(selectedEntry.fields && selectedEntry.fields.length > 0) && (
                      selectedEntry.fields!.map((f, idx) => (
                        <div key={f.id} className="rounded-md border p-3 grid gap-2">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={f.label}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const next = [...selectedEntry.fields!];
                                  next[idx] = { ...f, label: v };
                                  const updatedEntry = { ...selectedEntry, fields: next };
                                  setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                  triggerAutoSave();
                                }}
                                placeholder="Field label"
                                className="text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={f.type}
                                onValueChange={(v) => {
                                  const next = [...selectedEntry.fields!];
                                  next[idx] = { ...f, type: v as EntryField['type'] };
                                  const updatedEntry = { ...selectedEntry, fields: next };
                                  setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                  triggerAutoSave();
                                }}
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
                                  type={f.type === 'password' && !(revealedFieldIds as Set<string>).has(f.id) ? 'password' : 'text'}
                                  value={f.value}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const next = [...selectedEntry.fields!];
                                    next[idx] = { ...f, value: v };
                                    const updatedEntry = { ...selectedEntry, fields: next };
                                    setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                    triggerAutoSave();
                                  }}
                                  placeholder="Field value"
                                  className="text-sm"
                                />
                                {f.type === 'password' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const next = new Set(revealedFieldIds);
                                      if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                                      setRevealedFieldIds(next);
                                    }}
                                    title={(revealedFieldIds as Set<string>).has(f.id) ? 'Hide' : 'Show'}
                                  >
                                    {(revealedFieldIds as Set<string>).has(f.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copy(f.value, f.label || 'Field', `field-${f.id}`)}
                            title="Copy"
                                  className={`transition-all duration-200 ${
                                    copiedFieldIds.has(`field-${f.id}`)
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
                                onClick={() => {
                                  if (idx === 0) return;
                                  const next = [...selectedEntry.fields!];
                                  const [it] = next.splice(idx, 1);
                                  next.splice(idx - 1, 0, it);
                                  const updatedEntry = { ...selectedEntry, fields: next };
                                  setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                  triggerAutoSave();
                                }}
                                title="Move up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={idx === selectedEntry.fields!.length - 1}
                                onClick={() => {
                                  const next = [...selectedEntry.fields!];
                                  const [it] = next.splice(idx, 1);
                                  next.splice(idx + 1, 0, it);
                                  const updatedEntry = { ...selectedEntry, fields: next };
                                  setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                  triggerAutoSave();
                                }}
                                title="Move down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                const next = selectedEntry.fields!.filter(field => field.id !== f.id);
                                const updatedEntry = { ...selectedEntry, fields: next };
                                setEntries(prev => prev.map(e => e.id === selectedEntry.id ? { ...updatedEntry, updatedAt: Date.now() } : e));
                                const nextReveal = new Set(revealedFieldIds);
                                nextReveal.delete(f.id);
                                setRevealedFieldIds(nextReveal);
                                triggerAutoSave();
                              }}
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Live region for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {hasUnsavedChanges && "You have unsaved changes"}
        {Object.keys(copiedFieldIds).length > 0 && "Content copied to clipboard"}
      </div>

      <Dialog open={open} onOpenChange={(v) => {
        if (!v) { requestCloseEntryDialog(); } else { setOpen(true); }
      }}>
        <DialogContent role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <DialogHeader>
            <DialogTitle id="dialog-title">{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="url">URL</Label>
              <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Custom fields</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nf: EntryField = { id: randomId(), label: '', type: 'text', value: '' } as EntryField;
                    setForm({ ...(form as any), fields: [...(((form as any).fields) || []), nf] } as any);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add field
                </Button>
              </div>
              {(((form as any).fields) || []).length === 0 && (
                <div className="text-sm text-muted-foreground">No custom fields</div>
              )}
              {(((form as any).fields) || []).map((field: EntryField, idx: number) => (
                <div key={field.id} className="rounded-md border p-2 grid gap-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = [ ...(((form as any).fields) || []) ] as EntryField[];
                          next[idx] = { ...field, label: v };
                          setForm({ ...(form as any), fields: next } as any);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(v) => {
                          const next = [ ...(((form as any).fields) || []) ] as EntryField[];
                          next[idx] = { ...field, type: v as EntryField['type'] };
                          setForm({ ...(form as any), fields: next } as any);
                        }}
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
                          type={field.type === 'password' && !(revealedFieldIds as Set<string>).has(field.id) ? 'password' : 'text'}
                          value={field.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            const next = [ ...(((form as any).fields) || []) ] as EntryField[];
                            next[idx] = { ...field, value: v };
                            setForm({ ...(form as any), fields: next } as any);
                          }}
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const next = new Set(revealedFieldIds);
                              if (next.has(field.id)) next.delete(field.id); else next.add(field.id);
                              setRevealedFieldIds(next);
                            }}
                            title={(revealedFieldIds as Set<string>).has(field.id) ? 'Hide' : 'Show'}
                          >
                            {(revealedFieldIds as Set<string>).has(field.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        onClick={() => {
                          if (idx === 0) return;
                          const next = [ ...(((form as any).fields) || []) ] as EntryField[];
                          const [it] = next.splice(idx, 1);
                          next.splice(idx - 1, 0, it);
                          setForm({ ...(form as any), fields: next } as any);
                        }}
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === ((((form as any).fields) || []).length) - 1}
                        onClick={() => {
                          const next = [ ...(((form as any).fields) || []) ] as EntryField[];
                          const [it] = next.splice(idx, 1);
                          next.splice(idx + 1, 0, it);
                          setForm({ ...(form as any), fields: next } as any);
                        }}
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        const next = ((form as any).fields || []).filter((f: EntryField) => f.id !== field.id) as EntryField[];
                        setForm({ ...(form as any), fields: next } as any);
                        const nextReveal = new Set(revealedFieldIds);
                        nextReveal.delete(field.id);
                        setRevealedFieldIds(nextReveal);
                      }}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={requestCloseEntryDialog}>Cancel</Button>
            <Button onClick={applySave}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename company dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename company</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-company">New name</Label>
            <Input id="rename-company" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const from = selectedCompany || '';
              const to = (renameValue || '').trim() || 'Unassigned';
              if (!from) { setRenameOpen(false); return; }
              setEntries((prev) => prev.map((p) => ({ ...p, company: ((p.company || '').trim() || 'Unassigned') === from ? to : (p.company || '') })));
              setSelectedCompany(to);
              setRenameOpen(false);
              toast({ title: 'Company renamed' });
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard changes dialog */}
      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">You have unsaved changes. If you continue, your edits will be lost.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscardOpen(false)}>Keep editing</Button>
            <Button variant="destructive" onClick={() => { setConfirmDiscardOpen(false); setOpen(false); setEditing(null); }}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
