import { useState } from "react";
import { format } from "date-fns";
import { Download, Filter, ChevronDown, ChevronRight, Shield, Bot, User, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  useAuditLogs, 
  useAuditActionTypes, 
  useAuditEntityTypes,
  exportAuditLogsToCSV,
  type AuditLog,
  type AuditActorType,
  type AuditLogFilters
} from "@/hooks/useAuditLogs";
import { cn } from "@/lib/utils";

const ACTOR_ICONS: Record<AuditActorType, React.ReactNode> = {
  system: <Settings className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  teacher: <User className="h-4 w-4" />,
  ai_agent: <Bot className="h-4 w-4" />,
};

const ACTOR_COLORS: Record<AuditActorType, string> = {
  system: "bg-muted text-muted-foreground",
  admin: "bg-primary/10 text-primary",
  teacher: "bg-accent text-accent-foreground",
  ai_agent: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function AuditLogRow({ log }: { log: AuditLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMetadata = log.metadata && Object.keys(log.metadata as object).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b border-border/50 py-3 px-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", ACTOR_COLORS[log.actor_type])}>
            {ACTOR_ICONS[log.actor_type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {log.action.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {log.entity_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            
            <p className="text-sm mt-1 text-foreground">{log.summary}</p>
            
            {hasMetadata && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs">
                  {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  {isOpen ? "Hide details" : "Show details"}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="mt-3 ml-11 p-3 bg-muted/50 rounded-md">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { data: logs, isLoading } = useAuditLogs(filters);
  const { data: actionTypes } = useAuditActionTypes();
  const { data: entityTypes } = useAuditEntityTypes();

  const handleExportCSV = () => {
    if (!logs) return;
    const csv = exportAuditLogsToCSV(logs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              A complete record of all important actions for transparency and accountability
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportCSV}
              disabled={!logs?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {showFilters && (
        <div className="px-6 pb-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Actor Type</label>
              <Select
                value={filters.actorType || "all"}
                onValueChange={(v) => setFilters({ ...filters, actorType: v === "all" ? undefined : v as AuditActorType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actors</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="ai_agent">AI Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Action</label>
              <Select
                value={filters.action || "all"}
                onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionTypes?.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Entity Type</label>
              <Select
                value={filters.entityType || "all"}
                onValueChange={(v) => setFilters({ ...filters, entityType: v === "all" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityTypes?.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {filters.startDate ? format(filters.startDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => setFilters({ ...filters, startDate: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2"
            onClick={() => setFilters({})}
          >
            Clear filters
          </Button>
        </div>
      )}
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : logs?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm mt-1">Actions will appear here as they happen</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            {logs?.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
