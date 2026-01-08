/**
 * Message Template Hooks
 * 
 * React hooks for working with message templates and language validation
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageTemplate,
  TemplateCategory,
  ValidationResult,
  STANDARD_TEMPLATES,
  LANGUAGE_GUIDELINES,
  validateMessage,
  sanitizeMessage,
  renderTemplate,
  getTemplate,
  getTemplatesByCategory,
  getApprovedTemplates,
  APPROVED_OPENINGS,
  APPROVED_CLOSINGS,
  APPROVED_ACTION_PHRASES,
  ALL_FORBIDDEN_PHRASES,
} from '@/lib/message-template-standards';

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

/**
 * Get all approved templates
 */
export function useApprovedTemplates() {
  return useQuery({
    queryKey: ['approved-templates'],
    queryFn: () => getApprovedTemplates(),
    staleTime: Infinity, // Templates don't change often
  });
}

/**
 * Get templates by category
 */
export function useTemplatesByCategory(category: TemplateCategory) {
  return useQuery({
    queryKey: ['templates-by-category', category],
    queryFn: () => getTemplatesByCategory(category),
    staleTime: Infinity,
  });
}

/**
 * Get a single template by ID
 */
export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId),
    staleTime: Infinity,
    enabled: !!templateId,
  });
}

// ============================================================================
// TEMPLATE RENDERING HOOK
// ============================================================================

interface UseTemplateRenderResult {
  subject: string;
  body: string;
  valid: boolean;
  missingVars: string[];
  setVariable: (key: string, value: string) => void;
  variables: Record<string, string>;
  resetVariables: () => void;
}

/**
 * Hook for rendering a template with variables
 */
export function useTemplateRender(templateId: string): UseTemplateRenderResult {
  const { data: template } = useTemplate(templateId);
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  const setVariable = useCallback((key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const resetVariables = useCallback(() => {
    setVariables({});
  }, []);
  
  const rendered = useMemo(() => {
    if (!template) {
      return { subject: '', body: '', valid: false, missingVars: [] };
    }
    return renderTemplate(template, variables);
  }, [template, variables]);
  
  return {
    ...rendered,
    setVariable,
    variables,
    resetVariables,
  };
}

// ============================================================================
// VALIDATION HOOKS
// ============================================================================

interface UseMessageValidationResult {
  validation: ValidationResult | null;
  isValid: boolean;
  score: number;
  errorCount: number;
  warningCount: number;
  validate: (text: string) => ValidationResult;
}

/**
 * Hook for validating message content
 */
export function useMessageValidation(
  options?: {
    maxSentenceWords?: number;
    maxLength?: number;
    requireGreeting?: boolean;
    requireClosing?: boolean;
  }
): UseMessageValidationResult {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  
  const validate = useCallback((text: string) => {
    const result = validateMessage(text, options);
    setValidation(result);
    return result;
  }, [options]);
  
  return {
    validation,
    isValid: validation?.valid ?? false,
    score: validation?.score ?? 100,
    errorCount: validation?.issues.filter(i => i.severity === 'error').length ?? 0,
    warningCount: validation?.issues.filter(i => i.severity === 'warning').length ?? 0,
    validate,
  };
}

/**
 * Hook for real-time message validation as user types
 */
export function useLiveValidation(
  text: string,
  options?: {
    maxSentenceWords?: number;
    maxLength?: number;
    requireGreeting?: boolean;
    requireClosing?: boolean;
    debounceMs?: number;
  }
) {
  const { debounceMs = 300, ...validationOptions } = options || {};
  
  const validation = useMemo(() => {
    if (!text.trim()) {
      return { valid: true, issues: [], score: 100 };
    }
    return validateMessage(text, validationOptions);
  }, [text, validationOptions]);
  
  return validation;
}

// ============================================================================
// SANITIZATION HOOK
// ============================================================================

/**
 * Hook for sanitizing message content
 */
export function useMessageSanitizer() {
  const sanitize = useCallback((text: string) => {
    return sanitizeMessage(text);
  }, []);
  
  const checkForForbiddenPhrases = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const found: string[] = [];
    
    for (const phrase of ALL_FORBIDDEN_PHRASES) {
      if (lowerText.includes(phrase.toLowerCase())) {
        found.push(phrase);
      }
    }
    
    return found;
  }, []);
  
  return {
    sanitize,
    checkForForbiddenPhrases,
    forbiddenPhrases: ALL_FORBIDDEN_PHRASES,
  };
}

// ============================================================================
// LANGUAGE GUIDELINES HOOK
// ============================================================================

/**
 * Hook for accessing language guidelines
 */
export function useLanguageGuidelines() {
  return {
    guidelines: LANGUAGE_GUIDELINES,
    approvedOpenings: APPROVED_OPENINGS,
    approvedClosings: APPROVED_CLOSINGS,
    approvedActionPhrases: APPROVED_ACTION_PHRASES,
  };
}

// ============================================================================
// TEMPLATE COMPOSER HOOK
// ============================================================================

interface UseTemplateComposerResult {
  selectedTemplate: MessageTemplate | null;
  selectTemplate: (templateId: string) => void;
  variables: Record<string, string>;
  setVariable: (key: string, value: string) => void;
  renderedSubject: string;
  renderedBody: string;
  validation: ValidationResult;
  isReady: boolean;
  missingVars: string[];
  reset: () => void;
}

/**
 * Complete hook for composing messages from templates
 */
export function useTemplateComposer(): UseTemplateComposerResult {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  const { data: templates = [] } = useApprovedTemplates();
  
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);
  
  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setVariables({});
  }, []);
  
  const setVariable = useCallback((key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const rendered = useMemo(() => {
    if (!selectedTemplate) {
      return { subject: '', body: '', valid: false, missingVars: [] };
    }
    return renderTemplate(selectedTemplate, variables);
  }, [selectedTemplate, variables]);
  
  const validation = useMemo(() => {
    if (!rendered.body) {
      return { valid: true, issues: [], score: 100 };
    }
    return validateMessage(rendered.body, {
      maxLength: selectedTemplate?.maxLength,
    });
  }, [rendered.body, selectedTemplate]);
  
  const reset = useCallback(() => {
    setSelectedTemplateId(null);
    setVariables({});
  }, []);
  
  return {
    selectedTemplate,
    selectTemplate,
    variables,
    setVariable,
    renderedSubject: rendered.subject,
    renderedBody: rendered.body,
    validation,
    isReady: rendered.valid && validation.valid,
    missingVars: rendered.missingVars,
    reset,
  };
}

// ============================================================================
// TEMPLATE PREVIEW HOOK
// ============================================================================

/**
 * Hook for generating template previews with example data
 */
export function useTemplatePreview(templateId: string) {
  const { data: template } = useTemplate(templateId);
  
  const preview = useMemo(() => {
    if (!template) return null;
    
    // Use example values from variable definitions
    const exampleVars: Record<string, string> = {};
    for (const variable of template.variables) {
      exampleVars[variable.key] = variable.example;
    }
    
    return renderTemplate(template, exampleVars);
  }, [template]);
  
  return {
    template,
    preview,
  };
}
