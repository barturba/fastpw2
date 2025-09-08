import type { PasswordEntry } from '@/lib/ipc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CompanyListProps {
  entries: PasswordEntry[];
  selectedCompany: string | null;
  onCompanySelect: (company: string | null) => void;
  onRenameCompany: (company: string) => void;
}

export function CompanyList({ entries, selectedCompany, onCompanySelect, onRenameCompany }: CompanyListProps) {
  const companies = Array.from(new Set(
    entries
      .filter(e => e.id !== '__settings__')
      .map(e => (e.company || '').trim() || 'Unassigned')
  )).sort((a, b) => a.localeCompare(b));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Companies</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!selectedCompany}
            onClick={() => selectedCompany && onRenameCompany(selectedCompany)}
          >
            Rename
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y">
          {companies.map((company) => (
            <button
              key={company}
              className={`text-left py-2 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selectedCompany === company ? 'font-semibold bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => onCompanySelect(company)}
              aria-selected={selectedCompany === company}
              role="option"
            >
              {company}
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
  );
}
