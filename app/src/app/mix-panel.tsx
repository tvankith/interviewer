"use client"
import { useEffect } from "react"
import mixpanel from "mixpanel-browser";

const MixPanel = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_MIX_PANEL_TOKEN
        if (token)
            mixpanel.init(token, {
                autocapture: true,
                record_sessions_percent: 100,
            })
    }, [])
    return <>
        {children}
    </>
}

export default MixPanel