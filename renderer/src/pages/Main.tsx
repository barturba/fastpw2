import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ipc, type PasswordEntry, type EntryField } from '@/lib/ipc';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, Trash2, Clipboard, Sun, Moon } from 'lucide-react';

export function MainScreen({
  initialEntries,
  masterPassword,
}: {
  initialEntries: PasswordEntry[];
  masterPassword: string;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PasswordEntry[]>(initialEntries || []);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const local = (typeof window !== 'undefined' && window.localStorage.getItem('themePreference')) as 'light' | 'dark' | null;
    return local || 'light';
  });
  const [q, setQ] = useState('');

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PasswordEntry | null>(null);
  const [form, setForm] = useState<Required<Omit<PasswordEntry, 'updatedAt'>>>({
    id: '',
    company: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    fields: [] as any,
  } as any);

  const [revealedFieldIds, setRevealedFieldIds] = useState<Set<string>>(new Set());

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  useEffect(() => {
    ipc.setWindowSize(980, 680, true);
  }, []);

  useEffect(() => {
    // Apply theme on mount and whenever it changes
    const el = document.documentElement;
    if (theme === 'dark') el.classList.add('dark'); else el.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    // Load theme from settings entry in initial entries
    const settings = (initialEntries || []).find((e) => e.id === '__settings__');
    if (settings?.notes) {
      try {
        const json = JSON.parse(settings.notes as string) as { theme?: 'light' | 'dark' };
        if (json?.theme === 'dark' || json?.theme === 'light') {
          setTheme(json.theme);
          window.localStorage.setItem('themePreference', json.theme);
        }
      } catch {}
    }
  }, [initialEntries]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openAdd();
      } else if (isMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, entries, masterPassword]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.id === '__settings__') continue;
      set.add((e.company || '').trim() || 'Unassigned');
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredLogins = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.id === '__settings__') return false;
      const matchesCompany = !selectedCompany || ((e.company || '').trim() || 'Unassigned') === selectedCompany;
      const matchesQuery = !query || [e.name, e.username, e.url, e.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(query));
      return matchesCompany && matchesQuery;
    });
  }, [entries, q, selectedCompany]);

  const selectedEntry = useMemo(() => entries.find((e) => e.id === selectedEntryId && e.id !== '__settings__') || null, [entries, selectedEntryId]);

  function randomId() {
    try { return crypto.randomUUID(); } catch { return String(Date.now()) + Math.random().toString(16).slice(2); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ id: '', company: selectedCompany || '', name: '', username: '', password: '', url: '', notes: '', fields: [] } as any);
    setRevealedFieldIds(new Set());
    setOpen(true);
  }

  function openEdit(e: PasswordEntry) {
    setEditing(e);
    setForm({
      id: e.id,
      company: e.company || '',
      name: e.name || '',
      username: e.username || '',
      password: e.password || '',
      url: e.url || '',
      notes: e.notes || '',
      fields: (e.fields || []) as any,
    } as any);
    setRevealedFieldIds(new Set());
    setOpen(true);
  }

  function fieldsEqual(a?: EntryField[], b?: EntryField[]): boolean {
    const aa = (a || []).map((f) => ({ id: f.id, label: f.label, type: f.type, value: f.value }));
    const bb = (b || []).map((f) => ({ id: f.id, label: f.label, type: f.type, value: f.value }));
    return JSON.stringify(aa) === JSON.stringify(bb);
  }

  function computeDirty(): boolean {
    if (editing) {
      return (
        (editing.company || '') !== form.company ||
        (editing.name || '') !== form.name ||
        (editing.username || '') !== form.username ||
        (editing.password || '') !== form.password ||
        (editing.url || '') !== form.url ||
        (editing.notes || '') !== form.notes ||
        !fieldsEqual(editing.fields, (form as any).fields)
      );
    }
    return !!(form.company || form.name || form.username || form.password || form.url || form.notes || ((form as any).fields?.length > 0));
  }

  function requestCloseEntryDialog() {
    if (computeDirty()) {
      setConfirmDiscardOpen(true);
    } else {
      setOpen(false);
      setEditing(null);
    }
  }

  function applySave() {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    if (editing) {
      setEntries((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...form, updatedAt: Date.now() } : p)));
    } else {
      const id = randomId();
      setEntries((prev) => [{ ...form, id, updatedAt: Date.now() }, ...prev]);
    }
    if (!selectedCompany) setSelectedCompany((form.company || '').trim() || 'Unassigned');
    setOpen(false);
    setEditing(null);
  }

  async function handleSave() {
    // Inject settings entry with theme
    const withoutSettings = entries.filter((e) => e.id !== '__settings__');
    const settingsEntry: PasswordEntry = { id: '__settings__', name: '__settings__', notes: JSON.stringify({ theme }) } as PasswordEntry;
    const payload = [settingsEntry, ...withoutSettings];

    const res = await ipc.saveData(payload, masterPassword);
    if (!res?.success) {
      toast({ title: 'Save failed', description: res?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
    setEntries(payload);
  }

  async function copy(text?: string, label?: string) {
    try {
      await navigator.clipboard.writeText(text || '');
      toast({ title: `${label || 'Value'} copied` });
    } catch (e) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  }

  function remove(id: string) {
    setEntries((prev) => prev.filter((p) => p.id !== id));
    if (selectedEntryId === id) setSelectedEntryId(null);
    toast({ title: 'Deleted' });
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
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
            title="Toggle theme"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </Button>
          <Button onClick={openAdd}>New</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Column 1: Companies */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Companies</CardTitle>
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
                    className={`text-left py-2 ${selectedCompany === c ? 'font-semibold' : ''}`}
                    onClick={() => { setSelectedCompany(c); setSelectedEntryId(null); }}
                  >
                    {c}
                  </button>
                ))}
                {companies.length === 0 && (
                  <div className="text-sm text-muted-foreground">No companies</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Logins for selected company */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y">
                {filteredLogins.map((e, idx) => (
                  <button
                    key={e.id || `${e.name || 'item'}-${idx}`}
                    className={`text-left py-2 ${selectedEntryId === e.id ? 'font-semibold' : ''}`}
                    onClick={() => setSelectedEntryId(e.id)}
                  >
                    {e.name}
                  </button>
                ))}
                {filteredLogins.length === 0 && (
                  <div className="text-sm text-muted-foreground">No logins</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Fields for selected login */}
        <div className="col-span-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{selectedEntry?.name || 'Details'}</CardTitle>
              {selectedEntry && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copy(selectedEntry.username, 'Username')}>Copy username</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copy(selectedEntry.password, 'Password')}>Copy password</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(selectedEntry)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(selectedEntry.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              {!selectedEntry && (
                <div className="text-sm text-muted-foreground">Select a login to view its fields</div>
              )}
              {selectedEntry && (
                <div className="grid gap-2">
                  <div className="text-sm"><span className="font-medium">Company:</span> {selectedEntry.company || 'Unassigned'}</div>
                  <button
                    className="text-left text-sm hover:bg-accent rounded px-1"
                    onClick={() => copy(selectedEntry.username, 'Username')}
                    title="Click to copy username"
                  >
                    <span className="font-medium">Username:</span> {selectedEntry.username || ''}
                  </button>
                  <button
                    className="text-left text-sm hover:bg-accent rounded px-1"
                    onClick={() => copy(selectedEntry.password, 'Password')}
                    title="Click to copy password"
                  >
                    <span className="font-medium">Password:</span> {selectedEntry.password ? '••••••••' : ''}
                  </button>
                  <div className="text-sm"><span className="font-medium">URL:</span> {selectedEntry.url || ''}</div>
                  <div className="text-sm whitespace-pre-wrap"><span className="font-medium">Notes:</span> {selectedEntry.notes || ''}</div>
                  {(selectedEntry.fields && selectedEntry.fields.length > 0) && (
                    <div className="mt-2 grid gap-2">
                      <div className="font-medium text-sm">Fields</div>
                      {selectedEntry.fields!.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{f.label || '(No label)'}</div>
                            <div className="text-muted-foreground truncate">
                              {f.type === 'password' ? '••••••••' : f.value}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copy(f.value, f.label || 'Field')}
                            title="Copy"
                          >
                            <Clipboard className="w-4 h-4" />
                            Copy
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => {
        if (!v) { requestCloseEntryDialog(); } else { setOpen(true); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
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
                >
                  <Plus className="w-4 h-4" /> Add field
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
