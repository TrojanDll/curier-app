import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "@/utils/cx";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
    primary:
        "bg-bg-brand-solid text-white hover:bg-bg-brand-solid_hover focus-visible:ring-brand disabled:bg-bg-brand-solid/50",
    secondary:
        "border border-secondary bg-primary text-secondary hover:bg-primary_hover focus-visible:ring-primary disabled:opacity-50",
    tertiary:
        "text-secondary hover:bg-primary_hover focus-visible:ring-primary disabled:opacity-50",
    destructive:
        "bg-bg-error-solid text-white hover:bg-bg-error-solid_hover focus-visible:ring-error disabled:bg-bg-error-solid/50",
};

const SIZES: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-md",
};

/**
 * Базовая кнопка в стиле Untitled UI.
 * Поддерживает 4 варианта (primary/secondary/tertiary/destructive),
 * 3 размера, иконки слева/справа и состояние загрузки.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = "primary",
        size = "md",
        isLoading = false,
        leftIcon,
        rightIcon,
        className,
        children,
        disabled,
        type = "button",
        ...rest
    },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || isLoading}
            className={cx(
                "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed",
                VARIANTS[variant],
                SIZES[size],
                className,
            )}
            {...rest}
        >
            {isLoading ? (
                <svg
                    className="size-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            ) : leftIcon ? (
                <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
            ) : null}
            <span>{children}</span>
            {!isLoading && rightIcon ? (
                <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
            ) : null}
        </button>
    );
});
