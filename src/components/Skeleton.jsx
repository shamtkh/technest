export function Skeleton({ className = '', ...props }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} {...props} />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <span aria-hidden="true" className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </span>
  )
}

export function SkeletonImage({ className = '' }) {
  return <Skeleton className={`block ${className}`} />
}

export function ProductCardSkeleton() {
  return (
    <div className="card-realistic overflow-hidden rounded-2xl" aria-hidden="true">
      <SkeletonImage className="aspect-square w-full" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="mt-2 flex items-end justify-between gap-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => <ProductCardSkeleton key={index} />)}
    </div>
  )
}

export function OrdersSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4" aria-label="Loading orders" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-7 w-24 rounded-full" /></div>
          <Skeleton className="mt-2 h-3 w-32" />
          <Skeleton className="mt-5 h-1 w-full rounded-full" />
          <div className="mt-5 space-y-3 border-t border-line pt-4"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-4 w-2/5" /></div>
          <div className="mt-4 flex justify-between border-t border-line pt-4"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-32" /></div>
        </div>
      ))}
    </div>
  )
}

export function HomePageSkeleton() {
  return (
    <div aria-label="Loading home page" aria-busy="true">
      <section className="bg-ink"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24"><div><Skeleton className="h-6 w-40" /><Skeleton className="mt-5 h-20 w-full max-w-xl" /><SkeletonText lines={2} className="mt-5 max-w-md" /><div className="mt-8 flex gap-3"><Skeleton className="h-12 w-36 rounded-full" /><Skeleton className="h-12 w-36 rounded-full" /></div></div><SkeletonImage className="aspect-square w-full rounded-[1.75rem]" /></div></section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><Skeleton className="mb-6 h-7 w-56" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <SkeletonImage key={index} className="aspect-[4/5] rounded-2xl" />)}</div></section>
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8"><Skeleton className="mb-6 h-7 w-48" /><ProductGridSkeleton count={4} /></section>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-label="Loading product" aria-busy="true">
      <Skeleton className="mb-6 h-4 w-56" />
      <div className="grid gap-10 lg:grid-cols-2"><div><SkeletonImage className="aspect-square w-full rounded-2xl" /><div className="mt-4 flex gap-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-20" />)}</div></div><div><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-10 w-4/5" /><Skeleton className="mt-5 h-7 w-36" /><SkeletonText lines={3} className="mt-5" /><Skeleton className="mt-6 h-10 w-72 rounded-full" /><Skeleton className="mt-8 h-48 w-full rounded-2xl" /></div></div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div aria-label="Loading admin dashboard" aria-busy="true">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="rounded-2xl border border-line bg-white p-4"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-7 w-20" /></div>)}</div>
      <div className="mb-5 flex gap-2"><Skeleton className="h-10 w-24 rounded-full" /><Skeleton className="h-10 w-24 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /></div>
      <Skeleton className="mb-4 h-7 w-32" />
      <OrdersSkeleton count={3} />
    </div>
  )
}
