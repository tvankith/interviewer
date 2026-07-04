export const style = `
    :host {
      --text: #111827;
      --muted: #6b7280;
      --light: #9ca3af;
      --line: #e5e7eb;
      --pill-bg: #f3f4f6;
      --pill-border: #e5e7eb;
      --tech-bg: #fafafa;
      --tech-border: #ececec;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      font-variant-ligatures: none;
    }

    body {
      background: #fff;
      color: var(--text);
      font-family:
        "Inter",
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }

    #resume {
      max-width: 820px;
      margin: 0 auto;
      padding: 26px 34px 28px;
    }

    header {
      margin-bottom: 14px;
    }

    h1 {
      font-size: 30px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 6px;
    }

    .contact {
      font-size: 11.7px;
      color: var(--muted);
      line-height: 1.45;
    }

    .contact a {
      color: inherit;
      text-decoration: none;
    }

    section {
      margin-top: 15px;
    }

    h2 {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.6px;
      color: #4b5563;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 8px;
    }

    .summary,
    .description,
    p,
    li,
    span {
      font-size: 12.1px;
      line-height: 1.48;
    }

    .summary {
      color: #1f2937;
    }

    .item,
    .sub-item {
      margin-bottom: 11px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
    }

    .left {
      flex: 1;
      min-width: 0;
    }

    .duration {
      min-width: 135px;
      text-align: right;
      white-space: nowrap;
      font-size: 11.2px;
      color: var(--muted);
      font-weight: 600;
    }

    .role,
    .title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
    }

    .company {
      margin-top: 1px;
      font-size: 11.8px;
      color: var(--muted);
      font-weight: 600;
    }

    .description {
      margin-top: 4px;
      color: #1f2937;
    }

    .description ul,
    .summary ul {
      list-style: none;
      padding-left: 0;
      margin-top: 4px;
    }

    .description li,
    .summary li {
      position: relative;
      padding-left: 11px;
      margin-bottom: 2px;
    }

    .description li::before,
    .summary li::before {
      content: "–";
      position: absolute;
      left: 0;
      top: 0;
      color: #374151;
      font-weight: 700;
    }

    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .skill-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 9px;
      border: 1px solid var(--pill-border);
      background: var(--pill-bg);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      color: #374151;
      white-space: nowrap;
    }

    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 5px;
    }

    .tech-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border: 1px solid var(--tech-border);
      background: var(--tech-bg);
      border-radius: 999px;
      font-size: 10.4px;
      font-weight: 600;
      line-height: 1;
      color: #6b7280;
      white-space: nowrap;
    }

    @media print {
      #resume {
        padding: 0;
        max-width: none;
      }

      section,
      .item,
      .sub-item {
        page-break-inside: avoid;
      }

      .skill-pill,
      .tech-pill {
        background: transparent;
      }
    }
`