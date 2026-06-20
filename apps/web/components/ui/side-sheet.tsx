"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const SideSheet = DialogPrimitive.Root;
const SideSheetTrigger = DialogPrimitive.Trigger;
const SideSheetClose = DialogPrimitive.Close;
const SideSheetPortal = DialogPrimitive.Portal;

const SideSheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-brand-navy/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SideSheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface SideSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "left" | "right";
}

const SideSheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SideSheetContentProps
>(({ className, children, side = "right", ...props }, ref) => (
  <SideSheetPortal>
    <SideSheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex h-full w-full max-w-md flex-col border bg-surface shadow-lg motion-safe transition-transform",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-200",
        side === "right"
          ? "end-0 top-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          : "start-0 top-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SideSheetPortal>
));
SideSheetContent.displayName = DialogPrimitive.Content.displayName;

function SideSheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactNode {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

function SideSheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>): React.ReactNode {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold leading-tight", className)}
      {...props}
    />
  );
}

function SideSheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>): React.ReactNode {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function SideSheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactNode {
  return (
    <div className={cn("flex-1 overflow-y-auto px-4 py-4", className)} {...props} />
  );
}

function SideSheetCloseButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactNode {
  return (
    <SideSheetClose asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 shrink-0 p-0", className)}
        aria-label="Close panel"
        {...props}
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </SideSheetClose>
  );
}

export {
  SideSheet,
  SideSheetTrigger,
  SideSheetClose,
  SideSheetContent,
  SideSheetHeader,
  SideSheetTitle,
  SideSheetDescription,
  SideSheetBody,
  SideSheetCloseButton,
};
