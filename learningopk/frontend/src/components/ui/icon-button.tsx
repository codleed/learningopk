"use client";

import { forwardRef, type ReactNode } from "react";

import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<ButtonProps, "children"> {
  /** Accessible name announced by assistive technology. */
  label: string;
  /** Icon rendered inside the square button. */
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, icon, size = "md", shape = "square", ...props }, ref) {
    return (
      <Button
        ref={ref}
        {...props}
        size={size}
        shape={shape}
        aria-label={label}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = "IconButton";
