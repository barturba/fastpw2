import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ipc, type PasswordEntry } from '@/lib/ipc';
import { Button as UIButton } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export function LoginScreen({ onLoaded }: { onLoaded: (entries: PasswordEntry[], masterPassword: string) => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ipc.setWindowSize(520, 420, true);
  }, []);

  useEffect(() => {
    // Apply stored theme early
    try {
      const pref = window.localStorage.getItem('themePreference');
      const el = document.documentElement;
      if (pref === 'dark') el.classList.add('dark'); else el.classList.remove('dark');
    } catch {
      // Ignore localStorage errors
    }
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
      <div className="flex justify-end mb-2">
        <UIButton
          variant="outline"
          size="icon"
          onClick={() => {
            const el = document.documentElement;
            if (el.classList.contains('dark')) {
              el.classList.remove('dark');
              window.localStorage.setItem('themePreference', 'light');
            } else {
              el.classList.add('dark');
              window.localStorage.setItem('themePreference', 'dark');
            }
          }}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 dark:hidden" />
        </UIButton>
      </div>
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
