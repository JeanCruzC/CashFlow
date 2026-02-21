"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buildRegisterHref, sanitizeReturnTo, DEFAULT_RETURN_TO } from "@/lib/navigation/returnTo";

type RegisterLinkProps = {
  children: ReactNode;
  className?: string;
  defaultReturnTo?: string;
};

export default function RegisterLink({ children, className, defaultReturnTo = DEFAULT_RETURN_TO }: RegisterLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const hash = window.location.hash ?? "";
    const returnTo = sanitizeReturnTo(`${pathname}${hash}`, defaultReturnTo);
    router.push(buildRegisterHref(returnTo));
  }

  return (
    <Link href={buildRegisterHref(defaultReturnTo)} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
