import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Accessible multi-step wizard stepper with visual progress indicators.
 */
export default function Stepper({ steps = [], currentStep = 1, onStepClick }) {
  const progressPercent =
    steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress Bar Track */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0" />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-teal-600 rounded-full z-0 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="relative z-10 flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <button
                key={step.id || index}
                type="button"
                disabled={!isCompleted && !isCurrent}
                onClick={() => onStepClick && isCompleted && onStepClick(stepNumber)}
                className={cn(
                  'flex flex-col items-center group focus:outline-none',
                  isCompleted ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 shadow-sm',
                    isCompleted &&
                      'bg-teal-600 border-teal-600 text-white',
                    isCurrent &&
                      'bg-white border-teal-600 text-teal-700 ring-4 ring-teal-100',
                    !isCompleted &&
                      !isCurrent &&
                      'bg-white border-slate-300 text-slate-400'
                  )}
                >
                  {isCompleted ? <Check size={16} strokeWidth={2.5} /> : stepNumber}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium hidden sm:block transition-colors',
                    isCurrent ? 'text-teal-900 font-bold' : 'text-slate-500'
                  )}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

