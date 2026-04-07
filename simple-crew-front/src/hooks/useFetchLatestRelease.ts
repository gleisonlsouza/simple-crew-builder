import { useState, useEffect } from 'react';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
}

export function useFetchLatestRelease() {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelease = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.github.com/repos/gleisonlsouza/simple-crew-builder/releases');
      if (!response.ok) {
        throw new Error('Failed to fetch releases from GitHub');
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        // The first one is the latest
        setRelease(data[0]);
      } else {
        throw new Error('No releases found');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelease();
  }, []);

  return { release, loading, error, refetch: fetchRelease };
}
