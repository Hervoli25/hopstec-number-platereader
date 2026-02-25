import { useQuery } from "@tanstack/react-query";

interface FeaturesResponse {
  features: string[];
}

export function useFeatureFlags() {
  const { data, isLoading, isError } = useQuery<FeaturesResponse>({
    queryKey: ["/api/features"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const features = data?.features ?? [];

  const hasFeature = (code: string): boolean => {
    // Permissive default: don't block UI while loading or on error
    if (isLoading || isError) {
      return true;
    }
    return features.includes(code);
  };

  return { features, hasFeature, isLoading };
}
