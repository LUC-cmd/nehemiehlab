import React from 'react';
import AppLoader from './AppLoader';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} />;
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card border border-dark-700">
          <SkeletonBlock className="h-10 w-10 rounded-xl mb-4" />
          <SkeletonBlock className="h-5 w-2/3 mb-2" />
          <SkeletonBlock className="h-4 w-1/2 mb-5" />
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card border border-dark-700 p-0 overflow-hidden">
      <div className="p-4 border-b border-dark-800">
        <SkeletonBlock className="h-5 w-52" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <SkeletonBlock className="h-4 col-span-3" />
            <SkeletonBlock className="h-4 col-span-3" />
            <SkeletonBlock className="h-4 col-span-2" />
            <SkeletonBlock className="h-4 col-span-2" />
            <SkeletonBlock className="h-8 col-span-2 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageLoadingSkeleton({
  cardCount = 6,
  showTable = false,
  message = 'Chargement de la page…',
}: {
  cardCount?: number;
  showTable?: boolean;
  message?: string;
}) {
  return (
    <div className="space-y-8">
      <AppLoader variant="page" message={message} />

      <div className="hidden md:block space-y-6 opacity-50 pointer-events-none select-none" aria-hidden>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <SkeletonBlock className="h-8 w-56 mb-2" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
          </div>
          <SkeletonBlock className="h-10 w-44 rounded-xl" />
        </div>

        <div className="max-w-md">
          <SkeletonBlock className="h-11 rounded-xl" />
        </div>

        {showTable ? <TableSkeleton /> : <CardsSkeleton count={cardCount} />}
      </div>
    </div>
  );
}

export function ModalContentSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-6 w-52" />
      <SkeletonBlock className="h-4 w-80 max-w-full" />
      <div className="card border border-dark-700 p-0 overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <SkeletonBlock className="h-5 w-44" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-center">
              <SkeletonBlock className="h-4 col-span-4" />
              <SkeletonBlock className="h-4 col-span-3" />
              <SkeletonBlock className="h-4 col-span-2" />
              <SkeletonBlock className="h-4 col-span-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
