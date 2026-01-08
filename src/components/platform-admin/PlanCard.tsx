import { Plan, PLAN_FEATURE_KEYS, PLAN_AI_LIMIT_KEYS } from '@/hooks/usePlanManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  Edit, 
  Archive, 
  RotateCcw, 
  Users, 
  GraduationCap,
  Infinity,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onArchive: (plan: Plan) => void;
  onRestore: (plan: Plan) => void;
}

const FEATURE_LABELS: Record<string, string> = {
  upload_analysis: 'Upload Analysis',
  ai_insights: 'AI Insights',
  parent_insights: 'Parent Insights',
  learning_paths: 'Learning Paths',
  adaptive_support: 'Adaptive Support',
  priority_support: 'Priority Support',
  custom_integrations: 'Custom Integrations',
};

const AI_LIMIT_LABELS: Record<string, string> = {
  uploads_analyzed: 'Uploads/mo',
  ai_generations: 'AI Generations/mo',
  parent_insights: 'Parent Insights/mo',
  adaptive_support_plans: 'Support Plans/mo',
};

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return 'Custom';
  if (amount === 0) return 'Free';
  
  const currencySymbol = currency === 'ZMW' ? 'K' : '$';
  return `${currencySymbol}${amount.toLocaleString()}`;
}

function formatLimit(value: number | null): string | React.ReactNode {
  if (value === null || value === -1) {
    return <Infinity className="h-4 w-4 inline" />;
  }
  if (value === 0) return '0';
  return value.toLocaleString();
}

export function PlanCard({ plan, onEdit, onArchive, onRestore }: PlanCardProps) {
  const isEnterprise = plan.name === 'enterprise';
  const isPro = plan.name === 'pro';
  
  return (
    <Card className={cn(
      'relative transition-all',
      !plan.is_active && 'opacity-60 border-dashed',
      isPro && 'ring-2 ring-primary',
    )}>
      {/* Status Badge */}
      {!plan.is_active && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 bg-muted text-muted-foreground"
        >
          Archived
        </Badge>
      )}
      
      {isPro && (
        <Badge 
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Popular
        </Badge>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.display_name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {plan.name}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatPrice(plan.price_monthly, plan.currency)}
            </div>
            {plan.price_monthly !== null && plan.price_monthly > 0 && (
              <div className="text-xs text-muted-foreground">/month</div>
            )}
          </div>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Limits */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span>{formatLimit(plan.max_students)} students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{formatLimit(plan.max_teachers)} teachers</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Features
          </h4>
          <div className="grid grid-cols-1 gap-1">
            {PLAN_FEATURE_KEYS.map((key) => {
              const enabled = plan.features?.[key] ?? false;
              return (
                <div 
                  key={key} 
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    !enabled && 'text-muted-foreground'
                  )}
                >
                  {enabled ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  <span>{FEATURE_LABELS[key] ?? key}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Limits */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            AI Usage Limits
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {PLAN_AI_LIMIT_KEYS.map((key) => {
              const limit = plan.ai_limits?.[key] ?? 0;
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {AI_LIMIT_LABELS[key]?.split('/')[0] ?? key}
                  </span>
                  <span className="font-medium">{formatLimit(limit)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(plan)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          {plan.is_active ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onArchive(plan)}
              disabled={isEnterprise}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRestore(plan)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
