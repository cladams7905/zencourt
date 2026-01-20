export function Stats() {
  const stats = [
    { value: "15h+", label: "Saved Weekly" },
    { value: "300%", label: "Engagement Growth" },
    { value: "50k+", label: "Assets Generated" },
    { value: "24/7", label: "Automated Posting" }
  ];

  return (
    <section className="py-16 bg-primary text-primary-foreground border-y border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
          {stats.map((stat, index) => (
            <div key={index} className="px-4">
              <div className="text-4xl md:text-5xl font-header font-bold mb-2 text-secondary">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-primary-foreground/70 font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
