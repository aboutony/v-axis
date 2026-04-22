import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Download, Moon, Search, Sun } from "lucide-react";

type AssetStatus = "active" | "expiring-soon" | "expired";

type Asset = {
  id: string;
  type: string;
  registrationNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: AssetStatus;
  authority: string;
};

type Personnel = {
  id: string;
  name: string;
  position: string;
  department: string;
  iqamaNumber: string;
  iqamaExpiry: string;
  workPermitNumber: string;
  workPermitExpiry: string;
};

const subsidiaries = [
  "The Oil & Gas Company",
  "Advanced Manufacturing LLC",
  "Digital Infrastructure Holdings",
  "Energy Solutions International",
  "Technology Services Group",
];

const assetsBySubsidiary: Record<string, Asset[]> = {
  "The Oil & Gas Company": [
    {
      id: "1",
      type: "Commercial Registration",
      registrationNumber: "CR-2024-OG-45821",
      issuedDate: "2024-01-15",
      expiryDate: "2027-01-15",
      status: "active",
      authority: "Ministry of Commerce",
    },
    {
      id: "2",
      type: "ZATCA Certificate",
      registrationNumber: "ZT-2024-458219",
      issuedDate: "2024-02-01",
      expiryDate: "2026-05-20",
      status: "expiring-soon",
      authority: "Zakat, Tax and Customs Authority",
    },
    {
      id: "3",
      type: "SCE Operating License",
      registrationNumber: "SCE-OG-2024-1142",
      issuedDate: "2024-03-10",
      expiryDate: "2028-03-10",
      status: "active",
      authority: "Saudi Council of Engineers",
    },
  ],
  "Advanced Manufacturing LLC": [
    {
      id: "4",
      type: "Commercial Registration",
      registrationNumber: "CR-2023-AM-32145",
      issuedDate: "2023-06-20",
      expiryDate: "2026-06-20",
      status: "active",
      authority: "Ministry of Commerce",
    },
    {
      id: "5",
      type: "ZATCA Certificate",
      registrationNumber: "ZT-2023-321456",
      issuedDate: "2023-07-01",
      expiryDate: "2026-04-15",
      status: "expired",
      authority: "Zakat, Tax and Customs Authority",
    },
    {
      id: "6",
      type: "SCE Operating License",
      registrationNumber: "SCE-MF-2023-0892",
      issuedDate: "2023-08-15",
      expiryDate: "2027-08-15",
      status: "active",
      authority: "Saudi Council of Engineers",
    },
  ],
  "Digital Infrastructure Holdings": [
    {
      id: "7",
      type: "Cloud Operations License",
      registrationNumber: "CL-2024-DI-8801",
      issuedDate: "2024-04-01",
      expiryDate: "2027-04-01",
      status: "active",
      authority: "Communications, Space & Technology Commission",
    },
    {
      id: "8",
      type: "Cyber Insurance Certificate",
      registrationNumber: "CI-2024-DI-1022",
      issuedDate: "2024-03-14",
      expiryDate: "2026-07-10",
      status: "expiring-soon",
      authority: "Saudi Central Bank",
    },
  ],
  "Energy Solutions International": [
    {
      id: "9",
      type: "Energy Services Permit",
      registrationNumber: "EP-2024-ES-6651",
      issuedDate: "2024-02-18",
      expiryDate: "2026-11-01",
      status: "active",
      authority: "Ministry of Energy",
    },
  ],
  "Technology Services Group": [
    {
      id: "10",
      type: "Software Compliance Certificate",
      registrationNumber: "SC-2024-TS-1204",
      issuedDate: "2024-05-05",
      expiryDate: "2027-05-05",
      status: "active",
      authority: "Digital Government Authority",
    },
  ],
};

const personnelBySubsidiary: Record<string, Personnel[]> = {
  "The Oil & Gas Company": [
    {
      id: "1",
      name: "Ahmed Al-Rashid",
      position: "Operations Director",
      department: "Field Operations",
      iqamaNumber: "IQ-2458127634",
      iqamaExpiry: "2027-08-15",
      workPermitNumber: "WP-OG-2024-8821",
      workPermitExpiry: "2026-05-10",
    },
    {
      id: "2",
      name: "Mohammed Al-Zahrani",
      position: "Senior Engineer",
      department: "Technical Services",
      iqamaNumber: "IQ-2458234891",
      iqamaExpiry: "2028-02-20",
      workPermitNumber: "WP-OG-2024-8822",
      workPermitExpiry: "2027-12-15",
    },
    {
      id: "3",
      name: "Fatima Al-Otaibi",
      position: "Compliance Officer",
      department: "Legal & Compliance",
      iqamaNumber: "IQ-2458345123",
      iqamaExpiry: "2027-11-30",
      workPermitNumber: "WP-OG-2024-8823",
      workPermitExpiry: "2027-09-25",
    },
    {
      id: "4",
      name: "Khalid Al-Mutairi",
      position: "HSE Manager",
      department: "Health & Safety",
      iqamaNumber: "IQ-2458456234",
      iqamaExpiry: "2026-04-18",
      workPermitNumber: "WP-OG-2024-8824",
      workPermitExpiry: "2026-04-30",
    },
  ],
  "Advanced Manufacturing LLC": [
    {
      id: "5",
      name: "Hassan Al-Jaber",
      position: "Manufacturing Director",
      department: "Production",
      iqamaNumber: "IQ-2460123901",
      iqamaExpiry: "2028-01-10",
      workPermitNumber: "WP-AM-2024-1201",
      workPermitExpiry: "2027-11-20",
    },
    {
      id: "6",
      name: "Maha Al-Suwaidi",
      position: "Quality Manager",
      department: "Quality Assurance",
      iqamaNumber: "IQ-2460234012",
      iqamaExpiry: "2027-08-25",
      workPermitNumber: "WP-AM-2024-1202",
      workPermitExpiry: "2026-06-15",
    },
  ],
  "Digital Infrastructure Holdings": [
    {
      id: "7",
      name: "Nora Al-Qahtani",
      position: "Cybersecurity Lead",
      department: "Security Operations",
      iqamaNumber: "IQ-2460789567",
      iqamaExpiry: "2026-09-22",
      workPermitNumber: "WP-DI-2024-1207",
      workPermitExpiry: "2026-08-05",
    },
  ],
  "Energy Solutions International": [
    {
      id: "8",
      name: "Sara Al-Mansour",
      position: "Project Manager",
      department: "Project Development",
      iqamaNumber: "IQ-2458567345",
      iqamaExpiry: "2028-07-12",
      workPermitNumber: "WP-ES-2024-8825",
      workPermitExpiry: "2028-01-20",
    },
  ],
  "Technology Services Group": [
    {
      id: "9",
      name: "Youssef Al-Ghamdi",
      position: "IT Administrator",
      department: "Information Technology",
      iqamaNumber: "IQ-2459012890",
      iqamaExpiry: "2026-06-14",
      workPermitNumber: "WP-TS-2024-8830",
      workPermitExpiry: "2026-05-22",
    },
  ],
};

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCompactDate(value: string) {
  return new Date(value)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, ".");
}

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isSoon(value: string) {
  const remaining = daysUntil(value);
  return remaining <= 180 && remaining >= 0;
}

function exportReport() {
  const content = [
    "V-AXIS Intelligence Portal",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This static preview mirrors the approved Figma dashboard layout.",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "v-axis-preview-report.txt";
  link.click();

  URL.revokeObjectURL(url);
}

function SubsidiarySelector(props: {
  selected: string;
  onChange: (value: string) => void;
}) {
  const { selected, onChange } = props;

  return (
    <div
      className="rounded-[1.75rem] border border-white/40 bg-[rgba(248,250,252,0.72)] p-2 shadow-[var(--shadow-soft)] backdrop-blur"
      role="group"
      aria-label="Subsidiary selector"
    >
      <label className="sr-only" htmlFor="subsidiary-select">
        Active subsidiary
      </label>
      <select
        id="subsidiary-select"
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border-none bg-transparent px-5 py-4 text-base font-semibold text-primary outline-none"
        style={{ fontFamily: "var(--font-data)" }}
      >
        {subsidiaries.map((subsidiary) => (
          <option key={subsidiary} value={subsidiary}>
            {subsidiary}
          </option>
        ))}
      </select>
    </div>
  );
}

function EntityVault(props: { subsidiary: string; searchQuery: string }) {
  const assets = assetsBySubsidiary[props.subsidiary] ?? [];
  const filteredAssets = assets.filter((asset) => {
    const query = props.searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      asset.type.toLowerCase().includes(query) ||
      asset.registrationNumber.toLowerCase().includes(query) ||
      asset.authority.toLowerCase().includes(query)
    );
  });

  return (
    <section>
      <div className="mb-6">
        <h2
          className="text-[1.9rem] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Entity Vault
        </h2>
        <p
          className="mt-1 text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-data)" }}
        >
          Tactical Asset Laboratory
        </p>
      </div>

      <div className="space-y-5">
        {filteredAssets.map((asset) => {
          const statusColor =
            asset.status === "active"
              ? "#1E40AF"
              : asset.status === "expiring-soon"
                ? "#F43F5E"
                : "#64748B";

          return (
            <article
              key={asset.id}
              className="rounded-[2rem] border border-white/50 bg-[rgba(248,250,252,0.72)] p-6 shadow-[var(--shadow-recessed)] backdrop-blur transition-transform duration-300 hover:scale-[1.01]"
            >
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(16,185,129,0.06))] text-xl font-bold text-primary shadow-[inset_3px_3px_6px_rgba(16,185,129,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.5)]">
                    {asset.type.charAt(0)}
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {asset.type}
                    </h3>
                    <p
                      className="mt-1 text-sm text-muted-foreground"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {asset.authority}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                  style={{
                    background: statusColor,
                    boxShadow: `0 4px 12px ${statusColor}40`,
                    fontFamily: "var(--font-data)",
                  }}
                >
                  {asset.status.replace("-", " ")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard label="Registration No.">
                  {asset.registrationNumber}
                </InfoCard>
                <InfoCard label="Issued Date">
                  {formatLongDate(asset.issuedDate)}
                </InfoCard>
                <InfoCard
                  label="Expiry Date"
                  accent={asset.status !== "active"}
                >
                  {formatLongDate(asset.expiryDate)}
                </InfoCard>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WorkforcePortal(props: { subsidiary: string; searchQuery: string }) {
  const personnel = personnelBySubsidiary[props.subsidiary] ?? [];
  const filteredPersonnel = personnel.filter((person) => {
    const query = props.searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      person.name.toLowerCase().includes(query) ||
      person.position.toLowerCase().includes(query) ||
      person.department.toLowerCase().includes(query)
    );
  });

  return (
    <section>
      <div className="mb-6">
        <h2
          className="text-[1.9rem] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Workforce Asset Portal
        </h2>
        <p
          className="mt-1 text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-data)" }}
        >
          Operational Sync · {filteredPersonnel.length} Active Personnel
        </p>
      </div>

      <div className="space-y-4">
        {filteredPersonnel.map((person) => {
          const iqamaExpiringSoon = isSoon(person.iqamaExpiry);
          const permitExpiringSoon = isSoon(person.workPermitExpiry);
          const hasRisk = iqamaExpiringSoon || permitExpiringSoon;

          return (
            <article
              key={person.id}
              className="rounded-[1.75rem] border bg-[rgba(248,250,252,0.72)] p-5 shadow-[var(--shadow-elevated)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
              style={{
                borderColor: hasRisk ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.45)",
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))] text-lg font-bold text-primary shadow-[4px_4px_8px_rgba(209,217,230,0.4),-4px_-4px_8px_rgba(255,255,255,0.6)]">
                    {person.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3
                        className="truncate text-base font-semibold"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        {person.name}
                      </h3>
                      {hasRisk ? (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-destructive shadow-[0_0_12px_rgba(244,63,94,0.45)]" />
                      ) : null}
                    </div>

                    <p
                      className="mb-3 text-sm text-muted-foreground"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {person.position} · {person.department}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Iqama" accent={iqamaExpiringSoon}>
                        {person.iqamaNumber}
                        <span className="block font-mono text-[0.72rem] font-bold text-primary">
                          {formatCompactDate(person.iqamaExpiry)}
                        </span>
                      </InfoCard>
                      <InfoCard label="Work Permit" accent={permitExpiringSoon}>
                        {person.workPermitNumber}
                        <span className="block font-mono text-[0.72rem] font-bold text-primary">
                          {formatCompactDate(person.workPermitExpiry)}
                        </span>
                      </InfoCard>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InfoCard(props: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-[1rem] p-4"
      style={{
        background: props.accent ? "rgba(244, 63, 94, 0.08)" : "rgba(226, 232, 240, 0.35)",
        fontFamily: "var(--font-data)",
      }}
    >
      <div className="mb-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </div>
      <div className={props.accent ? "text-destructive" : "text-foreground"}>
        {props.children}
      </div>
    </div>
  );
}

export default function App() {
  const [selectedSubsidiary, setSelectedSubsidiary] = useState(subsidiaries[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const quickStats = useMemo(() => {
    const assets = assetsBySubsidiary[selectedSubsidiary] ?? [];
    const personnel = personnelBySubsidiary[selectedSubsidiary] ?? [];

    return [
      {
        label: "Entity Assets",
        value: String(assets.length).padStart(2, "0"),
      },
      {
        label: "Expiring Soon",
        value: String(
          assets.filter((asset) => asset.status === "expiring-soon").length +
            personnel.filter(
              (person) => isSoon(person.iqamaExpiry) || isSoon(person.workPermitExpiry),
            ).length,
        ).padStart(2, "0"),
      },
      {
        label: "Workforce Records",
        value: String(personnel.length).padStart(2, "0"),
      },
    ];
  }, [selectedSubsidiary]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen max-w-[1600px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-8 rounded-[2rem] border border-white/35 bg-[linear-gradient(135deg,rgba(248,250,252,0.78),rgba(226,232,240,0.46))] p-6 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1
                className="text-4xl tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                V-AXIS
              </h1>
              <p
                className="mt-2 text-sm uppercase tracking-[0.32em] text-primary"
                style={{ fontFamily: "var(--font-data)" }}
              >
                Administrative Intelligence
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <label
                className="flex min-w-[260px] items-center gap-3 rounded-[1.5rem] border border-white/40 bg-background/80 px-5 py-3 shadow-[var(--shadow-recessed)]"
                aria-label="Search entities or personnel"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search entities or personnel..."
                  className="w-full border-none bg-transparent text-sm outline-none"
                  style={{ fontFamily: "var(--font-data)" }}
                />
              </label>

              <button
                type="button"
                onClick={exportReport}
                className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-white/45 bg-background/80 px-5 py-3 text-sm font-medium shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.02]"
                style={{ fontFamily: "var(--font-data)" }}
              >
                <Download className="h-4 w-4 text-primary" />
                Export Report
              </button>

              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className="inline-flex items-center justify-center rounded-[1.5rem] border border-white/45 bg-background/80 p-3 shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.04]"
                aria-label={isDarkMode ? "Enable light mode" : "Enable dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-primary" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <SubsidiarySelector
              selected={selectedSubsidiary}
              onChange={setSelectedSubsidiary}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.5rem] border border-white/40 bg-background/80 px-5 py-4 text-center shadow-[var(--shadow-elevated)]"
                >
                  <div
                    className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
                    style={{ fontFamily: "var(--font-data)" }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="mt-2 text-2xl font-semibold text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="grid gap-8 xl:grid-cols-2">
          <EntityVault
            subsidiary={selectedSubsidiary}
            searchQuery={searchQuery}
          />
          <WorkforcePortal
            subsidiary={selectedSubsidiary}
            searchQuery={searchQuery}
          />
        </main>
      </div>
    </div>
  );
}
