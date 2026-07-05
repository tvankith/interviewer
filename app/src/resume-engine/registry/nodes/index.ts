// Side-effecting imports: each module calls registerNodeType() at module
// scope. Importing this file once (from render/resume-canvas.tsx and
// render/render-static-html.ts) is enough to populate the node registry.
import "./page-node";
import "./row-node";
import "./column-node";
import "./stack-node";
import "./spacer-node";
import "./divider-node";
import "./section-node";
import "./text-node";
import "./rich-text-node";
import "./list-node";
import "./image-node";
