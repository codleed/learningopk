"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";
import type { ComponentPropsWithoutRef } from "react";

import { markdownSanitizeSchema } from "@/lib/markdown-sanitize-schema";
import "@/styles/markdown.css";

type MarkdownRendererProps = {
  content: string;
  className?: string;
  components?: Partial<Components>;
};

type AnchorProps = ComponentPropsWithoutRef<"a">;
type CodeProps = ComponentPropsWithoutRef<"code">;
type PreProps = ComponentPropsWithoutRef<"pre">;
type TableProps = ComponentPropsWithoutRef<"table">;

function extractLanguage(className: string | undefined): string | undefined {
  if (!className) return undefined;
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : undefined;
}

function isBlockCode(className: string | undefined): boolean {
  return Boolean(className && /language-/.test(className));
}

const defaultComponents: Components = {
  a: ({ href, children, ...props }: AnchorProps) => {
    const isExternal = href?.startsWith("http");
    return (
      <a
        {...props}
        href={href}
        className="md-a"
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer noopener" : undefined}
      >
        {children}
      </a>
    );
  },

  code: ({ className, children, ...props }: CodeProps) => {
    const block = isBlockCode(className);
    if (block) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    );
  },

  pre: ({ className, children, ...props }: PreProps) => {
    const language = extractLanguage(className);
    return (
      <pre className="md-pre" data-language={language} {...props}>
        {children}
      </pre>
    );
  },

  table: ({ children, ...props }: TableProps) => {
    return (
      <div className="md-table-wrapper">
        <table className="md-table" {...props}>
          {children}
        </table>
      </div>
    );
  },

  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="md-h1" {...props}>
      {children}
    </h1>
  ),

  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="md-h2" {...props}>
      {children}
    </h2>
  ),

  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="md-h3" {...props}>
      {children}
    </h3>
  ),

  h4: ({ children, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="md-h4" {...props}>
      {children}
    </h4>
  ),

  h5: ({ children, ...props }: ComponentPropsWithoutRef<"h5">) => (
    <h5 className="md-h5" {...props}>
      {children}
    </h5>
  ),

  h6: ({ children, ...props }: ComponentPropsWithoutRef<"h6">) => (
    <h6 className="md-h6" {...props}>
      {children}
    </h6>
  ),

  p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p className="md-p" {...props}>
      {children}
    </p>
  ),

  strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong">) => (
    <strong className="md-strong" {...props}>
      {children}
    </strong>
  ),

  em: ({ children, ...props }: ComponentPropsWithoutRef<"em">) => (
    <em className="md-em" {...props}>
      {children}
    </em>
  ),

  del: ({ children, ...props }: ComponentPropsWithoutRef<"del">) => (
    <del className="md-del" {...props}>
      {children}
    </del>
  ),

  blockquote: ({ children, ...props }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="md-blockquote" {...props}>
      {children}
    </blockquote>
  ),

  ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul className="md-ul" {...props}>
      {children}
    </ul>
  ),

  ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol className="md-ol" {...props}>
      {children}
    </ol>
  ),

  li: ({ children, className, ...props }: ComponentPropsWithoutRef<"li">) => {
    const isTaskItem = className?.includes("task-list-item");
    return (
      <li className={isTaskItem ? "md-task-list-item md-li" : "md-li"} {...props}>
        {children}
      </li>
    );
  },

  hr: (props: ComponentPropsWithoutRef<"hr">) => <hr className="md-hr" {...props} />,

  img: ({ alt, ...props }: ComponentPropsWithoutRef<"img">) => (
    <img className="md-img" alt={alt} {...props} />
  ),

  thead: ({ children, ...props }: ComponentPropsWithoutRef<"thead">) => (
    <thead className="md-thead" {...props}>
      {children}
    </thead>
  ),

  tbody: ({ children, ...props }: ComponentPropsWithoutRef<"tbody">) => (
    <tbody {...props}>{children}</tbody>
  ),

  tr: ({ children, ...props }: ComponentPropsWithoutRef<"tr">) => (
    <tr className="md-tr" {...props}>
      {children}
    </tr>
  ),

  th: ({ children, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th className="md-th" {...props}>
      {children}
    </th>
  ),

  td: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td className="md-td" {...props}>
      {children}
    </td>
  ),

  input: (props: ComponentPropsWithoutRef<"input">) => {
    if (props.type === "checkbox") {
      return <input type="checkbox" className="md-task-checkbox" disabled readOnly {...props} />;
    }
    return <input {...props} />;
  },

  section: ({ children, ...props }: ComponentPropsWithoutRef<"section">) => (
    <section className="md-section" {...props}>
      {children}
    </section>
  ),

  sup: ({ children, ...props }: ComponentPropsWithoutRef<"sup">) => (
    <sup className="md-sup" {...props}>
      {children}
    </sup>
  ),
};

export function MarkdownRenderer({ content, className, components }: MarkdownRendererProps) {
  const mergedComponents: Components = {
    ...defaultComponents,
    ...components,
  };

  return (
    <div className={`md-root ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // rehype-sanitize MUST run after rehype-raw to strip scripts / event
        // handlers injected via raw HTML in user-controlled markdown (forum,
        // notes, AI responses). Without this, rehype-raw alone allows stored XSS.
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
