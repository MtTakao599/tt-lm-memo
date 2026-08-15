import type { HandoverFilter, MemoFilters } from '../types/filters'
import { EMPTY_FILTERS, isFiltersActive } from '../types/filters'

type FilterOptions = {
  buildings: string[]
  floors: string[]
  locations: string[]
  categories: string[]
  statuses: string[]
}

type MemoSearchProps = {
  filters: MemoFilters
  options: FilterOptions
  resultCount: number
  tabCount: number
  isOpen: boolean
  onToggle: () => void
  onChange: (filters: MemoFilters) => void
}

function FilterSelect({
  label,
  value,
  choices,
  onChange,
}: {
  label: string
  value: string
  choices: string[]
  onChange: (value: string) => void
}) {
  const id = `filter-${label}`
  return (
    <label className="field">
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">すべて</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </label>
  )
}

export function MemoSearch({
  filters,
  options,
  resultCount,
  tabCount,
  isOpen,
  onToggle,
  onChange,
}: MemoSearchProps) {
  const active = isFiltersActive(filters)

  function patch<K extends keyof MemoFilters>(key: K, value: MemoFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="memo-search">
      <div className="memo-search-bar">
        <label className="field memo-search-query">
          <span className="visually-hidden">メモを検索</span>
          <input
            type="search"
            value={filters.query}
            placeholder="メモを検索"
            onChange={(event) => patch('query', event.target.value)}
          />
        </label>
        <button
          type="button"
          className={isOpen ? 'btn btn-secondary is-pressed' : 'btn btn-secondary'}
          onClick={onToggle}
        >
          絞り込み
        </button>
      </div>

      {isOpen ? (
        <div className="memo-search-panel">
          <FilterSelect
            label="棟"
            value={filters.building}
            choices={options.buildings}
            onChange={(value) => patch('building', value)}
          />
          <FilterSelect
            label="階"
            value={filters.floor}
            choices={options.floors}
            onChange={(value) => patch('floor', value)}
          />
          <FilterSelect
            label="場所"
            value={filters.location}
            choices={options.locations}
            onChange={(value) => patch('location', value)}
          />
          <FilterSelect
            label="区分"
            value={filters.category}
            choices={options.categories}
            onChange={(value) => patch('category', value)}
          />
          <FilterSelect
            label="状態"
            value={filters.status}
            choices={options.statuses}
            onChange={(value) => patch('status', value)}
          />
          <label className="field">
            <span>引き継ぎ</span>
            <select
              value={filters.handover}
              onChange={(event) =>
                patch('handover', event.target.value as HandoverFilter)
              }
            >
              <option value="all">すべて</option>
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select>
          </label>
        </div>
      ) : null}

      {active ? (
        <div className="memo-search-summary">
          <p>
            絞り込み中
            <span className="memo-search-count">
              {resultCount}件 / {tabCount}件
            </span>
          </p>
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            条件をクリア
          </button>
        </div>
      ) : null}
    </section>
  )
}
