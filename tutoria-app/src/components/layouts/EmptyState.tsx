import React from 'react';
import { Button } from '../primitives/Button';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[24px] border border-gray-100 shadow-sm transition-all hover:shadow-md h-full min-h-[300px]">
      <div className="w-32 h-32 mb-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-gray-50 group hover:border-gray-300 transition-colors">
        {icon ? (
          icon
        ) : (
          <>
            <span className="text-4xl group-hover:scale-110 transition-transform duration-500 mb-2">✨</span>
            <span className="text-xs text-gray-400 font-medium px-2">[Placeholder] Illustration</span>
          </>
        )}
      </div>

      <h3 className="text-xl font-poppins font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-base text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
          className="rounded-full font-poppins font-semibold bg-brandPrimary hover:bg-[#008F82] h-12 px-6 hover:-translate-y-0.5 transition-transform"
        >
          <span className="flex items-center gap-2">
            <Plus size={20} />
            {actionLabel}
          </span>
        </Button>
      )}
    </div>
  );
};
