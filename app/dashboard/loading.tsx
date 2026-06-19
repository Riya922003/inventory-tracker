export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-200 dark:bg-white/10 rounded mb-2" />
        <div className="h-4 w-56 bg-gray-100 dark:bg-white/5 rounded" />
      </div>

      {/* Health banner skeleton */}
      <div className="bg-gray-200 dark:bg-white/5 rounded-2xl h-36 mb-6" />

      {/* Bottom two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-6">
          <div className="h-5 w-36 bg-gray-200 dark:bg-white/10 rounded mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded mb-3" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-6">
            <div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded mb-4" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-white/5 rounded mb-3" />
            ))}
          </div>
          <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 p-6">
            <div className="h-5 w-28 bg-gray-200 dark:bg-white/10 rounded mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-white/5 rounded mb-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
