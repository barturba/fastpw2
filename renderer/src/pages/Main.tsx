import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { type PasswordEntry } from '@/lib/ipc';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, Plus, Clipboard, Edit2, Trash2 } from 'lucide-react';

// Import our new components and hooks
import { EntryList } from '@/components/EntryList';
import { CompanyList } from '@/components/CompanyList';
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

  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);

  // Use our custom hook for state management
  const {
    entries,
    selectedCompany,
    selectedEntryId,
    selectedEntry,
    searchQuery,
    hasUnsavedChanges,
    filteredEntries,
    setSelectedCompany,
    setSelectedEntryId,
    handleSearchChange,
    handleSave,
    addEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
    copyToClipboard
  } = usePasswordManager(initialEntries, masterPassword);

  // Form state
  const [form, setForm] = useState({
    company: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });

  // Update form when editing entry changes
  useEffect(() => {
    if (editingEntry) {
      setForm({
        company: editingEntry.company || '',
        name: editingEntry.name || '',
        username: editingEntry.username || '',
        password: editingEntry.password || '',
        url: editingEntry.url || '',
        notes: editingEntry.notes || ''
      });
    } else {
      setForm({
        company: '',
        name: '',
        username: '',
        password: '',
        url: '',
        notes: ''
      });
    }
  }, [editingEntry]);

  // Handle form submission
  const handleFormSubmit = () => {
    if (editingEntry) {
      updateEntry(editingEntry.id, form);
    } else {
      addEntry(form);
    }
    setShowForm(false);
    setEditingEntry(null);
  };

  // Handle entry selection
  const handleEntrySelect = (entryId: string) => {
    setSelectedEntryId(entryId);
  };

  // Handle company selection
  const handleCompanySelect = (company: string | null) => {
    setSelectedCompany(company);
    setSelectedEntryId(null);
  };

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('themePreference', newTheme);
    toast({ title: `${newTheme === 'dark' ? 'Dark' : 'Light'} theme` });
  };


  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Password Manager</h1>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-orange-600 mt-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>

          <Button
            onClick={handleSave}
            variant={hasUnsavedChanges ? "default" : "outline"}
          >
            {hasUnsavedChanges ? "Save*" : "Save"}
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1"
        />
        {searchQuery && (
          <Button variant="outline" onClick={() => handleSearchChange('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Companies Column */}
        <div className="col-span-3">
          <CompanyList
            entries={entries}
            selectedCompany={selectedCompany}
            onCompanySelect={handleCompanySelect}
            onRenameCompany={() => {}}
          />
        </div>

        {/* Entries Column */}
        <div className="col-span-4">
          <EntryList
            entries={filteredEntries}
            selectedEntryId={selectedEntryId}
            onEntrySelect={handleEntrySelect}
            searchQuery={searchQuery}
            searchSelectedIndex={-1}
          />
        </div>

        {/* Entry Details Column */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>{selectedEntry?.name || 'Entry Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEntry ? (
                <div className="space-y-4">
                  <div>
                    <Label>Company</Label>
                    <p className="text-sm">{selectedEntry.company || 'Unassigned'}</p>
                  </div>
                  <div>
                    <Label>Username</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{selectedEntry.username || 'Not set'}</p>
                      {selectedEntry.username && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedEntry.username!, 'Username')}
                        >
                          <Clipboard className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">••••••••</p>
                      {selectedEntry.password && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedEntry.password!, 'Password')}
                        >
                          <Clipboard className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {selectedEntry.url && (
                    <div>
                      <Label>URL</Label>
                      <p className="text-sm">{selectedEntry.url}</p>
                    </div>
                  )}
                  {selectedEntry.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-sm">{selectedEntry.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingEntry(selectedEntry);
                        setShowForm(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateEntry(selectedEntry)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteEntry(selectedEntry.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Select an entry to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Entry Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Entry' : 'New Entry'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
              />
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Entry name"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
              />
            </div>

            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit}>
              {editingEntry ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
