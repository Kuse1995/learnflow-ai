import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useErrorCode } from "@/hooks/useLaunchMode";

interface RetryableMutationProps {
  onRetry: () => Promise<void>;
  errorCode?: string;
  errorMessage?: string;
  isLoading?: boolean;
  maxRetries?: number;
  children?: React.ReactNode;
}

/**
 * A component for handling retry-safe mutations with user-friendly error display
 */
export function RetryableMutation({
  onRetry,
  errorCode,
  errorMessage,
  isLoading = false,
  maxRetries = 3,
  children,
}: RetryableMutationProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const knownError = useErrorCode(errorCode || '');

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
      setRetryCount(0);
    } catch {
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryCount, maxRetries]);

  if (isLoading || isRetrying) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">
          {isRetrying ? 'Retrying...' : 'Saving...'}
        </span>
      </div>
    );
  }

  if (errorMessage || errorCode) {
    const displayTitle = knownError?.title || 'Something went wrong';
    const displayMessage = knownError?.description || errorMessage || 'An error occurred';
    const resolutionSteps = knownError?.resolution_steps || [];

    return (
      <Alert variant="destructive" className="mt-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{displayTitle}</span>
              {errorCode && (
                <span className="text-xs font-mono opacity-70">{errorCode}</span>
              )}
            </div>
            <p className="text-sm">{displayMessage}</p>
            
            {resolutionSteps.length > 0 && (
              <ul className="text-xs list-disc list-inside opacity-80">
                {resolutionSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            )}
            
            {retryCount < maxRetries && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="mt-2"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Try Again ({maxRetries - retryCount} left)
              </Button>
            )}
            
            {retryCount >= maxRetries && (
              <p className="text-xs opacity-70 mt-2">
                Maximum retries reached. Please contact support with code: {errorCode || 'E004'}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for retry-safe mutations
 */
export function useRetryableMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  }
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setIsPending(true);
    setError(null);

    const attemptMutation = async (attempt: number): Promise<TData | null> => {
      try {
        const result = await mutationFn(variables);
        setRetryCount(0);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          return attemptMutation(attempt + 1);
        }
        
        setError(error);
        options?.onError?.(error);
        return null;
      } finally {
        setIsPending(false);
      }
    };

    return attemptMutation(0);
  }, [mutationFn, maxRetries, retryDelay, options]);

  return {
    mutate,
    isPending,
    error,
    retryCount,
    reset: () => {
      setError(null);
      setRetryCount(0);
    },
  };
}
