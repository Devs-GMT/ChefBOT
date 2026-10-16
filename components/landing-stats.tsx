import { Counter } from "@/components/counter";
import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";

interface Stat {
  /** Rendered as a count-up when numeric. */
  value?: number;
  /** Static text for values that are not plain numbers (e.g. 10/20/30). */
  text?: string;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  {
    value: 3,
    label: "Recipes in every result — never four, never a wall of text",
  },
  {
    value: 8,
    suffix: "s",
    label: "Budget per request before House favourites take over",
  },
  {
    text: "10/20/30",
    label: "Minute cook-time filters, plus a vegetarian switch",
  },
  {
    value: 677,
    label: "BOT Chain network id, where every stamp is recorded",
  },
];

/**
 * DESIGN.md "Statistics Data Block": solid Alert Red panels with huge white
 * numbers top-left. The only chromatic color in the system lives here.
 */
export function LandingStats() {
  return (
    <section id="numbers" aria-labelledby="numbers-heading">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal effect="up">
          <SectionTag>Kitchen facts</SectionTag>
          <h2
            id="numbers-heading"
            className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-normal text-ink"
          >
            Cooking, by the numbers
          </h2>
        </Reveal>

        <dl className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, index) => (
            <Reveal
              key={stat.label}
              effect="up"
              delay={index * 120}
              className="flex flex-col justify-between bg-alert p-6"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <p
                  className={`leading-[0.84] font-bold tracking-normal text-white tabular-nums ${
                    stat.value !== undefined
                      ? "text-[clamp(3.5rem,7vw,7.5rem)]"
                      : "text-[clamp(2.25rem,4vw,3.5rem)]"
                  }`}
                >
                  {stat.value !== undefined ? (
                    <Counter
                      value={stat.value}
                      suffix={stat.suffix ?? ""}
                      suffixClassName="text-white"
                    />
                  ) : (
                    <span>{stat.text}</span>
                  )}
                </p>
                <p className="mt-4 max-w-[16rem] text-base leading-[1.4] tracking-[-0.02em] text-white">
                  {stat.label}
                </p>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}