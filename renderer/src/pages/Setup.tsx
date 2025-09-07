import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ipc } from '@/lib/ipc';

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ipc.setWindowSize(520, 420, true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const res = await ipc.setMasterPassword(password);
    setBusy(false);
    if (!res?.success) {
      toast({ title: 'Failed to set master password', description: res?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    toast({ title: 'Master password set' });
    onDone();
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Set Master Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Master password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpw">Confirm password</Label>
              <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
