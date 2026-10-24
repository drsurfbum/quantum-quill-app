import { Inbox } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
export function FeedbackInboxLink({compact=false}:{compact?:boolean}) {
  const {user}=useAuth();
  return user?.feedbackAdmin ? <a href="/admin/feedback" target="_blank" rel="noopener noreferrer" aria-label="Admin feedback inbox (opens in a new tab)" title="Admin feedback inbox" className="inline-flex items-center gap-2 rounded px-2 py-2 text-sm text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Inbox className="h-4 w-4"/>{!compact&&"Admin inbox ↗"}</a> : null;
}
