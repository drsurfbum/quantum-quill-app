import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{tags.map(tag => <Badge key={tag} variant="secondary">
      {tag}<Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" aria-label={`Remove tag ${tag}`} onClick={() => onChange(tags.filter(value => value !== tag))}><X className="h-3 w-3" /></Button>
    </Badge>)}</div>
    <div className="flex gap-2"><Input aria-label="New tag" placeholder="Add tag..." value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} />
      <Button variant="outline" size="sm" disabled={!draft.trim()} onClick={add}>Add tag</Button></div>
  </div>;
}
