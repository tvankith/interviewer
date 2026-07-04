import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepNavItem = {
    id: string;
    label: string;
    Icon: LucideIcon;
};

export type StepNavGroup = {
    id: string;
    items: StepNavItem[];
};

type Props = {
    groups: StepNavGroup[];
    activeId: string;
    completedUpToIndex?: number;
    onSelect: (id: string) => void;
    horizontal?: boolean;
};

export default function StepNav({ groups, activeId, completedUpToIndex, onSelect, horizontal = false }: Props) {
    const allItems = groups.flatMap((g) => g.items);
    const activeIndex = allItems.findIndex((item) => item.id === activeId);
    const doneUntil = completedUpToIndex ?? activeIndex;

    let flatIndex = 0;

    if (horizontal) {
        return (
            <nav className="shrink-0 border-b bg-card flex flex-row items-center px-5 py-3 gap-1 overflow-x-auto">
                {groups.map((group, gi) => (
                    <div
                        key={group.id}
                        className={cn(
                            "flex flex-row items-center gap-1",
                            gi > 0 && "ml-1 pl-2 border-l border-border/40"
                        )}
                    >
                        {group.items.map((item) => {
                            const i = flatIndex++;
                            const isActive = activeId === item.id;
                            const isDone = i < doneUntil;
                            return (
                                <button
                                    key={item.id}
                                    title={item.label}
                                    onClick={() => onSelect(item.id)}
                                    className={cn(
                                        "relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : isDone
                                            ? "text-muted-foreground hover:bg-muted"
                                            : "text-muted-foreground/60 hover:bg-muted"
                                    )}
                                >
                                    <item.Icon size={14} strokeWidth={1.6} />
                                    <span>{item.label}</span>

                                    {/* Active bottom-edge bar */}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-[12%] right-[12%] h-[3px] rounded-t-full bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>
        );
    }

    return (
        <nav className="relative flex flex-col h-full overflow-y-auto shrink-0 border-r bg-card py-6 px-4 w-48">
            {/* Fixed vertical connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-transparent via-border to-transparent transform -translate-x-1/2 pointer-events-none" />

            <div className="relative flex flex-col gap-6 w-full">
                {groups.map((group, gi) => (
                    <div
                        key={group.id}
                        className={cn(
                            "relative flex flex-col items-center gap-6 w-full",
                            gi > 0 && "pt-4 mt-4 border-t border-border/40"
                        )}
                    >
                        {group.items.map((item, itemIdx) => {
                            const i = flatIndex++;
                            const isActive = activeId === item.id;
                            const isDone = i < doneUntil;
                            const isLastItem = itemIdx === group.items.length - 1;
                            const isLastGroup = gi === groups.length - 1;

                            return (
                                <div key={item.id} className="relative flex flex-col items-center w-full">
                                    {/* Connecting line segment to next step */}
                                    {!(isLastItem && isLastGroup) && (
                                        <div className="absolute top-10 left-1/2 w-0.5 h-8 bg-linear-to-b from-border to-border/40 transform -translate-x-1/2 pointer-events-none" />
                                    )}

                                    {/* Step circle and content */}
                                    <div className="relative z-10 flex items-center gap-3 w-full px-2">
                                        <button
                                            title={item.label}
                                            onClick={() => onSelect(item.id)}
                                            className={cn(
                                                "relative shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 font-medium text-sm",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/50"
                                                    : isDone
                                                    ? "bg-green-500/20 text-green-600 border border-green-200/50 hover:bg-green-500/30"
                                                    : "bg-muted border border-border text-muted-foreground/60 hover:bg-muted"
                                            )}
                                        >
                                            {isDone && !isActive ? (
                                                <span className="text-xs">✓</span>
                                            ) : (
                                                <item.Icon size={18} strokeWidth={1.5} />
                                            )}
                                        </button>

                                        {/* Step label */}
                                        <div className="min-w-0 flex-1">
                                            <p className={cn(
                                                "text-xs font-medium truncate transition-colors",
                                                isActive
                                                    ? "text-primary"
                                                    : isDone
                                                    ? "text-muted-foreground"
                                                    : "text-muted-foreground/60"
                                            )}>
                                                {item.label}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </nav>
    );
}
