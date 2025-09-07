import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    ipc.setWindowSize(800, 600, true);
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((e) =>
      [e.name, e.username, e.url, e.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(query))
    );
  }, [entries, q]);

  async function handleSave() {
    const res = await ipc.saveData(entries, masterPassword);
    if (!res?.success) {
      toast({ title: 'Save failed', description: res?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved' });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={handleSave}>Save</Button>
      </div>
      <div className="grid gap-2">
        {filtered.map((e) => (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle className="text-base">{e.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {e.username || ''} {e.url ? `• ${e.url}` : ''}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No items</div>
        )}
      </div>
    </div>
  );
}
