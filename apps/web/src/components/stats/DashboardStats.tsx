// apps/web/src/components/stats/DashboardStats.tsx

export const DashboardStats = ({
  documentsCount,
}: {
  documentsCount: number;
}) => {
  const stats = [
    {
      label: "TRADE LICENSES",
      val: documentsCount > 0 ? "01" : "00",
      color: "text-emerald-500",
    },
    { label: "MUQEEM (IQAMA)", val: "01", color: "text-slate-900" },
    { label: "GOSI RECORDS", val: "01", color: "text-slate-900" },
    { label: "INSURANCE", val: "00", color: "text-rose-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm min-w-[280px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-default group"
        >
          <p className="text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase mb-6 group-hover:text-emerald-500 transition-colors">
            {stat.label}
          </p>
          <p
            className={`text-6xl font-black ${stat.color} transition-transform duration-500 group-hover:scale-110 origin-left`}
          >
            {stat.val}
          </p>
        </div>
      ))}
    </div>
  );
};
