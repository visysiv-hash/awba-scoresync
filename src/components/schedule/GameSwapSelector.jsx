export default function GameSwapSelector({ game, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs no-print">
      <span className="font-semibold">Swap for:</span>
      {[1, 2, 3].map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={game === value}
          onClick={() => onChange(value)}
          className={`rounded-full border border-border px-3 py-1 font-semibold ${
            game === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          Game {value}
        </button>
      ))}
      <span>Choose two players from any groups below.</span>
    </div>
  );
}