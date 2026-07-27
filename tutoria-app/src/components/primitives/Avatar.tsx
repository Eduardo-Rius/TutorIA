import React, { useState } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({
  src,
  alt,
  initials,
  size = 'md',
  className = '',
  ...props
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  let sizeClass = 'w-10 h-10 text-sm';
  if (size === 'sm') sizeClass = 'w-8 h-8 text-xs';
  if (size === 'lg') sizeClass = 'w-12 h-12 text-base';

  // REMEDIATION 02: Removed bg-gray-200. Using brandPrimary/10.
  const combinedClassName = `relative inline-flex items-center justify-center rounded-circle overflow-hidden bg-brandPrimary/10 text-brandPrimary font-medium ${sizeClass} ${className}`.trim();

  return (
    <div {...props} role="img" aria-label={alt} className={combinedClassName}>
      {src && !imgError ? (
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials || alt.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
