"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import Handlebars from "handlebars";
import DOMPurify from "isomorphic-dompurify";
import { mapProfileToResume, Profile } from "../helpers/map-profile-to-resume";
import { style } from "./style";

export default function ResumePreview(props: {
  profile?: Profile;
  template: string;
  iframeClassName?: string;
}) {
  const shadowHostRef = useRef<HTMLDivElement>(null);

  const data = useMemo(
    () => mapProfileToResume(props?.profile || {}),
    [props.profile]
  );

  useLayoutEffect(() => {
      try {
        const compiled = Handlebars.compile(props.template);
        let result = compiled(data);

        const sanitized = DOMPurify.sanitize(result, {
          ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'html', 'section'
          ],
          ALLOWED_ATTR: ['href', 'class', 'id', 'style'],
        });

        if (shadowHostRef.current) {
          if (!shadowHostRef.current.shadowRoot) {
            shadowHostRef.current.attachShadow({ mode: "open" });
          }

          const shadow = shadowHostRef.current.shadowRoot!;

          // ✅ Clear previous content (important)
          shadow.innerHTML = "";

          // ✅ 1. Preconnect (optional but good)
          const pre1 = document.createElement("link");
          pre1.rel = "preconnect";
          pre1.href = "https://fonts.googleapis.com";

          const pre2 = document.createElement("link");
          pre2.rel = "preconnect";
          pre2.href = "https://fonts.gstatic.com";
          pre2.crossOrigin = "true";

          // ✅ 2. Font stylesheet
          const fontLink = document.createElement("link");
          fontLink.rel = "stylesheet";
          fontLink.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";

          // ✅ 3. Style (IMPORTANT: use :host, not body)
          const styleTag = document.createElement("style");
          styleTag.textContent = `

          ${style}
        `;

          // ✅ 4. Content container
          const container = document.createElement("div");
          container.innerHTML = sanitized;

          // ✅ Append in correct order
          shadow.append(pre1, pre2, fontLink, styleTag, container);
        }
      } catch (error) {
        console.error("Template compile error:", error);
      }

  }, [props.template, data]);

  return (
    <div className="flex-1 flex flex-col w-full">
      <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          ref={shadowHostRef}
          className={`w-full`}
        />
      </div>
    </div>
  );
}