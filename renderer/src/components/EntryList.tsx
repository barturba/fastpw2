import { PasswordEntry } from '@/lib/ipc';

interface EntryListProps {
  entries: PasswordEntry[];
  selectedEntryId: string | null;
  onEntrySelect: (entryId: string) => void;
  searchQuery?: string;
  searchSelectedIndex?: number;
}

export function EntryList({ entries, selectedEntryId, onEntrySelect, searchQuery, searchSelectedIndex }: EntryListProps) {
  const filteredEntries = entries.filter(e => e.id !== '__settings__');

  if (filteredEntries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        {searchQuery ? (
          <>
            <div className="text-lg mb-2">🔍</div>
            <div>No results found</div>
            <div className="text-xs mt-1">Try a different search term</div>
          </>
        ) : (
          <>
            <div className="text-lg mb-2">📝</div>
            <div>No logins yet</div>
            <div className="text-xs mt-1">Create your first entry to get started</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y" role="listbox">
      {filteredEntries.map((entry, idx) => {
        const isSelected = selectedEntryId === entry.id;
        const isSearchSelected = searchQuery && idx === searchSelectedIndex;
        return (
          <button
            key={entry.id || `${entry.name || 'item'}-${idx}`}
            className={`text-left py-2 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              isSelected || isSearchSelected ? 'font-semibold bg-accent' : 'hover:bg-accent/50'
            }`}
            onClick={() => onEntrySelect(entry.id)}
            aria-selected={isSelected}
            role="option"
          >
            {entry.name}
          </button>
        );
      })}
    </div>
  );
}
