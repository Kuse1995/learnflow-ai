import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  emptyMessage?: string;
}

/**
 * Virtualized list component for rendering large lists efficiently
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  keyExtractor,
  overscan = 5,
  className,
  loadMore,
  hasMore = false,
  isLoadingMore = false,
  emptyMessage = "No items to display",
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Infinite scroll trigger
    if (loadMore && hasMore && !isLoadingMore) {
      const threshold = 100;
      if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
        loadMore();
      }
    }
  }, [loadMore, hasMore, isLoadingMore]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    container.addEventListener("scroll", handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: "100%" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, i) => (
            <div
              key={keyExtractor(item, startIndex + i)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>

      {/* Load more button/indicator */}
      {hasMore && (
        <div className="flex justify-center py-4">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more...
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={loadMore}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple paginated list with load more button
 */
interface PaginatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
}

export function PaginatedList<T>({
  items,
  renderItem,
  keyExtractor,
  pageSize = 20,
  className,
  emptyMessage = "No items to display",
}: PaginatedListProps<T>) {
  const [displayCount, setDisplayCount] = useState(pageSize);

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  const loadMore = () => {
    setDisplayCount((prev) => Math.min(prev + pageSize, items.length));
  };

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {displayedItems.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <Button variant="ghost" size="sm" onClick={loadMore}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Show more ({items.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for lists
 */
interface ListSkeletonProps {
  count?: number;
  itemHeight?: number;
  className?: string;
}

export function ListSkeleton({ count = 5, itemHeight = 64, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ height: itemHeight }} />
      ))}
    </div>
  );
}
