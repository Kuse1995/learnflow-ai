import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Phone, 
  Printer, 
  MessageCircle, 
  Clock,
  Bell 
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useStudentReminderHistory, 
  formatBalance,
  DELIVERY_METHODS,
  ReminderLog 
} from '@/hooks/useFeeReminders';

interface ReminderHistoryProps {
  studentId: string;
  currency?: string;
  maxItems?: number;
  showTitle?: boolean;
}

const DeliveryIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'in_person': return <Users className="h-4 w-4 text-blue-600" />;
    case 'phone_call': return <Phone className="h-4 w-4 text-green-600" />;
    case 'printed_notice': return <Printer className="h-4 w-4 text-orange-600" />;
    case 'whatsapp_manual': return <MessageCircle className="h-4 w-4 text-emerald-600" />;
    default: return <Bell className="h-4 w-4" />;
  }
};

const getDeliveryLabel = (method: string): string => {
  return DELIVERY_METHODS.find(m => m.value === method)?.label || method;
};

function ReminderItem({ reminder, currency }: { reminder: ReminderLog; currency: string }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <DeliveryIcon method={reminder.sent_via} />
          <div>
            <p className="text-sm font-medium">
              {getDeliveryLabel(reminder.sent_via)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(reminder.sent_at), 'dd MMM yyyy, h:mm a')}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Balance: {formatBalance(reminder.ledger_balance_snapshot, currency)}
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground">
        {reminder.term && (
          <span>Term {reminder.term}, {reminder.academic_year}</span>
        )}
        {!reminder.term && (
          <span>{reminder.academic_year}</span>
        )}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline"
      >
        {expanded ? 'Hide message' : 'View message'}
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-muted/50 rounded text-sm whitespace-pre-wrap">
          {reminder.final_message}
        </div>
      )}
    </div>
  );
}

export function ReminderHistory({ 
  studentId, 
  currency = 'ZMW',
  maxItems,
  showTitle = true 
}: ReminderHistoryProps) {
  const { data: reminders = [], isLoading } = useStudentReminderHistory(studentId);

  const displayReminders = maxItems ? reminders.slice(0, maxItems) : reminders;

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Reminder History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder History
            {reminders.length > 0 && (
              <Badge variant="secondary">{reminders.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No reminders have been sent yet.
          </p>
        ) : (
          <ScrollArea className={maxItems ? 'max-h-[400px]' : ''}>
            <div className="space-y-3">
              {displayReminders.map((reminder) => (
                <ReminderItem 
                  key={reminder.id} 
                  reminder={reminder} 
                  currency={currency} 
                />
              ))}
              {maxItems && reminders.length > maxItems && (
                <p className="text-xs text-muted-foreground text-center">
                  +{reminders.length - maxItems} more reminders
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
