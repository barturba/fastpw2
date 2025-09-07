import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ipc, type PasswordEntry } from '@/lib/ipc';
import { useToast } from '@/hooks/use-toast';

export function MainScreen({
  initialEntries,
  masterPassword,
}: {
  initialEntries: PasswordEntry[];
  masterPassword: string;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PasswordEntry[]>(initialEntries || []);
  const [q, setQ] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PasswordEntry | null>(null);
  const [form, setForm] = useState<Required<Omit<PasswordEntry, 'updatedAt'>>>({
    id: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  });

  useEffect(() => {
    ipc.setWindowSize(800, 600, true);
  }, []);

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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((e) =>
      [e.name, e.username, e.url, e.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(query))
    );
  }, [entries, q]);

  function randomId() {
    try { return crypto.randomUUID(); } catch { return String(Date.now()) + Math.random().toString(16).slice(2); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ id: '', name: '', username: '', password: '', url: '', notes: '' });
    setOpen(true);
  }

  function openEdit(e: PasswordEntry) {
    setEditing(e);
    setForm({
      id: e.id,
      name: e.name || '',
      username: e.username || '',
      password: e.password || '',
      url: e.url || '',
      notes: e.notes || '',
    });
    setOpen(true);
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
    setOpen(false);
    setEditing(null);
  }

  async function handleSave() {
    const res = await ipc.saveData(entries, masterPassword);
    if (!res?.success) {
      toast({ title: 'Save failed', description: res?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
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
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={openAdd}>New</Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
      <div className="grid gap-2">
        {filtered.map((e, idx) => (
          <Card key={e.id || `${e.name || 'item'}-${idx}` }>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{e.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copy(e.username, 'Username')}>Copy user</Button>
                <Button variant="outline" onClick={() => copy(e.password, 'Password')}>Copy pass</Button>
                <Button variant="secondary" onClick={() => openEdit(e)}>Edit</Button>
                <Button variant="destructive" onClick={() => remove(e.id)}>Delete</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {e.username || ''} {e.url ? `• ${e.url}` : ''}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="text-sm text-muted-foreground">No entries yet</div>
              <Button onClick={openAdd}>Add your first entry</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit entry' : 'New entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={applySave}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
