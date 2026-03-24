import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/stores/user-store";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

function getInitials(name?: string | null) {
  const parts = (name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "U";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function UserAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
  imageClassName,
}: UserAvatarProps) {
  const storedName = useUserStore((store) => store.name);
  const resolvedName = name?.trim() || storedName || "User";
  const resolvedImageUrl = imageUrl?.trim() || "";
  const initials = getInitials(resolvedName);

  return (
    <Avatar className={cn("ring-1 ring-black/5 dark:ring-white/10", className)}>
      {resolvedImageUrl ? (
        <AvatarImage
          src={resolvedImageUrl}
          alt={resolvedName || "User avatar"}
          className={cn("object-cover", imageClassName)}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/15 text-sm font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
