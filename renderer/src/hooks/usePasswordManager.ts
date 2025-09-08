import { useState, useEffect, useMemo, useCallback } from 'react';
import { PasswordEntry, ipc } from '@/lib/ipc';
import { useToast } from '@/hooks/use-toast';

export function usePasswordManager(initialEntries: PasswordEntry[], masterPassword: string) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PasswordEntry[]>(initialEntries);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Computed values
  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.id === '__settings__') continue;
      set.add((e.company || '').trim() || 'Unassigned');
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.id === '__settings__') return false;
      const matchesCompany = !selectedCompany || ((e.company || '').trim() || 'Unassigned') === selectedCompany;
      const matchesQuery = !query || [e.name, e.username, e.url, e.notes]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(query));
      return matchesCompany && matchesQuery;
    });
  }, [entries, searchQuery, selectedCompany]);

  const selectedEntry = useMemo(() =>
    entries.find((e) => e.id === selectedEntryId && e.id !== '__settings__') || null,
    [entries, selectedEntryId]
  );

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(async () => {
      await handleSave();
      setHasUnsavedChanges(false);
    }, 2000);

    setAutoSaveTimeout(timeout);
  }, [autoSaveTimeout]);

  // Save functionality
  const handleSave = useCallback(async () => {
    // Inject settings entry with theme
    const withoutSettings = entries.filter((e) => e.id !== '__settings__');
    const settingsEntry: PasswordEntry = {
      id: '__settings__',
      name: '__settings__',
      notes: JSON.stringify({
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      })
    } as PasswordEntry;

    const payload = [settingsEntry, ...withoutSettings];

    const res = await ipc.saveData(payload, masterPassword);
    if (!res?.success) {
      toast({
        title: 'Save failed',
        description: res?.error || 'Unknown error',
        variant: 'destructive'
      });
      return;
    }
    toast({ title: 'Saved' });
    setEntries(payload);
    setHasUnsavedChanges(false);
  }, [entries, masterPassword, toast]);

  // Entry management
  const addEntry = useCallback((entryData: Omit<PasswordEntry, 'id' | 'updatedAt'>) => {
    const id = crypto.randomUUID();
    const newEntry: PasswordEntry = {
      ...entryData,
      id,
      updatedAt: Date.now()
    };
    setEntries(prev => [newEntry, ...prev]);
    setSelectedEntryId(newEntry.id);
    if (!selectedCompany) {
      setSelectedCompany((entryData.company || '').trim() || 'Unassigned');
    }
    triggerAutoSave();
    toast({ title: 'Entry added' });
  }, [selectedCompany, triggerAutoSave, toast]);

  const updateEntry = useCallback((entryId: string, updates: Partial<PasswordEntry>) => {
    setEntries(prev => prev.map(entry =>
      entry.id === entryId
        ? { ...entry, ...updates, updatedAt: Date.now() }
        : entry
    ));
    triggerAutoSave();
    toast({ title: 'Entry updated' });
  }, [triggerAutoSave, toast]);

  const deleteEntry = useCallback((entryId: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== entryId));
    if (selectedEntryId === entryId) {
      setSelectedEntryId(null);
    }
    triggerAutoSave();
    toast({ title: 'Entry deleted' });
  }, [selectedEntryId, triggerAutoSave, toast]);

  const duplicateEntry = useCallback((entry: PasswordEntry) => {
    const duplicatedEntry: PasswordEntry = {
      ...entry,
      id: crypto.randomUUID(),
      name: `${entry.name} (Copy)`,
      updatedAt: Date.now(),
    };
    setEntries(prev => [duplicatedEntry, ...prev]);
    setSelectedEntryId(duplicatedEntry.id);
    triggerAutoSave();
    toast({ title: 'Entry duplicated' });
  }, [triggerAutoSave, toast]);

  // Search and navigation
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSearchSelectedIndex(-1);
    if (query.trim()) {
      const matchingEntries = filteredEntries;
      if (matchingEntries.length > 0) {
        setSelectedEntryId(matchingEntries[0].id);
        setSelectedCompany(null);
      }
    }
  }, [filteredEntries]);

  // Copy functionality
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch (e) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  }, [toast]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  return {
    // State
    entries,
    selectedCompany,
    selectedEntryId,
    selectedEntry,
    searchQuery,
    searchSelectedIndex,
    hasUnsavedChanges,
    companies,
    filteredEntries,

    // Actions
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
  };
}
