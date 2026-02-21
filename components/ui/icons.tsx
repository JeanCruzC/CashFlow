import { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
    size?: number;
};

function BaseIcon({
    size = 16,
    strokeWidth = 1.8,
    className,
    children,
    ...props
}: IconProps & { children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export function EyeIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M2 12C4.2 8.2 7.7 6 12 6C16.3 6 19.8 8.2 22 12C19.8 15.8 16.3 18 12 18C7.7 18 4.2 15.8 2 12Z" />
            <circle cx="12" cy="12" r="3.2" />
        </BaseIcon>
    );
}

export function EyeOffIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M3 3L21 21" />
            <path d="M10.7 6.2C11.1 6.1 11.5 6 12 6C16.3 6 19.8 8.2 22 12C21.2 13.3 20.3 14.4 19.2 15.4" />
            <path d="M14.1 14.2C13.6 14.7 12.9 15 12 15C10.3 15 9 13.7 9 12C9 11.1 9.3 10.4 9.8 9.9" />
            <path d="M6.2 8.3C4.6 9.3 3.2 10.5 2 12C4.2 15.8 7.7 18 12 18C13.7 18 15.2 17.7 16.6 17" />
        </BaseIcon>
    );
}

export function SpinnerIcon({ className, ...props }: IconProps) {
    return (
        <BaseIcon className={`animate-spin ${className ?? ""}`.trim()} {...props}>
            <path opacity="0.3" d="M12 3C7 3 3 7 3 12" />
            <path d="M12 3C17 3 21 7 21 12" />
        </BaseIcon>
    );
}

export function ArrowRightIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M5 12H19" />
            <path d="M13 6L19 12L13 18" />
        </BaseIcon>
    );
}

export function ArrowLeftIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M19 12H5" />
            <path d="M11 6L5 12L11 18" />
        </BaseIcon>
    );
}

export function InfoIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16V11" />
            <circle cx="12" cy="8" r="0.7" fill="currentColor" />
        </BaseIcon>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M6 9L12 15L18 9" />
        </BaseIcon>
    );
}

export function TrendUpIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 16L10 10L14 14L20 8" />
            <path d="M15 8H20V13" />
        </BaseIcon>
    );
}

export function TrendDownIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 8L10 14L14 10L20 16" />
            <path d="M15 16H20V11" />
        </BaseIcon>
    );
}

export function MinusIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M5 12H19" />
        </BaseIcon>
    );
}

export function UserCircleIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="10" r="3" />
            <path d="M6.7 17.2C7.9 15.6 9.8 14.7 12 14.7C14.2 14.7 16.1 15.6 17.3 17.2" />
        </BaseIcon>
    );
}

export function BuildingIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 20H20" />
            <path d="M6 20V5L12 3L18 5V20" />
            <path d="M9 8H10.5" />
            <path d="M13.5 8H15" />
            <path d="M9 11.5H10.5" />
            <path d="M13.5 11.5H15" />
            <path d="M11 20V15H13V20" />
        </BaseIcon>
    );
}
