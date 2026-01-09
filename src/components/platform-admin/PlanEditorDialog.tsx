import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plan, PLAN_FEATURE_KEYS, PLAN_AI_LIMIT_KEYS, useCreatePlan, useUpdatePlan, calculateTermlyPrice, calculateAnnualPrice, BILLING_DISCOUNTS } from '@/hooks/usePlanManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  upload_analysis: { label: 'Upload Analysis', description: 'Analyze uploaded student work' },
  ai_insights: { label: 'AI Insights', description: 'AI-generated class insights' },
  parent_insights: { label: 'Parent Insights', description: 'Generate parent communication' },
  learning_paths: { label: 'Learning Paths', description: 'Personalized learning journeys' },
  adaptive_support: { label: 'Adaptive Support', description: 'AI support plans for students' },
  priority_support: { label: 'Priority Support', description: '24/7 priority customer support' },
  custom_integrations: { label: 'Custom Integrations', description: 'Third-party API integrations' },
};

const AI_LIMIT_LABELS: Record<string, string> = {
  uploads_analyzed: 'Uploads Analyzed per Month',
  ai_generations: 'AI Generations per Month',
  parent_insights: 'Parent Insights per Month',
  adaptive_support_plans: 'Adaptive Support Plans per Month',
};

const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').regex(/^[a-z_]+$/, 'Name must be lowercase with underscores only'),
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  description: z.string().optional(),
  price_monthly: z.coerce.number().min(0).nullable(),
  price_termly: z.coerce.number().min(0).nullable(),
  price_annual: z.coerce.number().min(0).nullable(),
  auto_calculate_discounts: z.boolean(),
  currency: z.enum(['ZMW', 'USD']),
  max_students: z.coerce.number().min(-1).nullable(),
  max_teachers: z.coerce.number().min(-1).nullable(),
  features: z.record(z.boolean()),
  ai_limits: z.record(z.number()),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface PlanEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
}

export function PlanEditorDialog({ open, onOpenChange, plan }: PlanEditorDialogProps) {
  const isEditing = !!plan;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      display_name: '',
      description: '',
      price_monthly: null,
      price_termly: null,
      price_annual: null,
      auto_calculate_discounts: true,
      currency: 'ZMW',
      max_students: null,
      max_teachers: null,
      features: Object.fromEntries(PLAN_FEATURE_KEYS.map(k => [k, false])),
      ai_limits: Object.fromEntries(PLAN_AI_LIMIT_KEYS.map(k => [k, 0])),
    },
  });

  const watchMonthly = form.watch('price_monthly');
  const watchAutoCalc = form.watch('auto_calculate_discounts');

  // Auto-calculate termly and annual prices when monthly changes
  useEffect(() => {
    if (watchAutoCalc && watchMonthly && watchMonthly > 0) {
      form.setValue('price_termly', calculateTermlyPrice(watchMonthly));
      form.setValue('price_annual', calculateAnnualPrice(watchMonthly));
    }
  }, [watchMonthly, watchAutoCalc, form]);

  // Populate form when editing
  useEffect(() => {
    if (plan) {
      const hasCustomPricing = plan.price_monthly && plan.price_termly && 
        plan.price_termly !== calculateTermlyPrice(plan.price_monthly);
      
      form.reset({
        name: plan.name,
        display_name: plan.display_name,
        description: plan.description ?? '',
        price_monthly: plan.price_monthly,
        price_termly: plan.price_termly,
        price_annual: plan.price_annual,
        auto_calculate_discounts: !hasCustomPricing,
        currency: plan.currency as 'ZMW' | 'USD',
        max_students: plan.max_students,
        max_teachers: plan.max_teachers,
        features: { ...Object.fromEntries(PLAN_FEATURE_KEYS.map(k => [k, false])), ...plan.features },
        ai_limits: { ...Object.fromEntries(PLAN_AI_LIMIT_KEYS.map(k => [k, 0])), ...plan.ai_limits },
      });
    } else {
      form.reset({
        name: '',
        display_name: '',
        description: '',
        price_monthly: null,
        price_termly: null,
        price_annual: null,
        auto_calculate_discounts: true,
        currency: 'ZMW',
        max_students: null,
        max_teachers: null,
        features: Object.fromEntries(PLAN_FEATURE_KEYS.map(k => [k, false])),
        ai_limits: Object.fromEntries(PLAN_AI_LIMIT_KEYS.map(k => [k, 0])),
      });
    }
  }, [plan, form]);

  const onSubmit = async (values: PlanFormValues) => {
    try {
      if (isEditing && plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          display_name: values.display_name,
          description: values.description || null,
          price_monthly: values.price_monthly,
          price_termly: values.price_termly,
          price_annual: values.price_annual,
          currency: values.currency,
          max_students: values.max_students,
          max_teachers: values.max_teachers,
          features: values.features,
          ai_limits: values.ai_limits,
        });
      } else {
        await createPlan.mutateAsync({
          name: values.name,
          display_name: values.display_name,
          description: values.description,
          price_monthly: values.price_monthly ?? undefined,
          price_termly: values.price_termly ?? undefined,
          price_annual: values.price_annual ?? undefined,
          currency: values.currency,
          max_students: values.max_students ?? undefined,
          max_teachers: values.max_teachers ?? undefined,
          features: values.features,
          ai_limits: values.ai_limits,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the plan details, features, and pricing.'
              : 'Create a new subscription plan with features and pricing.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., starter" 
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormDescription>Lowercase, no spaces</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Starter Plan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Brief description of the plan..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Pricing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Pricing</h4>
                <FormField
                  control={form.control}
                  name="auto_calculate_discounts"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-xs text-muted-foreground font-normal">
                        Auto-calculate discounts
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {watchAutoCalc && (
                <p className="text-xs text-muted-foreground mb-3">
                  Termly: {Math.round(BILLING_DISCOUNTS.termly * 100)}% off • Annual: {Math.round(BILLING_DISCOUNTS.annual * 100)}% off (calculated from monthly)
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ZMW">ZMW (Kwacha)</SelectItem>
                          <SelectItem value="USD">USD (Dollar)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="0 for free"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_termly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Termly Price
                        {watchAutoCalc && <span className="text-xs text-green-600 ml-1">(10% off)</span>}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="~4 months"
                          disabled={watchAutoCalc}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Per term (~4 months)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_annual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Annual Price
                        {watchAutoCalc && <span className="text-xs text-green-600 ml-1">(20% off)</span>}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="12 months"
                          disabled={watchAutoCalc}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Per year (12 months)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Limits */}
            <div>
              <h4 className="text-sm font-medium mb-3">Usage Limits</h4>
              <p className="text-xs text-muted-foreground mb-3">Use -1 for unlimited, leave empty for no limit</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Students</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="-1 for unlimited"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_teachers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Teachers</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="-1 for unlimited"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div>
              <h4 className="text-sm font-medium mb-3">Features</h4>
              <div className="grid grid-cols-2 gap-3">
                {PLAN_FEATURE_KEYS.map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`features.${key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-normal">
                            {FEATURE_LABELS[key]?.label ?? key}
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {FEATURE_LABELS[key]?.description}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* AI Limits */}
            <div>
              <h4 className="text-sm font-medium mb-3">AI Usage Limits</h4>
              <p className="text-xs text-muted-foreground mb-3">Use -1 for unlimited, 0 to disable</p>
              <div className="grid grid-cols-2 gap-4">
                {PLAN_AI_LIMIT_KEYS.map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`ai_limits.${key}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{AI_LIMIT_LABELS[key]}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value} 
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
