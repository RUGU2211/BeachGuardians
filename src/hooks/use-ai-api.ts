import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AIApiResponse<T = any> {
  success: boolean;
  error?: string;
  code?: string;
  requiresAdminVerification?: boolean;
  data?: T;
}

interface UseAIApiReturn<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  callAI: (endpoint: string, payload: any) => Promise<T | null>;
  reset: () => void;
}

export function useAIApi<T = any>(): UseAIApiReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const callAI = async (endpoint: string, payload: any): Promise<T | null> => {
    if (!user) {
      const errorMsg = 'You must be logged in to use AI features';
      setError(errorMsg);
      toast({
        title: 'Authentication Required',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user's ID token for authentication
      const token = await user.getIdToken();

      const response = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result: AIApiResponse<T> = await response.json();

      if (!response.ok) {
        if (result.code === 'AI_ACCESS_DENIED') {
          const errorMsg = result.requiresAdminVerification 
            ? 'Admin verification required to access AI features. Please complete your admin verification first.'
            : 'Admin access required for AI features';
          
          setError(errorMsg);
          toast({
            title: 'Access Denied',
            description: errorMsg,
            variant: 'destructive',
            duration: 8000,
          });
          return null;
        }

        throw new Error(result.error || 'AI request failed');
      }

      if (result.success && result.data) {
        setData(result.data);
        return result.data;
      } else {
        // Handle case where API returns success but no data
        const responseData = result as unknown as T;
        setData(responseData);
        return responseData;
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast({
        title: 'AI Request Failed',
        description: errorMsg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return {
    loading,
    error,
    data,
    callAI,
    reset,
  };
}

// Specific hooks for different AI features
export function useCertificateGenerator() {
  return useAIApi<{
    certificateText: string;
    generatedBy: string;
    generatedAt: string;
  }>();
}

export function useEventImageGenerator() {
  return useAIApi<{
    imageDataUri: string;
    eventName: string;
    format: string;
    generatedBy: string;
    generatedAt: string;
  }>();
}

export function useSocialMediaGenerator() {
  return useAIApi<{
    postContent: string;
    hashtags: string[];
    eventName: string;
    platform: string;
    tone: string;
    generatedBy: string;
    generatedAt: string;
  }>();
}

export function useCleanupSummarizer() {
  return useAIApi<{
    summary: string;
    eventData: any;
    generatedBy: string;
    generatedAt: string;
  }>();
}

export function useEngagementMessageGenerator() {
  return useAIApi<{
    message: string;
    volunteerData: any;
    generatedBy: string;
    generatedAt: string;
  }>();
}