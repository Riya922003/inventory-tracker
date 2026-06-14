// Next.js automatically shows this while the async Server Component fetches data.
// It replaces the old client-side "Loading dashboard..." text.

export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6">
            <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Warehouse snapshot */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg mb-3">
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-3" />
          ))}
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
          ))}
        </div>
      </div>
    </div>
  );
}
