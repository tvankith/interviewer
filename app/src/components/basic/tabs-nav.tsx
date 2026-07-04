import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabItem = {
    id: string;
    label: string;
    Icon: LucideIcon;
};

export type TabGroup = {
    id: string;
    items: TabItem[];
};

type Props = {
    groups: TabGroup[];
    activeId: string;
    onSelect: (id: string) => void;
    vertical?: boolean;
};

export default function TabsNav({ groups, activeId, onSelect, vertical = false }: Props) {
    if (vertical) {
        return (
            <nav className="shrink-0 border-r bg-slate-50 py-4 px-3 w-48 overflow-y-auto flex flex-col gap-4">
                {groups.map((group, gi) => (
                    <div key={group.id} className={cn("flex flex-col gap-2", gi > 0 && "pt-2 border-t border-border/40")}>
                        {group.items.map((item) => {
                            const isActive = activeId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap",
                                        isActive
                                            ? "bg-white text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                                    )}
                                    title={item.label}
                                >
                                    <item.Icon size={14} />
                                    <span className="truncate">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>
        );
    }

    return (
        <nav className="shrink-0 bg-slate-50">
            <div className="flex flex-row flex-wrap items-center px-5 py-4 gap-2">
                {groups.map((group, gi) => (
                    <div key={group.id} className="flex flex-row flex-wrap items-center gap-2">
                        {group.items.map((item) => {
                            const isActive = activeId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                                        isActive
                                            ? "bg-primary text-white shadow-sm"
                                            : "bg-white text-muted-foreground border border-slate-200 hover:text-foreground hover:bg-slate-100"
                                    )}
                                >
                                    <item.Icon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </nav>
    );
}
