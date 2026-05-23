"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Input } from "@/components/ui/Input";
import { TextureBackground } from "@/components/ui/TextureBackground";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookingsEmptyArt } from "@/components/ui/empty-art/BookingsEmptyArt";
import { PortfolioEmptyArt } from "@/components/ui/empty-art/PortfolioEmptyArt";
import { MessagesEmptyArt } from "@/components/ui/empty-art/MessagesEmptyArt";
import {
  Calendar,
  DollarSign,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

const noop = (): void => {};

export const dynamic = "force-dynamic";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-6">
      <Heading variant="h3" className="text-ink-700">
        {title}
      </Heading>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-8">
      <div className="w-32 shrink-0 pt-2 text-xs font-sans text-ink-500">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}

export default function DesignPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-16">
        <header className="space-y-3">
          <Heading variant="display">PoroBook design system</Heading>
          <p className="font-sans text-base text-ink-500 max-w-prose">
            Primitive components rendered for visual review. Tokens come from
            <code className="px-1 text-ink-700">lib/design-tokens.ts</code>.
          </p>
        </header>

        <Section title="Headings">
          <div className="space-y-4">
            <Heading variant="display">Display heading</Heading>
            <Heading variant="h1">Heading one</Heading>
            <Heading variant="h2">Heading two</Heading>
            <Heading variant="h3">Heading three</Heading>
            <Heading variant="h4">Heading four</Heading>
          </div>
        </Section>

        <Section title="Type pairing">
          <div className="space-y-10 max-w-prose">
            <div className="space-y-3">
              <Heading variant="display">Book your next chapter</Heading>
              <p className="font-sans text-lg text-ink-700 leading-relaxed">
                Inter at the lg step sits below the Playfair display heading.
                The serif holds the editorial weight while the body breathes
                underneath. Use this pairing for hero moments only.
              </p>
            </div>

            <div className="space-y-2">
              <Heading variant="h1">Today, calmly</Heading>
              <p className="font-sans text-base text-ink-700 leading-relaxed">
                Standard page-title pairing. Display serif for the page name,
                Inter at the base step for any descriptive body. Most dashboard
                pages should look like this.
              </p>
            </div>

            <div className="space-y-2">
              <Heading variant="h2">Section heading</Heading>
              <p className="font-sans text-base text-ink-700 leading-relaxed">
                Use h2 to break a long page into sections. The body remains at
                the base step so the rhythm stays steady down the page.
              </p>
            </div>

            <div className="space-y-1.5">
              <Heading variant="h3">Subsection</Heading>
              <p className="font-sans text-sm text-ink-500 leading-relaxed">
                h3 pairs with the sm step in ink-500 for supporting copy.
                Useful inside cards and dense regions.
              </p>
            </div>

            <div className="space-y-1">
              <Heading variant="h4">Group label</Heading>
              <p className="font-sans text-sm text-ink-500 leading-relaxed">
                The smallest heading variant. Pair with sm body for compact
                groups inside settings, lists, or inline forms.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Buttons">
          <Row label="Primary">
            <Button variant="primary" size="sm">Book now</Button>
            <Button variant="primary" size="md">Book now</Button>
            <Button variant="primary" size="lg">Book now</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Row>
          <Row label="Secondary">
            <Button variant="secondary" size="sm">Save draft</Button>
            <Button variant="secondary" size="md">Save draft</Button>
            <Button variant="secondary" size="lg">Save draft</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </Row>
          <Row label="Ghost">
            <Button variant="ghost" size="sm">Cancel</Button>
            <Button variant="ghost" size="md">Cancel</Button>
            <Button variant="ghost" size="lg">Cancel</Button>
            <Button variant="ghost" disabled>Disabled</Button>
          </Row>
          <Row label="Hover state">
            <Button
              variant="primary"
              className="bg-rust-600 border-rust-600 -translate-y-px"
            >
              Primary hover
            </Button>
            <Button
              variant="secondary"
              className="border-ink-900 -translate-y-px"
            >
              Secondary hover
            </Button>
            <Button
              variant="ghost"
              className="bg-cream-100 -translate-y-px"
            >
              Ghost hover
            </Button>
          </Row>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card padding="md">
              <p className="font-sans text-sm text-ink-700">
                Default card with medium padding. 1px border, no shadow.
              </p>
            </Card>
            <Card padding="lg" hoverLift>
              <p className="font-sans text-sm text-ink-700">
                Hover lift card. Mouse over to see the 1px lift and border
                darken to ink-300.
              </p>
            </Card>
            <Card padding="sm">
              <p className="font-sans text-sm text-ink-700">
                Small padding variant.
              </p>
            </Card>
          </div>

          <Row label="Lift state">
            <Card padding="md" className="w-64">
              <p className="font-sans text-xs text-ink-500 mb-1">At rest</p>
              <p className="font-sans text-sm text-ink-700">
                Default appearance.
              </p>
            </Card>
            <Card
              padding="md"
              className="w-64 border-ink-300 -translate-y-px"
            >
              <p className="font-sans text-xs text-ink-500 mb-1">Hovered</p>
              <p className="font-sans text-sm text-ink-700">
                Lift and border darken (forced).
              </p>
            </Card>
          </Row>
        </Section>

        <Section title="Inputs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            <Input label="Full name" placeholder="Ava Williams" />
            <Input
              label="Email"
              placeholder="you@example.com"
              helper="We send appointment reminders here."
            />
            <Input
              label="Phone"
              placeholder="(555) 123 4567"
              helper="Optional"
            />
            <Input label="Disabled" placeholder="Cannot edit" disabled />
            <Input placeholder="No label" />
          </div>

          <div className="max-w-md">
            <p className="text-xs font-sans text-ink-500 mb-2 uppercase tracking-wide">
              Error state
            </p>
            <Input
              label="Promo code"
              defaultValue="SUMMER25"
              error="This code has expired. Try a current one."
            />
          </div>
        </Section>

        <Section title="Badges">
          <Row label="All variants">
            <Badge variant="verified">Verified</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="status">Confirmed</Badge>
          </Row>
        </Section>

        <Section title="Avatars">
          <Row label="Sizes">
            <Avatar name="Ava Williams" size="sm" />
            <Avatar name="Maya Johnson" size="md" />
            <Avatar name="Imani Brooks" size="lg" />
            <Avatar name="Zora Henderson" size="xl" />
          </Row>
          <Row label="With ring">
            <Avatar name="Ava Williams" size="sm" ring />
            <Avatar name="Maya Johnson" size="md" ring />
            <Avatar name="Imani Brooks" size="lg" ring />
            <Avatar name="Zora Henderson" size="xl" ring />
          </Row>
          <Row label="With image">
            <Avatar
              name="Ava Williams"
              size="lg"
              src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces&auto=format"
            />
            <Avatar
              name="Maya Johnson"
              size="lg"
              ring
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&auto=format"
            />
            <Avatar
              name="Imani Brooks"
              size="xl"
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces&auto=format"
            />
            <Avatar
              name="Zora Henderson"
              size="xl"
              ring
              src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces&auto=format"
            />
          </Row>
          <Row label="Broken src">
            <Avatar
              name="Ava Williams"
              size="lg"
              src="/brand/this-file-does-not-exist.jpg"
            />
            <Avatar
              name="Maya Johnson"
              size="xl"
              ring
              src="/brand/also-missing.jpg"
            />
          </Row>
        </Section>

        <Section title="Texture backgrounds">
          <div className="space-y-3">
            <p className="text-xs font-sans uppercase tracking-wide text-ink-500">
              All four variants at intensity subtle
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(["paper", "linen", "marble", "rust"] as const).map((variant) => (
                <TextureBackground
                  key={variant}
                  variant={variant}
                  intensity="subtle"
                  className="h-56 rounded-md border border-ink-200"
                >
                  <div className="h-full p-6 flex flex-col justify-between">
                    <Heading
                      variant="h3"
                      className={variant === "rust" ? "text-cream-50" : undefined}
                    >
                      {variant.charAt(0).toUpperCase() + variant.slice(1)}
                    </Heading>
                    <p
                      className={cn(
                        "text-xs font-sans uppercase tracking-wide",
                        variant === "rust" ? "text-cream-50/80" : "text-ink-500",
                      )}
                    >
                      subtle
                    </p>
                  </div>
                </TextureBackground>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-sans uppercase tracking-wide text-ink-500">
              Paper at all three intensities
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["subtle", "medium", "strong"] as const).map((intensity) => (
                <TextureBackground
                  key={intensity}
                  variant="paper"
                  intensity={intensity}
                  className="h-56 rounded-md border border-ink-200"
                >
                  <div className="h-full p-6 flex flex-col justify-between">
                    <Heading variant="h3">Editorial</Heading>
                    <p className="text-xs font-sans uppercase tracking-wide text-ink-500">
                      paper / {intensity}
                    </p>
                  </div>
                </TextureBackground>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Empty states — icon variant (default)">
          <p className="font-sans text-sm text-ink-500 max-w-prose">
            The original centered-icon-circle layout. Best for primary
            empty states where the action is the focus.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                customArt={<BookingsEmptyArt className="text-rust-500" />}
                title="Your schedule is clear"
                description="Share your booking link to start filling slots."
                action={{ label: "Share booking link", onClick: noop }}
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                icon={Users}
                title="No clients yet"
                description="Clients you book will appear here automatically."
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                customArt={<PortfolioEmptyArt className="text-rust-500" />}
                title="Your portfolio is empty"
                description="Upload work to attract more bookings."
                action={{ label: "Upload first photo", onClick: noop }}
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                customArt={<MessagesEmptyArt className="text-rust-500" />}
                title="No messages"
                description="Conversations with clients will appear here."
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                icon={DollarSign}
                title="No revenue this month yet"
                description="Earnings show up here as bookings complete."
              />
            </div>
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                icon={Heart}
                title="No favorites yet"
                description="Save providers you love by tapping the heart."
              />
            </div>
          </div>
        </Section>

        <Section title="Empty states — typographic & asymmetric variants">
          <p className="font-sans text-sm text-ink-500 max-w-prose">
            Editorial alternatives. <strong>Typographic</strong> uses a
            large faint Playfair display number/glyph as a watermark;
            title overlaps the bottom of it. <strong>Asymmetric</strong>
            left-aligns the content with a faint cream-200 icon rotated
            12° on the right.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="typographic"
                display="00"
                icon={Calendar}
                title="Your schedule is clear"
                description="Share your booking link to start filling slots."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="asymmetric"
                icon={Users}
                title="No clients yet"
                description="Clients you book will appear here automatically."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="typographic"
                display="01"
                icon={ImageIcon}
                title="Your portfolio is empty"
                description="Upload work to attract more bookings."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="asymmetric"
                icon={MessageCircle}
                title="No messages"
                description="Conversations with clients will appear here."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="typographic"
                display="$0"
                icon={DollarSign}
                title="No revenue this month yet"
                description="Earnings show up here as bookings complete."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-cream-50">
              <EmptyState
                variant="asymmetric"
                icon={Heart}
                title="No favorites yet"
                description="Save providers you love by tapping the heart."
              />
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
