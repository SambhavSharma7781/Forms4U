interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  size = 'md',
  fullScreen = true 
}: LoadingSpinnerProps) {
  // Size variants
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const spinner = (
    <div className="text-center">
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 mx-auto mb-4 ${sizeClasses[size]} shadow-lg`}></div>
      <p className={`text-gray-700 font-medium ${textSizes[size]}`}>{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}