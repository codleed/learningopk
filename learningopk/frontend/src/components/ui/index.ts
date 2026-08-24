/* ═══════════════════════════════════════════════════════════════
   UI Component Barrel Export
   ═══════════════════════════════════════════════════════════════ */

/* ── Button ── */
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

/* ── Card ── */
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardActions,
} from "./card";
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardActionsProps,
} from "./card";

/* ── Badge ── */
export { Badge, StatusPill, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

/* ── Input ── */
export { Input } from "./input";
export type { InputProps } from "./input";

/* ── Avatar ── */
export { Avatar, AvatarGroup } from "./avatar";
export type { AvatarProps, AvatarGroupProps } from "./avatar";

/* ── Progress ── */
export { LinearProgress, CircularProgress } from "./progress";
export type { LinearProgressProps, CircularProgressProps } from "./progress";

/* ── Skeleton ── */
export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from "./skeleton";
export type { SkeletonProps, SkeletonCardProps } from "./skeleton";

/* ── Tooltip ── */
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from "./tooltip";
export type { TooltipProps } from "./tooltip";

/* ── Dialog ── */
export {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "./dialog";
export type {
  DialogProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps,
  DialogTitleProps,
  DialogDescriptionProps,
} from "./dialog";

/* ── Sheet ── */
export {
  Sheet,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "./sheet";
export type {
  SheetProps,
  SheetHeaderProps,
  SheetBodyProps,
  SheetFooterProps,
  SheetTitleProps,
  SheetDescriptionProps,
} from "./sheet";

/* ── Select ── */
export {
  Select,
  NativeSelect,
  RadixSelect,
  SelectItem,
  SelectGroup,
  SelectSeparator,
} from "./select";
export type {
  SelectProps,
  NativeSelectProps,
  RadixSelectProps,
  SelectItemProps,
  SelectGroupProps,
} from "./select";

/* ── Tabs ── */
export { Tabs, TabList, TabTrigger, TabContent } from "./tabs";
export type { TabsProps, TabListProps, TabTriggerProps, TabContentProps } from "./tabs";

/* ── Switch ── */
export { Switch } from "./switch";
export type { SwitchProps } from "./switch";

/* ── Spinner ── */
export { Spinner } from "./spinner";
export type { SpinnerProps } from "./spinner";

/* ── Divider ── */
export { Divider } from "./divider";
export type { DividerProps } from "./divider";

/* ── Empty State ── */
export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

/* ── Alert ── */
export { Alert } from "./alert";
export type { AlertProps } from "./alert";

/* ── Theme Toggle ── */
export { ThemeToggle, ThemeToggleCompact } from "./theme-toggle";
export type { ThemeToggleProps, ThemeToggleCompactProps } from "./theme-toggle";

/* ── Textarea ── */
export { Textarea } from "./textarea";
export type { TextareaProps } from "./textarea";

/* ── Checkbox (existing) ── */
export { Checkbox } from "./checkbox";
export type { CheckboxProps } from "./checkbox";

/* ── Confirm Dialog (existing) ── */
export { ConfirmDialog } from "./confirm-dialog";

/* ── Toast (existing) ── */
export { ToastProvider, useToast } from "./toast";

/* ── States (existing) ── */
export {
  ErrorState,
  LoadingSkeleton,
  SuccessState,
  CardSkeleton,
  PageSkeleton,
  ThreadSkeleton,
} from "./states";
