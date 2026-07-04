"use client";

import {
    fetchModelUsageSummary,
    fetchEventsSummary,
    fetchModelUsage,
    fetchEvents,
} from "@/apis/analytics";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
        </Card>
    );
}

function SummarySection() {
    const { data: usageSummary, isLoading: usageLoading } = useQuery({
        queryKey: ["analytics", "model-usage-summary"],
        queryFn: fetchModelUsageSummary,
    });

    const { data: eventsSummary, isLoading: eventsLoading } = useQuery({
        queryKey: ["analytics", "events-summary"],
        queryFn: fetchEventsSummary,
    });

    if (usageLoading || eventsLoading) {
        return <div className="text-sm text-gray-500">Loading summary...</div>;
    }

    const t = usageSummary?.totals;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">Model Usage</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Total Calls" value={t?.calls ?? 0} />
                    <StatCard label="Input Tokens" value={(t?.input_tokens ?? 0).toLocaleString()} />
                    <StatCard label="Output Tokens" value={(t?.output_tokens ?? 0).toLocaleString()} />
                    <StatCard label="Total Tokens" value={(t?.total_tokens ?? 0).toLocaleString()} />
                    <StatCard label="Total Cost (USD)" value={`$${(t?.cost_usd ?? 0).toFixed(4)}`} />
                    <StatCard label="Avg Latency (ms)" value={Math.round(t?.avg_latency_ms ?? 0)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">By Operation</h3>
                    {usageSummary?.by_operation.length === 0 && (
                        <p className="text-xs text-gray-400">No data</p>
                    )}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b">
                                <th className="text-left pb-2">Operation</th>
                                <th className="text-right pb-2">Calls</th>
                                <th className="text-right pb-2">Tokens</th>
                                <th className="text-right pb-2">Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usageSummary?.by_operation.map((row) => (
                                <tr key={row.operation} className="border-b last:border-0">
                                    <td className="py-2">
                                        <Badge variant="outline" className="text-xs">{row.operation}</Badge>
                                    </td>
                                    <td className="text-right py-2">{row.calls}</td>
                                    <td className="text-right py-2">{row.tokens.toLocaleString()}</td>
                                    <td className="text-right py-2">${row.cost_usd.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">By Model</h3>
                    {usageSummary?.by_model.length === 0 && (
                        <p className="text-xs text-gray-400">No data</p>
                    )}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b">
                                <th className="text-left pb-2">Model</th>
                                <th className="text-right pb-2">Calls</th>
                                <th className="text-right pb-2">Tokens</th>
                                <th className="text-right pb-2">Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usageSummary?.by_model.map((row) => (
                                <tr key={`${row.provider}/${row.model_id}`} className="border-b last:border-0">
                                    <td className="py-2 text-xs">
                                        <span className="text-gray-400">{row.provider}/</span>
                                        {row.model_id}
                                    </td>
                                    <td className="text-right py-2">{row.calls}</td>
                                    <td className="text-right py-2">{row.tokens.toLocaleString()}</td>
                                    <td className="text-right py-2">${row.cost_usd.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>

            <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">
                    Events — {eventsSummary?.total ?? 0} total
                </h3>
                <div className="flex flex-wrap gap-2">
                    {eventsSummary?.by_event_type.map((e) => (
                        <div
                            key={e.event_type}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm"
                        >
                            <span className="text-gray-600">{e.event_type}</span>
                            <span className="font-semibold">{e.count}</span>
                        </div>
                    ))}
                    {eventsSummary?.by_event_type.length === 0 && (
                        <p className="text-xs text-gray-400">No events recorded</p>
                    )}
                </div>
            </Card>
        </div>
    );
}

function ModelUsageTable() {
    const { data, isLoading } = useQuery({
        queryKey: ["analytics", "model-usage"],
        queryFn: () => fetchModelUsage({ limit: 50 }),
    });

    if (isLoading) return <div className="text-sm text-gray-500 p-4">Loading...</div>;

    return (
        <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-175">
                <thead>
                    <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-2">Operation</th>
                        <th className="text-left pb-2">Model</th>
                        <th className="text-right pb-2">Input</th>
                        <th className="text-right pb-2">Output</th>
                        <th className="text-right pb-2">Total</th>
                        <th className="text-right pb-2">Latency</th>
                        <th className="text-right pb-2">Cost</th>
                        <th className="text-right pb-2">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2">
                                <Badge variant="outline" className="text-xs">{row.operation}</Badge>
                            </td>
                            <td className="py-2 text-xs text-gray-500">
                                {row.provider}/{row.model_id}
                            </td>
                            <td className="text-right py-2">{row.input_tokens.toLocaleString()}</td>
                            <td className="text-right py-2">{row.output_tokens.toLocaleString()}</td>
                            <td className="text-right py-2 font-medium">{row.total_tokens.toLocaleString()}</td>
                            <td className="text-right py-2">{row.latency_ms != null ? `${row.latency_ms}ms` : "—"}</td>
                            <td className="text-right py-2">
                                {row.cost_usd != null ? `$${row.cost_usd.toFixed(4)}` : "—"}
                            </td>
                            <td className="text-right py-2 text-xs text-gray-400">
                                {new Date(row.created_at).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                    {data?.length === 0 && (
                        <tr>
                            <td colSpan={8} className="py-6 text-center text-gray-400">
                                No model usage records
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Card>
    );
}

function EventsTable() {
    const { data, isLoading } = useQuery({
        queryKey: ["analytics", "events"],
        queryFn: () => fetchEvents({ limit: 50 }),
    });

    if (isLoading) return <div className="text-sm text-gray-500 p-4">Loading...</div>;

    return (
        <Card className="p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-150">
                <thead>
                    <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-2">Event Type</th>
                        <th className="text-left pb-2">Entity</th>
                        <th className="text-left pb-2">Entity ID</th>
                        <th className="text-right pb-2">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2">
                                <Badge variant="outline" className="text-xs">{row.event_type}</Badge>
                            </td>
                            <td className="py-2 text-gray-500">{row.entity_type ?? "—"}</td>
                            <td className="py-2 text-xs text-gray-400 font-mono">
                                {row.entity_id ? row.entity_id.slice(0, 8) + "…" : "—"}
                            </td>
                            <td className="text-right py-2 text-xs text-gray-400">
                                {new Date(row.created_at).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                    {data?.length === 0 && (
                        <tr>
                            <td colSpan={4} className="py-6 text-center text-gray-400">
                                No events recorded
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </Card>
    );
}

export default function AnalyticsPage() {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold">Analytics</h1>

            <Tabs defaultValue="summary">
                <TabsList variant="line" className="mb-6 w-full justify-start">
                    {["summary", "model-usage", "events"].map((tab) => (
                        <TabsTrigger key={tab} value={tab} className="capitalize">
                            {tab.replace("-", " ")}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="summary">
                    <SummarySection />
                </TabsContent>

                <TabsContent value="model-usage">
                    <ModelUsageTable />
                </TabsContent>

                <TabsContent value="events">
                    <EventsTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}
