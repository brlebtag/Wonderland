type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
};

/** Seleção múltipla com "chips" clicáveis. */
export function ChipSelect({ options, value, onChange }: Props) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip ${value.includes(o.value) ? 'on' : ''}`}
          aria-pressed={value.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
