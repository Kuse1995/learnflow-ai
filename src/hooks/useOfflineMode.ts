import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  pendingUploads: number;
}

// Check if we're online
function checkOnline(): boolean {
  return navigator.onLine;
}

// Hook for offline detection and queue management
export function useOfflineMode() {
  const [state, setState] = useState<OfflineState>({
    isOnline: checkOnline(),
    wasOffline: false,
    pendingUploads: 0,
  });

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Trigger pending uploads sync
      syncPendingUploads();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, wasOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending uploads count
    checkPendingUploads();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingUploads = useCallback(async () => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        setState(prev => ({ ...prev, pendingUploads: queue.length }));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const syncPendingUploads = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const stored = localStorage.getItem('offline_queue');
      if (!stored) return;

      const queue = JSON.parse(stored);
      const remaining = [];

      for (const item of queue) {
        try {
          // Try to sync each item
          await supabase.from(item.table).upsert(item.data);
        } catch {
          remaining.push(item);
        }
      }

      localStorage.setItem('offline_queue', JSON.stringify(remaining));
      setState(prev => ({ ...prev, pendingUploads: remaining.length }));
    } catch {
      // Ignore errors
    }
  }, []);

  const queueForSync = useCallback((table: string, data: unknown) => {
    try {
      const stored = localStorage.getItem('offline_queue');
      const queue = stored ? JSON.parse(stored) : [];
      queue.push({ table, data, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_queue', JSON.stringify(queue));
      setState(prev => ({ ...prev, pendingUploads: queue.length }));
    } catch {
      // Ignore errors - localStorage might be full
    }
  }, []);

  const dismissOfflineNotice = useCallback(() => {
    setState(prev => ({ ...prev, wasOffline: false }));
  }, []);

  return {
    ...state,
    syncPendingUploads,
    queueForSync,
    dismissOfflineNotice,
  };
}

// Generate CSV from data
export function generateCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, filename, 'text/csv');
}

// Generate JSON export
export function generateJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json');
}

// Download file helper
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate printable summary
export function generatePrintableSummary(
  title: string,
  sections: { heading: string; content: string | string[] }[]
): string {
  const now = new Date().toLocaleString();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .meta { color: #888; font-size: 14px; margin-bottom: 30px; }
    ul { line-height: 1.8; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated: ${now}</p>
`;

  for (const section of sections) {
    html += `<h2>${section.heading}</h2>`;
    if (Array.isArray(section.content)) {
      html += '<ul>';
      for (const item of section.content) {
        html += `<li>${item}</li>`;
      }
      html += '</ul>';
    } else {
      html += `<p>${section.content}</p>`;
    }
  }

  html += `
  <div class="footer">
    <p>This document was generated for record-keeping and review purposes.</p>
  </div>
</body>
</html>
`;

  return html;
}

// Open print dialog with content
export function printSummary(
  title: string,
  sections: { heading: string; content: string | string[] }[]
): void {
  const html = generatePrintableSummary(title, sections);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
