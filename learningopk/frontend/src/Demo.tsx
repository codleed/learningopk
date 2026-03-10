"use client";

import { motion } from "framer-motion";
import { ThemeProvider } from "@/design-system/theme/ThemeProvider";
import { useTheme } from "@/design-system/hooks/useTheme";
import { ThemeToggle } from "@/design-system/components/ThemeToggle";
import { H1, H2, H3, H4, Body, Label, Caption, Mono } from "@/design-system/components/Typography";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, type PastelAccent } from "@/design-system/components/Card";
import { Button, type ButtonVariant, type ButtonSize } from "@/design-system/components/Button";
import { Input, Textarea } from "@/design-system/components/Input";
import { Badge, type BadgeVariant } from "@/design-system/components/Badge";

const pastelAccents: PastelAccent[] = ["dustyRose", "sage", "slateBlue", "warmSand", "lavender", "peach"];
const buttonVariants: ButtonVariant[] = ["primary", "secondary", "ghost"];
const buttonSizes: ButtonSize[] = ["sm", "md", "lg"];
const badgeVariants: BadgeVariant[] = ["neutral", "dustyRose", "sage", "slateBlue", "warmSand", "lavender", "peach"];

function DemoContent() {
  const { mode } = useTheme();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: mode === "light" 
          ? `radial-gradient(at 0% 0%, rgba(196, 165, 212, 0.15) 0px, transparent 50%), 
             radial-gradient(at 100% 0%, rgba(165, 196, 165, 0.15) 0px, transparent 50%), 
             radial-gradient(at 100% 100%, rgba(212, 196, 165, 0.15) 0px, transparent 50%), 
             radial-gradient(at 0% 100%, rgba(212, 165, 165, 0.15) 0px, transparent 50%)`
          : `radial-gradient(at 0% 0%, rgba(196, 165, 212, 0.1) 0px, transparent 50%), 
             radial-gradient(at 100% 0%, rgba(165, 196, 165, 0.1) 0px, transparent 50%), 
             radial-gradient(at 100% 100%, rgba(212, 196, 165, 0.1) 0px, transparent 50%), 
             radial-gradient(at 0% 100%, rgba(212, 165, 165, 0.1) 0px, transparent 50%)`,
        color: "var(--foreground)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ padding: "var(--space-8)", maxWidth: "1200px", margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-8)" }}>
            <H1>Design System Demo</H1>
            <ThemeToggle />
          </div>

          <Body style={{ color: "var(--muted-foreground)", marginBottom: "var(--space-8)" }}>
            Current theme: {mode}
          </Body>

          <section style={{ marginBottom: "var(--space-12)" }}>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Typography</H2>
            <Card style={{ maxWidth: "800px" }}>
              <CardContent>
                <div style={{ display: "grid", gap: "var(--space-4)" }}>
                  <H1>Heading 1 - DM Serif Display</H1>
                  <H2>Heading 2 - DM Serif Display</H2>
                  <H3>Heading 3 - DM Serif Display</H3>
                  <H4>Heading 4 - DM Serif Display</H4>
                  <Body>
                    Body text - Source Serif 4. This is a paragraph demonstrating the humanist serif font
                    used for body text content. The typography system provides excellent readability
                    with proper line height and spacing.
                  </Body>
                  <div>
                    <Label>Form Label</Label>
                  </div>
                  <Caption>Caption text - smaller muted text for captions and helper text</Caption>
                  <div>
                    <Mono>Monospace text - for code snippets</Mono>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section style={{ marginBottom: "var(--space-12)" }}>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Buttons</H2>
            
            <div style={{ marginBottom: "var(--space-6)" }}>
              <H4 style={{ marginBottom: "var(--space-3)" }}>Variants</H4>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                {buttonVariants.map((variant) => (
                  <Button key={variant} variant={variant}>
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <H4 style={{ marginBottom: "var(--space-3)" }}>Sizes</H4>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                {buttonSizes.map((size) => (
                  <Button key={size} size={size}>
                    {size.toUpperCase()} Button
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <section style={{ marginBottom: "var(--space-12)" }}>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Cards with Glassmorphism</H2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "var(--space-4)" }}>
              {pastelAccents.map((accent) => (
                <Card key={accent} pastelAccent={accent}>
                  <CardTitle style={{ textTransform: "capitalize" }}>{accent}</CardTitle>
                  <CardContent>
                    <Caption>Card with {accent} glassmorphism</Caption>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: "var(--space-12)" }}>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Inputs</H2>
            <Card style={{ maxWidth: "500px" }}>
              <CardContent>
                <div style={{ display: "grid", gap: "var(--space-4)" }}>
                  <div>
                    <Label style={{ marginBottom: "var(--space-2)", display: "block" }}>Default Input</Label>
                    <Input placeholder="Enter text..." />
                  </div>
                  <div>
                    <Label style={{ marginBottom: "var(--space-2)", display: "block" }}>With Value</Label>
                    <Input defaultValue="Hello World" />
                  </div>
                  <div>
                    <Label style={{ marginBottom: "var(--space-2)", display: "block" }}>Error State</Label>
                    <Input placeholder="Invalid input..." error />
                  </div>
                  <div>
                    <Label style={{ marginBottom: "var(--space-2)", display: "block" }}>Disabled</Label>
                    <Input placeholder="Disabled input..." disabled />
                  </div>
                  <div>
                    <Label style={{ marginBottom: "var(--space-2)", display: "block" }}>Textarea</Label>
                    <Textarea placeholder="Multi-line text..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section style={{ marginBottom: "var(--space-12)" }}>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Badges</H2>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {badgeVariants.map((variant) => (
                <Badge key={variant} variant={variant} style={{ textTransform: "capitalize" }}>
                  {variant}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <H2 style={{ marginBottom: "var(--space-4)" }}>Combined Example</H2>
            <Card pastelAccent="sage" style={{ maxWidth: "500px" }}>
              <CardHeader>
                <CardTitle>Complete Card Component</CardTitle>
              </CardHeader>
              <CardContent>
                <Body>
                  This demonstrates a complete card with all the design system components
                  working together with glassmorphism effects and 12px rounded corners.
                </Body>
                <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)" }}>
                  <Badge variant="sage">Active</Badge>
                  <Badge variant="slateBlue">Verified</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" size="sm">Cancel</Button>
                <Button size="sm">Confirm</Button>
              </CardFooter>
            </Card>
          </section>
        </motion.div>
      </div>
    </div>
  );
}

export default function Demo() {
  return (
    <ThemeProvider>
      <DemoContent />
    </ThemeProvider>
  );
}
