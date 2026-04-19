import { defaultSchema, type Options } from "rehype-sanitize";

type Schema = Options;
type AttributeMap = NonNullable<Schema["attributes"]>;
type AttributeList = NonNullable<AttributeMap[string]>;

const baseAttributes: AttributeMap = defaultSchema.attributes ?? {};

const extendAttr = (tag: string, extras: AttributeList): AttributeList => [
  ...((baseAttributes[tag] ?? []) as AttributeList),
  ...extras
];

/**
 * Sanitization schema used by markdown renderers.
 *
 * Built on top of rehype-sanitize's GitHub-compatible `defaultSchema`, extended to
 * allow KaTeX (math) and rehype-highlight class names while still stripping
 * `<script>`, inline event handlers (e.g. `onerror`, `onclick`), `style` attributes,
 * and `javascript:` URLs injected via raw HTML in user-submitted markdown.
 */
const attributes: AttributeMap = {
  ...baseAttributes,
  "*": extendAttr("*", ["className"]),
  code: extendAttr("code", ["className"]),
  span: extendAttr("span", ["className"]),
  div: extendAttr("div", ["className"]),
  a: extendAttr("a", ["target", "rel", "className"])
};

const tagNames = Array.from(
  new Set([
    ...(defaultSchema.tagNames ?? []),
    // MathML tags produced by KaTeX
    "math",
    "annotation",
    "semantics",
    "mrow",
    "mo",
    "mi",
    "mn",
    "ms",
    "mtext",
    "msup",
    "msub",
    "msubsup",
    "mfrac",
    "msqrt",
    "mroot",
    "mtable",
    "mtr",
    "mtd",
    "mspace",
    "munder",
    "mover",
    "munderover"
  ])
);

export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes,
  tagNames,
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    href: ["http", "https", "mailto", "tel"],
    src: ["http", "https"]
  }
};