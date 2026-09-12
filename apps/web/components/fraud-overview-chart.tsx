import Link from "next/link";
import type { AdminOverview } from "../lib/api";

interface FraudOverviewChartProps {
  fraud: AdminOverview["fraud"];
  total: number;
}

function percentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function FraudOverviewChart({
  fraud,
  total,
}: FraudOverviewChartProps) {
  const riskTotal = fraud.risk.low + fraud.risk.medium + fraud.risk.high;
  const decisionTotal =
    fraud.decisions.approve + fraud.decisions.verify + fraud.decisions.hold;
  const risks = [
    { label: "Low risk", value: fraud.risk.low, color: "#0b8a68" },
    { label: "Medium risk", value: fraud.risk.medium, color: "#f2a900" },
    { label: "High risk", value: fraud.risk.high, color: "#dc5b5b" },
  ];
  const lowEnd = percentage(fraud.risk.low, riskTotal);
  const mediumEnd = lowEnd + percentage(fraud.risk.medium, riskTotal);
  const chartBackground = riskTotal
    ? `conic-gradient(#0b8a68 0% ${lowEnd}%, #f2a900 ${lowEnd}% ${mediumEnd}%, #dc5b5b ${mediumEnd}% 100%)`
    : "#e6eeeb";
  const decisions = [
    {
      label: "Approved",
      detail: "Cleared automatically",
      value: fraud.decisions.approve,
      color: "bg-[#0b8a68]",
    },
    {
      label: "Verification",
      detail: "Customer confirmation needed",
      value: fraud.decisions.verify,
      color: "bg-[#f2a900]",
    },
    {
      label: "Held",
      detail: "Sent for staff review",
      value: fraud.decisions.hold,
      color: "bg-[#dc5b5b]",
    },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-[22px] border border-[#dce5e1] bg-white shadow-[0_18px_40px_-34px_rgba(13,56,45,.55)] sm:rounded-3xl">
      <div className="flex flex-col gap-3 border-b border-[#e5ece9] px-4 py-5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087a5b]">
            Fraud monitoring
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#18352e]">
            Fraud case overview
          </h3>
          <p className="mt-1 text-xs text-[#7a8a85]">
            Risk levels and decisions across every assessed transaction.
          </p>
        </div>
        <Link
          href="/admin/fraud"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#cbd8d3] px-4 text-xs font-bold text-[#087a5b] transition hover:border-[#087a5b] hover:bg-[#f4f8f6]"
        >
          View fraud cases
        </Link>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <div>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div
              role="img"
              aria-label={`${fraud.risk.low} low, ${fraud.risk.medium} medium, and ${fraud.risk.high} high-risk assessments`}
              className="grid h-44 w-44 shrink-0 place-items-center rounded-full"
              style={{ background: chartBackground }}
            >
              <div className="grid h-[108px] w-[108px] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_#edf2f0]">
                <span>
                  <strong className="block text-2xl font-bold tracking-tight text-[#18352e]">
                    {total.toLocaleString()}
                  </strong>
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#86958f]">
                    Assessed
                  </span>
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {risks.map((risk) => (
                <div
                  key={risk.label}
                  className="flex items-center rounded-2xl bg-[#f7f9f8] px-4 py-3"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: risk.color }}
                  />
                  <span className="ml-3 text-xs font-semibold text-[#587069]">
                    {risk.label}
                  </span>
                  <span className="ml-auto text-sm font-bold text-[#18352e]">
                    {risk.value.toLocaleString()}
                  </span>
                  <span className="ml-2 w-10 text-right text-[10px] font-semibold text-[#91a09b]">
                    {percentage(risk.value, riskTotal).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[#e5ece9] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#28483f]">
                Assessment decisions
              </p>
              <p className="mt-1 text-xs text-[#84938e]">
                Outcome from the fraud rules engine
              </p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-700">
              {fraud.risk.high.toLocaleString()} high risk
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {decisions.map((decision) => {
              const width = percentage(decision.value, decisionTotal);
              return (
                <div key={decision.label}>
                  <div className="flex items-end justify-between gap-4">
                    <span>
                      <span className="block text-xs font-bold text-[#39574f]">
                        {decision.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[#8a9894]">
                        {decision.detail}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-[#18352e]">
                      {decision.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#edf2f0]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${decision.color}`}
                      style={{ width: `${decision.value > 0 ? Math.max(2, width) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
