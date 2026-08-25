import React from 'react';

/**
 * Skeleton component for loading states
 * Provides visual feedback while content is loading
 */
const Skeleton = ({ className, variant = 'default', ...props }) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    default: '',
    text: 'h-4 w-full',
    heading: 'h-6 w-3/4',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full',
    button: 'h-10 w-24',
    input: 'h-10 w-full',
    image: 'h-48 w-full',
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant] || ''} ${className || ''}`;

  return <div className={combinedClasses} {...props} />;
};

/**
 * Card skeleton for book cards
 */
export const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-4 border border-gray-200">
    <div className="flex gap-4 mb-4">
      <Skeleton variant="avatar" className="w-16 h-24 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="heading" className="h-5" />
        <Skeleton variant="text" className="h-4 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" className="h-4 w-1/3" />
      <Skeleton variant="button" className="w-full" />
    </div>
  </div>
);

/**
 * Notification skeleton
 */
export const NotificationSkeleton = () => (
  <div className="rounded-xl p-4 border border-gray-200 bg-white">
    <div className="flex items-start gap-4">
      <Skeleton variant="avatar" className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="heading" className="h-5 w-1/2" />
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-2/3" />
      </div>
    </div>
  </div>
);

/**
 * Stats card skeleton
 */
export const StatsCardSkeleton = () => (
  <div className="bg-white rounded-xl p-4 border border-gray-200">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton variant="avatar" className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton variant="text" className="h-4 w-1/3" />
      </div>
    </div>
    <Skeleton variant="heading" className="h-8" />
    <Skeleton variant="text" className="h-4 w-1/2 mt-2" />
  </div>
);

/**
 * Profile skeleton
 */
export const ProfileSkeleton = () => (
  <div className="bg-white rounded-xl p-6 border border-gray-200">
    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
      <Skeleton variant="avatar" className="w-20 h-20 sm:w-24 sm:h-24" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="heading" className="h-6 w-1/2" />
        <Skeleton variant="text" className="h-4 w-1/3" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
          <Skeleton variant="avatar" className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/4" />
            <Skeleton variant="text" className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Book grid skeleton
 */
export const BookGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
