"use client";

import { useEffect, useState } from "react";
import { apiBlobUrl } from "@/lib/api";

export default function AudioMessagePlayer({ memoryId, label = "원본 음성 메시지" }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    setUrl(null);
    setError("");
    apiBlobUrl(`/memories/${memoryId}/audio`)
      .then((nextUrl) => {
        objectUrl = nextUrl;
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        setUrl(nextUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [memoryId]);

  if (error) return <p className="t-caption text-critical">{error}</p>;

  return (
    <div className="rounded-sm bg-sunken px-4 py-3">
      <p className="t-caption-sm mb-2 text-ink-muted">{label}</p>
      {url ? (
        <audio controls preload="metadata" src={url} className="w-full" aria-label={label} />
      ) : (
        <p className="t-caption text-ink-faint">음성 메시지를 불러오는 중</p>
      )}
    </div>
  );
}
