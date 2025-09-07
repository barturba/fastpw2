import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ipc } from '@/lib/ipc';

export function LoginScreen({ onLoaded }: { onLoaded: (entries: any[], masterPassword: string) => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ipc.setWindowSize(520, 420, true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await ipc.loadData(password);
    setBusy(false);
    if (!res?.success) {
      toast({ title: 'Load failed', description: res?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    onLoaded(res.data || [], password);
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Unlock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Master password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={busy}>{busy ? 'Loading…' : 'Unlock'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
