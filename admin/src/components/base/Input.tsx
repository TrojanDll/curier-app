import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/utils/cx";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: string;
    hint?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

/**
 * Текстовое поле в стиле Untitled UI с label/hint/error.
 * Если передан error — приоритетно отображается вместо hint.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, hint, error, leftIcon, rightIcon, className, id, ...rest },
    ref,
) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedById = hint || error ? `${inputId}-desc` : undefined;
    const hasError = Boolean(error);

    return (
        <div className="flex flex-col gap-1.5">
            {label ? (
                <label htmlFor={inputId} className="text-sm font-medium text-secondary">
                    {label}
                </label>
            ) : null}
            <div className="relative">
                {leftIcon ? (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-quaternary">
                        {leftIcon}
                    </span>
                ) : null}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={hasError || undefined}
                    aria-describedby={describedById}
                    className={cx(
                        "block w-full rounded-md border bg-primary text-md text-primary",
                        "placeholder:text-placeholder",
                        "h-10 px-3.5 py-2 shadow-xs transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-offset-0",
                        leftIcon ? "pl-10" : "",
                        rightIcon ? "pr-10" : "",
                        hasError
                            ? "border-error focus:border-error focus:ring-error"
                            : "border-primary focus:border-brand focus:ring-brand",
                        rest.disabled ? "cursor-not-allowed opacity-50" : "",
                        className,
                    )}
                    {...rest}
                />
                {rightIcon ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-fg-quaternary">
                        {rightIcon}
                    </span>
                ) : null}
            </div>
            {hint && !error ? (
                <p id={describedById} className="text-sm text-tertiary">
                    {hint}
                </p>
            ) : null}
            {error ? (
                <p id={describedById} className="text-sm text-error-primary">
                    {error}
                </p>
            ) : null}
        </div>
    );
});
